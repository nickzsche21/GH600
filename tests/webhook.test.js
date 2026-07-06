import test from "node:test";
import assert from "node:assert/strict";
import { POST as paddleWebhook } from "../api/webhooks/paddle.js";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
process.env.PADDLE_WEBHOOK_SECRET = "whsec_test";
process.env.PADDLE_PRICE_FOUNDING = "pri_founding_test";

async function signHex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function webhookRequest(rawBody, signatureHeader) {
  return new Request("https://gh600.test/api/webhooks/paddle", {
    method: "POST",
    headers: { "content-type": "application/json", ...(signatureHeader ? { "paddle-signature": signatureHeader } : {}) },
    body: rawBody
  });
}

test("webhook with a bad HMAC signature is rejected without touching storage", async () => {
  let dbHit = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { dbHit = true; return Response.json([]); };
  try {
    const ts = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_1" } });
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=deadbeef`));
    assert.equal(response.status, 401);
    assert.equal(dbHit, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("webhook with a stale timestamp is rejected as a possible replay", async () => {
  const ts = Math.floor(Date.now() / 1000) - 3600;
  const rawBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_1" } });
  const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
  const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
  assert.equal(response.status, 401);
});

test("the widened replay window tolerates a 60s-old signature but still rejects a 10-minute-old one", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([]);
  try {
    const rawBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_tolerance" } });
    const recentTs = Math.floor(Date.now() / 1000) - 60;
    const recentH1 = await signHex("whsec_test", `${recentTs}:${rawBody}`);
    const recent = await paddleWebhook(webhookRequest(rawBody, `ts=${recentTs};h1=${recentH1}`));
    assert.equal(recent.status, 200);

    const staleTs = Math.floor(Date.now() / 1000) - 600;
    const staleH1 = await signHex("whsec_test", `${staleTs}:${rawBody}`);
    const stale = await paddleWebhook(webhookRequest(rawBody, `ts=${staleTs};h1=${staleH1}`));
    assert.equal(stale.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolves the buyer email from the Paddle customer API when custom_data.email is absent", async () => {
  process.env.PADDLE_API_KEY = "test-paddle-api-key";
  const originalFetch = globalThis.fetch;
  let customerLookupCalled = false;
  globalThis.fetch = async (url, options) => {
    const urlString = url.toString();
    if (urlString.includes("api.sandbox.paddle.com/customers/") || urlString.includes("api.paddle.com/customers/")) {
      customerLookupCalled = true;
      return Response.json({ data: { email: "Resolved@Example.com" } });
    }
    const path = new URL(url).pathname;
    if (path.endsWith("/purchases")) return Response.json(options.method === "GET" ? [] : [{ id: "purchase-2", email: "resolved@example.com" }], { status: options.method === "GET" ? 200 : 201 });
    if (path.endsWith("/entitlements")) return Response.json(options.method === "GET" ? [] : [{ id: "ent-2", email: "resolved@example.com", plan: "founding_access" }], { status: options.method === "GET" ? 200 : 201 });
    if (path.endsWith("/analytics_events")) return Response.json([{ id: "evt-2" }], { status: 201 });
    return Response.json([]);
  };
  try {
    const ts = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({
      event_type: "transaction.completed",
      data: { id: "txn_customer_lookup", customer_id: "ctm_123", items: [{ price: { id: "pri_founding_test" } }] }
    });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(response.status, 200);
    assert.equal(customerLookupCalled, true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.PADDLE_API_KEY;
  }
});

function refundFetchMock({ purchase, revokeCalls }) {
  return async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/purchases")) return Response.json([purchase]);
    if (path.endsWith("/entitlements") && options.method === "GET") return Response.json([{ id: "ent-refund", source_purchase_id: purchase.id }]);
    if (path.endsWith("/entitlements") && options.method === "PATCH") { revokeCalls.push("entitlements"); return Response.json([{ id: "ent-refund", active: false }]); }
    if (path.endsWith("/access_sessions") && options.method === "PATCH") { revokeCalls.push("access_sessions"); return Response.json([]); }
    if (path.endsWith("/analytics_events")) return Response.json([{ id: "evt-3" }], { status: 201 });
    return Response.json([]);
  };
}

test("adjustment.created for a non-refund action does not revoke access", async () => {
  const originalFetch = globalThis.fetch;
  const revokeCalls = [];
  const purchase = { id: "purchase-3", email: "buyer@example.com", plan: "founding_access", amount: 29 };
  globalThis.fetch = refundFetchMock({ purchase, revokeCalls });
  try {
    const ts = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({ event_type: "adjustment.created", data: { transaction_id: "txn_adj_1", action: "credit", totals: { total: "2900" } } });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(response.status, 200);
    assert.equal(revokeCalls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adjustment.created for a partial refund does not revoke access", async () => {
  const originalFetch = globalThis.fetch;
  const revokeCalls = [];
  const purchase = { id: "purchase-4", email: "buyer@example.com", plan: "founding_access", amount: 29 };
  globalThis.fetch = refundFetchMock({ purchase, revokeCalls });
  try {
    const ts = Math.floor(Date.now() / 1000);
    // 100 minor units = $1.00, far less than the $29 purchase total.
    const rawBody = JSON.stringify({ event_type: "adjustment.created", data: { transaction_id: "txn_adj_2", action: "refund", totals: { total: "100" } } });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(response.status, 200);
    assert.equal(revokeCalls.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adjustment.created for a full refund does revoke access", async () => {
  const originalFetch = globalThis.fetch;
  const revokeCalls = [];
  const purchase = { id: "purchase-5", email: "buyer@example.com", plan: "founding_access", amount: 29 };
  globalThis.fetch = refundFetchMock({ purchase, revokeCalls });
  try {
    const ts = Math.floor(Date.now() / 1000);
    // 2900 minor units = $29.00, matching the full purchase total.
    const rawBody = JSON.stringify({ event_type: "adjustment.created", data: { transaction_id: "txn_adj_3", action: "refund", totals: { total: "2900" } } });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(response.status, 200);
    assert.deepEqual(revokeCalls, ["entitlements", "access_sessions"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("transaction.refunded always fully revokes access regardless of amount fields", async () => {
  const originalFetch = globalThis.fetch;
  const revokeCalls = [];
  const purchase = { id: "purchase-6", email: "buyer@example.com", plan: "founding_access", amount: 29 };
  globalThis.fetch = refundFetchMock({ purchase, revokeCalls });
  try {
    const ts = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({ event_type: "transaction.refunded", data: { id: "txn_adj_4" } });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const response = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(response.status, 200);
    assert.deepEqual(revokeCalls, ["entitlements", "access_sessions"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a known-good signature grants entitlement idempotently on repeat delivery", async () => {
  const originalFetch = globalThis.fetch;
  let purchaseInsertCount = 0;
  let entitlementInsertCount = 0;
  let existingPurchase = null;
  let existingEntitlement = null;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/purchases") && options.method === "GET") return Response.json(existingPurchase ? [existingPurchase] : []);
    if (path.endsWith("/purchases") && options.method === "POST") {
      purchaseInsertCount++;
      existingPurchase = { id: "purchase-1", email: "buyer@example.com" };
      return Response.json([existingPurchase], { status: 201 });
    }
    if (path.endsWith("/entitlements") && options.method === "GET") return Response.json(existingEntitlement ? [existingEntitlement] : []);
    if (path.endsWith("/entitlements") && options.method === "POST") {
      entitlementInsertCount++;
      existingEntitlement = { id: "ent-1", email: "buyer@example.com", plan: "founding_access" };
      return Response.json([existingEntitlement], { status: 201 });
    }
    if (path.endsWith("/analytics_events")) return Response.json([{ id: "evt-1" }], { status: 201 });
    return Response.json([]);
  };
  try {
    const ts = Math.floor(Date.now() / 1000);
    const rawBody = JSON.stringify({
      event_type: "transaction.completed",
      data: { id: "txn_repeat_1", items: [{ price: { id: "pri_founding_test" } }], custom_data: { email: "buyer@example.com" } }
    });
    const h1 = await signHex("whsec_test", `${ts}:${rawBody}`);
    const first = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(first.status, 200);
    const second = await paddleWebhook(webhookRequest(rawBody, `ts=${ts};h1=${h1}`));
    assert.equal(second.status, 200);
    assert.equal(purchaseInsertCount, 1);
    assert.equal(entitlementInsertCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

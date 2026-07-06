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

import test from "node:test";
import assert from "node:assert/strict";
import { POST as checkout } from "../api/checkout-intent.js";
import { POST as verifyAccess } from "../api/access/verify.js";
import { POST as createLead } from "../api/lead.js";
import { POST as diagnosticComplete } from "../api/diagnostic/complete.js";
import { POST as adminGrant } from "../api/admin/grant.js";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
process.env.ENTITLEMENT_SIGNING_SECRET = "test-signing-secret";

function request(path, body, headers = {}) {
  return new Request(`https://gh600.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

function pathOf(url) {
  return new URL(url).pathname;
}

test("checkout ignores client pricing, resolves the plan's provider, and returns a checkout link", async () => {
  const originalFetch = globalThis.fetch;
  process.env.RAZORPAY_FOUNDING_URL = "https://rzp.io/rzp/founding";
  let inserted;
  globalThis.fetch = async (_url, options) => {
    inserted = JSON.parse(options.body);
    return Response.json([{ id: "intent-1" }], { status: 201 });
  };
  try {
    const response = await checkout(request("/api/checkout-intent", { email: "buyer@example.com", plan: "founder", amount: 1 }));
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(inserted.amount, 29);
    assert.equal(inserted.provider, "paddle");
    assert.equal(body.provider, "paddle");
    assert.equal(body.redirect_url, "https://rzp.io/rzp/founding");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("team plan checkout has no card redirect and is flagged for manual follow-up", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => Response.json([{ id: "intent-2", ...JSON.parse(options.body) }], { status: 201 });
  try {
    const response = await checkout(request("/api/checkout-intent", { email: "buyer@example.com", plan: "team" }));
    const body = await response.json();
    assert.equal(body.provider, "wise");
    assert.equal(body.manual_followup, true);
    assert.equal(body.redirect_url, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("access gate redeems the code atomically and mints a session token", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = pathOf(url);
    calls.push(path);
    if (path.endsWith("/rpc/redeem_access_code")) return Response.json([{ plan: "founding_access", email: "buyer@example.com" }]);
    if (path.endsWith("/entitlements") && options.method === "GET") return Response.json([]);
    if (path.endsWith("/entitlements")) return Response.json([{ id: "ent-1", email: "buyer@example.com", plan: "founding_access" }], { status: 201 });
    if (path.endsWith("/access_sessions")) return Response.json([{ id: "sess-1" }], { status: 201 });
    return Response.json([], { status: 201 });
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "GH600-TEST" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.plan, "founding_access");
    assert.match(body.token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    assert.ok(calls.some(path => path.endsWith("/rpc/redeem_access_code")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("access gate rejects an exhausted/invalid code and registers the failed attempt", async () => {
  const originalFetch = globalThis.fetch;
  let registeredFailure = false;
  let registeredEmail;
  globalThis.fetch = async (url, options) => {
    const path = pathOf(url);
    if (path.endsWith("/rpc/redeem_access_code")) return Response.json([]);
    if (path.endsWith("/rpc/register_failed_code")) {
      registeredFailure = true;
      registeredEmail = JSON.parse(options.body).p_email;
      return Response.json([]);
    }
    return Response.json([]);
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "MAXED-OUT" }));
    assert.equal(response.status, 401);
    assert.equal(registeredFailure, true);
    assert.equal(registeredEmail, "buyer@example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("re-login with the same code+email reissues a session without burning a use or duplicating the entitlement", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const path = pathOf(url);
    calls.push({ path, method: options.method });
    if (path.endsWith("/entitlements") && options.method === "GET") {
      return Response.json([{ id: "ent-existing", email: "buyer@example.com", plan: "founding_access" }]);
    }
    if (path.endsWith("/access_sessions") && options.method === "POST") return Response.json([{ id: "sess-again" }], { status: 201 });
    return Response.json([]);
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "GH600-REPEAT" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.plan, "founding_access");
    assert.ok(body.token);
    assert.equal(calls.some(c => c.path.endsWith("/rpc/redeem_access_code")), false);
    assert.equal(calls.some(c => c.path.endsWith("/entitlements") && c.method === "POST"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an access code seeded with a plan alias normalizes before granting", async () => {
  const originalFetch = globalThis.fetch;
  let insertedEntitlement;
  globalThis.fetch = async (url, options) => {
    const path = pathOf(url);
    if (path.endsWith("/rpc/redeem_access_code")) return Response.json([{ plan: "founder", email: "buyer@example.com" }]);
    if (path.endsWith("/entitlements") && options.method === "GET") return Response.json([]);
    if (path.endsWith("/entitlements") && options.method === "POST") {
      insertedEntitlement = JSON.parse(options.body);
      return Response.json([{ id: "ent-alias", email: "buyer@example.com", plan: insertedEntitlement.plan }], { status: 201 });
    }
    if (path.endsWith("/access_sessions")) return Response.json([{ id: "sess-alias" }], { status: 201 });
    return Response.json([]);
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "ALIAS-CODE" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.plan, "founding_access");
    assert.equal(insertedEntitlement.plan, "founding_access");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an access code with an unresolvable plan value is rejected instead of granting an empty-tier entitlement", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const path = pathOf(url);
    if (path.endsWith("/rpc/redeem_access_code")) return Response.json([{ plan: "not-a-real-plan", email: "buyer@example.com" }]);
    if (path.endsWith("/entitlements")) return Response.json([]);
    return Response.json([]);
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "BOGUS-PLAN" }));
    assert.equal(response.status, 422);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid lead email is rejected before storage", async () => {
  const response = await createLead(request("/api/lead", { email: "not-an-email", source: "test" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

test("diagnostic/complete rejects an update whose session_id does not own the attempt", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([], { status: 200 });
  try {
    const response = await diagnosticComplete(request("/api/diagnostic/complete", {
      session_id: "session-a",
      attempt_id: "attempt-1",
      score: 10,
      total_questions: 12
    }));
    assert.equal(response.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin grant rejects requests with a missing or wrong bearer token", async () => {
  process.env.ADMIN_API_TOKEN = "correct-token";
  const missing = await adminGrant(request("/api/admin/grant", { email: "buyer@example.com", plan: "team", source: "wise", reference: "wise-1" }));
  assert.equal(missing.status, 401);
  const wrong = await adminGrant(request("/api/admin/grant", { email: "buyer@example.com", plan: "team", source: "wise", reference: "wise-1" }, { authorization: "Bearer wrong-token" }));
  assert.equal(wrong.status, 401);
});

test("admin grant issues a token for a valid bearer token", async () => {
  process.env.ADMIN_API_TOKEN = "correct-token";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = pathOf(url);
    if (path.endsWith("/entitlements") && options.method === "GET") return Response.json([]);
    if (path.endsWith("/entitlements")) return Response.json([{ id: "ent-2", email: "buyer@example.com", plan: "team_pack" }], { status: 201 });
    if (path.endsWith("/access_sessions")) return Response.json([{ id: "sess-2" }], { status: 201 });
    return Response.json([], { status: 201 });
  };
  try {
    const response = await adminGrant(request("/api/admin/grant", {
      email: "buyer@example.com", plan: "team", source: "wise", reference: "wise-invoice-1"
    }, { authorization: "Bearer correct-token" }));
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.ok, true);
    assert.ok(body.token);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

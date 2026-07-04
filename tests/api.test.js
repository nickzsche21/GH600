import test from "node:test";
import assert from "node:assert/strict";
import { POST as checkout } from "../api/checkout-intent.js";
import { POST as verifyAccess } from "../api/access/verify.js";
import { POST as createLead } from "../api/lead.js";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";

function request(path, body) {
  return new Request(`https://gh600.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("checkout ignores client pricing and returns configured payment link", async () => {
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
    assert.equal(body.redirect_url, "https://rzp.io/rzp/founding");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("access gate validates email and increments code use", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push(options.method);
    if (options.method === "GET") return Response.json([{ id: "code-1", email: "buyer@example.com", plan: "founding_access", active: true, uses: 2, max_uses: 25 }]);
    return Response.json([{ id: "code-1", uses: 3 }]);
  };
  try {
    const response = await verifyAccess(request("/api/access/verify", { email: "buyer@example.com", code: "GH600-TEST" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.deepEqual(calls, ["GET", "PATCH"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("invalid lead email is rejected before storage", async () => {
  const response = await createLead(request("/api/lead", { email: "not-an-email", source: "test" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

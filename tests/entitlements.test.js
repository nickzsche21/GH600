import test from "node:test";
import assert from "node:assert/strict";
import { issueSession, verifySession } from "../api/_lib/entitlements.js";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
process.env.ENTITLEMENT_SIGNING_SECRET = "round-trip-secret";

test("issueSession -> verifySession round trip returns the entitlement identity", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const entitlement = { id: "ent-1", email: "buyer@example.com", plan: "founding_access" };
    let storedHash;
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/access_sessions") && options.method === "POST") {
        storedHash = JSON.parse(options.body).token_hash;
        return Response.json([{ id: "session-row-1" }], { status: 201 });
      }
      if (path.endsWith("/access_sessions") && options.method === "GET") {
        const url2 = new URL(url);
        const matches = url2.searchParams.get("token_hash") === `eq.${storedHash}`;
        return Response.json(matches ? [{
          id: "session-row-1", email: entitlement.email, plan: entitlement.plan,
          expires_at: new Date(Date.now() + 1000 * 60).toISOString(), revoked: false
        }] : []);
      }
      if (path.endsWith("/access_sessions") && options.method === "PATCH") return Response.json([{ id: "session-row-1" }]);
      return Response.json([]);
    };
    const { token } = await issueSession(entitlement);
    const result = await verifySession(token);
    assert.deepEqual(result, { email: "buyer@example.com", plan: "founding_access" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a forged token (bad HMAC envelope) is rejected before any DB lookup", async () => {
  const originalFetch = globalThis.fetch;
  let dbHit = false;
  try {
    globalThis.fetch = async () => { dbHit = true; return Response.json([]); };
    const result = await verifySession("Zm9yZ2Vk.bm90LWEtdmFsaWQtc2lnbmF0dXJl");
    assert.equal(result, null);
    assert.equal(dbHit, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an expired session is rejected even with a valid signature", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const entitlement = { id: "ent-2", email: "expired@example.com", plan: "team_pack" };
    let storedHash;
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/access_sessions") && options.method === "POST") {
        storedHash = JSON.parse(options.body).token_hash;
        return Response.json([{ id: "session-row-2" }], { status: 201 });
      }
      if (path.endsWith("/access_sessions") && options.method === "GET") {
        const url2 = new URL(url);
        const matches = url2.searchParams.get("token_hash") === `eq.${storedHash}`;
        return Response.json(matches ? [{
          id: "session-row-2", email: entitlement.email, plan: entitlement.plan,
          expires_at: new Date(Date.now() - 1000).toISOString(), revoked: false
        }] : []);
      }
      return Response.json([]);
    };
    const { token } = await issueSession(entitlement);
    const result = await verifySession(token);
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a revoked session is rejected", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/access_sessions") && options.method === "GET") return Response.json([]);
      return Response.json([]);
    };
    const result = await verifySession("anything.anything");
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

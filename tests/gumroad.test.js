import test from "node:test";
import assert from "node:assert/strict";
import { verifyGumroadLicense } from "../api/_lib/gumroad.js";

process.env.GUMROAD_ACCESS_TOKEN = "gumroad-test-token";
process.env.GUMROAD_PRODUCT_FOUNDING = "prod_founding";
process.env.GUMROAD_PRODUCT_PRO = "prod_pro";

function withFetch(handler, run) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => { globalThis.fetch = originalFetch; });
}

test("a valid license maps the verified Gumroad product back to its plan", () => withFetch(
  async (url, options) => {
    const body = new URLSearchParams(options.body);
    if (body.get("product_id") === "prod_founding") {
      return Response.json({ success: false });
    }
    if (body.get("product_id") === "prod_pro") {
      return Response.json({ success: true, purchase: { email: "buyer@example.com" } });
    }
    return Response.json({ success: false });
  },
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.deepEqual(result, { plan: "pro", email: "buyer@example.com" });
  }
));

test("a refunded purchase is rejected even though the license itself verifies", () => withFetch(
  async () => Response.json({ success: true, purchase: { email: "buyer@example.com", refunded: true } }),
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.equal(result, null);
  }
));

test("a disputed/chargebacked purchase is rejected", () => withFetch(
  async () => Response.json({ success: true, purchase: { email: "buyer@example.com", chargebacked: true } }),
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.equal(result, null);
  }
));

test("a license bound to a different buyer email is rejected", () => withFetch(
  async () => Response.json({ success: true, purchase: { email: "someone-else@example.com" } }),
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.equal(result, null);
  }
));

test("fails closed on a network error instead of throwing", () => withFetch(
  async () => { throw new Error("network down"); },
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.equal(result, null);
  }
));

test("fails closed on a malformed JSON response", () => withFetch(
  async () => new Response("not json", { status: 200 }),
  async () => {
    const result = await verifyGumroadLicense("buyer@example.com", "AAAA-BBBB-CCCC-DDDD");
    assert.equal(result, null);
  }
));

test("returns null without ever calling out when no license key is supplied", async () => {
  let called = false;
  await withFetch(
    async () => { called = true; return Response.json({ success: false }); },
    async () => {
      const result = await verifyGumroadLicense("buyer@example.com", "");
      assert.equal(result, null);
    }
  );
  assert.equal(called, false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { checkoutUrl, resolvePlan } from "../api/_lib/plans.js";
import { normalizeEmail } from "../api/_lib/http.js";

test("server owns plan pricing", () => {
  assert.equal(resolvePlan("founder").amount, 29);
  assert.equal(resolvePlan("team").amount, 149);
  assert.equal(resolvePlan("cram").amount, 99);
  assert.equal(resolvePlan("unknown"), null);
});

test("checkout URL only accepts https", () => {
  process.env.RAZORPAY_FOUNDING_URL = "javascript:alert(1)";
  assert.equal(checkoutUrl(resolvePlan("founder")), null);
  process.env.RAZORPAY_FOUNDING_URL = "https://rzp.io/rzp/test";
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://rzp.io/rzp/test");
});

test("email normalization is stable", () => {
  assert.equal(normalizeEmail("  Buyer@Example.COM "), "buyer@example.com");
});

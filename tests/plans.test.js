import test from "node:test";
import assert from "node:assert/strict";
import { checkoutUrl, contentTiers, allowedMocks, resolvePlan, resolvePlanByPriceId, resolvePlanByGumroadProduct } from "../api/_lib/plans.js";
import { normalizeEmail } from "../api/_lib/http.js";

test("server owns plan pricing", () => {
  assert.equal(resolvePlan("founder").amount, 29);
  assert.equal(resolvePlan("team").amount, 149);
  assert.equal(resolvePlan("cram").amount, 99);
  assert.equal(resolvePlan("pro").amount, 49);
  assert.equal(resolvePlan("unknown"), null);
});

test("every plan resolves to a payment provider", () => {
  assert.equal(resolvePlan("founder").provider, "gumroad");
  assert.equal(resolvePlan("team").provider, "wise");
  assert.equal(resolvePlan("cram").provider, "wise");
  assert.equal(resolvePlan("pro").provider, "gumroad");
});

test("content tiers gate the premium bank v2 by plan", () => {
  assert.deepEqual(contentTiers("founding_access"), ["free_diagnostic", "founder"]);
  assert.deepEqual(contentTiers("pro"), ["free_diagnostic", "founder", "pro"]);
  assert.deepEqual(contentTiers("team_pack"), ["free_diagnostic", "founder", "pro"]);
  assert.deepEqual(contentTiers("cram_call"), []);
  assert.deepEqual(contentTiers(undefined), []);
});

test("allowed mocks match the sold tier structure (3 vs 6 + drills)", () => {
  assert.deepEqual(allowedMocks("founding_access"), ["MOCK_1", "MOCK_2", "MOCK_3"]);
  assert.deepEqual(allowedMocks("pro"), ["MOCK_1", "MOCK_2", "MOCK_3", "MOCK_4", "MOCK_5", "MOCK_6", "DRILL"]);
  assert.deepEqual(allowedMocks("team_pack"), allowedMocks("pro"));
});

test("checkout URL only accepts https, preferring the Paddle env over the legacy one", () => {
  delete process.env.GUMROAD_CHECKOUT_FOUNDING;
  delete process.env.PADDLE_CHECKOUT_FOUNDING;
  process.env.RAZORPAY_FOUNDING_URL = "javascript:alert(1)";
  assert.equal(checkoutUrl(resolvePlan("founder")), null);
  process.env.RAZORPAY_FOUNDING_URL = "https://rzp.io/rzp/test";
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://rzp.io/rzp/test");
  process.env.PADDLE_CHECKOUT_FOUNDING = "https://gh600.paddle.io/checkout/founding";
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://gh600.paddle.io/checkout/founding");
  process.env.PADDLE_CHECKOUT_FOUNDING = "javascript:alert(1)";
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://rzp.io/rzp/test");
});

test("checkout URL prefers the Gumroad env over both the Paddle and legacy fallbacks", () => {
  process.env.PADDLE_CHECKOUT_FOUNDING = "https://gh600.paddle.io/checkout/founding";
  process.env.RAZORPAY_FOUNDING_URL = "https://rzp.io/rzp/test";
  process.env.GUMROAD_CHECKOUT_FOUNDING = "https://gh600.gumroad.com/l/founding";
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://gh600.gumroad.com/l/founding");
  delete process.env.GUMROAD_CHECKOUT_FOUNDING;
  assert.equal(checkoutUrl(resolvePlan("founder")), "https://gh600.paddle.io/checkout/founding");
});

test("wise-only plans never resolve a card checkout redirect", () => {
  process.env.RAZORPAY_TEAM_URL = "https://rzp.io/rzp/team";
  assert.equal(checkoutUrl(resolvePlan("team")), "https://rzp.io/rzp/team");
  delete process.env.RAZORPAY_TEAM_URL;
  assert.equal(checkoutUrl(resolvePlan("team")), null);
});

test("Paddle price id maps back to the correct plan", () => {
  process.env.PADDLE_PRICE_FOUNDING = "pri_founding_123";
  assert.equal(resolvePlanByPriceId("pri_founding_123").id, "founding_access");
  assert.equal(resolvePlanByPriceId("pri_unknown"), null);
});

test("Gumroad product id maps back to the correct plan", () => {
  process.env.GUMROAD_PRODUCT_FOUNDING = "prod_founding_123";
  process.env.GUMROAD_PRODUCT_PRO = "prod_pro_123";
  assert.equal(resolvePlanByGumroadProduct("prod_founding_123").id, "founding_access");
  assert.equal(resolvePlanByGumroadProduct("prod_pro_123").id, "pro");
  assert.equal(resolvePlanByGumroadProduct("prod_unknown"), null);
});

test("email normalization is stable", () => {
  assert.equal(normalizeEmail("  Buyer@Example.COM "), "buyer@example.com");
});

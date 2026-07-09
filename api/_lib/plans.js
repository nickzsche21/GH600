const founder = {
  id: "founding_access",
  label: "Founding Access",
  amount: 29,
  currency: "USD",
  provider: "gumroad",
  checkoutEnv: "GUMROAD_CHECKOUT_FOUNDING",
  paddleCheckoutEnv: "PADDLE_CHECKOUT_FOUNDING",
  priceEnv: "PADDLE_PRICE_FOUNDING",
  legacyEnv: "RAZORPAY_FOUNDING_URL",
  productEnv: "GUMROAD_PRODUCT_FOUNDING"
};
const team = {
  id: "team_pack",
  label: "Team Pack",
  amount: 149,
  currency: "USD",
  provider: "wise",
  checkoutEnv: null,
  priceEnv: null,
  legacyEnv: "RAZORPAY_TEAM_URL"
};
const cram = {
  id: "cram_call",
  label: "Urgent Cram Call",
  amount: 99,
  currency: "USD",
  provider: "wise",
  checkoutEnv: null,
  priceEnv: null,
  legacyEnv: "RAZORPAY_CRAM_URL"
};
const pro = {
  id: "pro",
  label: "Pro",
  amount: 49,
  currency: "USD",
  provider: "gumroad",
  checkoutEnv: "GUMROAD_CHECKOUT_PRO",
  paddleCheckoutEnv: "PADDLE_CHECKOUT_PRO",
  priceEnv: "PADDLE_PRICE_PRO",
  legacyEnv: null,
  productEnv: "GUMROAD_PRODUCT_PRO"
};

const plans = {
  founder, founding_access: founder,
  team, team_pack: team,
  cram, cram_call: cram,
  pro
};

export function resolvePlan(value) {
  return plans[String(value || "").toLowerCase()] || null;
}

export function resolvePlanByPriceId(priceId) {
  return Object.values(plans).find(plan => plan.priceEnv && process.env[plan.priceEnv] === priceId) || null;
}

export function resolvePlanByGumroadProduct(productId) {
  return Object.values(plans).find(plan => plan.productEnv && process.env[plan.productEnv] === productId) || null;
}

// Unique plans (de-duped across id aliases) that have a Gumroad product configured.
export function gumroadPlans() {
  const seen = new Set();
  return Object.values(plans).filter(plan => {
    if (!plan.productEnv || seen.has(plan.id)) return false;
    seen.add(plan.id);
    return true;
  });
}

function readHttpsUrl(envName) {
  if (!envName) return null;
  const value = process.env[envName]?.trim();
  return value && /^https:\/\//i.test(value) ? value : null;
}

export function checkoutUrl(plan) {
  return readHttpsUrl(plan.checkoutEnv) || readHttpsUrl(plan.paddleCheckoutEnv) || readHttpsUrl(plan.legacyEnv);
}

// Premium bank v2 (`gh600_scenarios_v2`) content tiers, widest first — a plan
// may only ever be served rows whose `plan_required` appears in its list.
// Free tier (no entitlement) has no v2 rows; it stays on the inline app.js bank.
export function contentTiers(planId) {
  switch (planId) {
    case "pro":
    case "team_pack": return ["free_diagnostic", "founder", "pro"]; // 300 · MOCK_1-6 + drills
    case "founding_access": return ["free_diagnostic", "founder"]; // 120 · MOCK_1-3
    default: return [];
  }
}

// Which `mock_id` values a plan may request from /api/scenarios/next.
export function allowedMocks(planId) {
  switch (planId) {
    case "pro":
    case "team_pack": return ["MOCK_1", "MOCK_2", "MOCK_3", "MOCK_4", "MOCK_5", "MOCK_6", "DRILL"];
    case "founding_access": return ["MOCK_1", "MOCK_2", "MOCK_3"];
    default: return [];
  }
}

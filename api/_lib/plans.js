const plans = {
  founder: { id: "founding_access", label: "Founding Access", amount: 29, currency: "USD", env: "RAZORPAY_FOUNDING_URL" },
  founding_access: { id: "founding_access", label: "Founding Access", amount: 29, currency: "USD", env: "RAZORPAY_FOUNDING_URL" },
  team: { id: "team_pack", label: "Team Pack", amount: 149, currency: "USD", env: "RAZORPAY_TEAM_URL" },
  team_pack: { id: "team_pack", label: "Team Pack", amount: 149, currency: "USD", env: "RAZORPAY_TEAM_URL" },
  cram: { id: "cram_call", label: "Urgent Cram Call", amount: 99, currency: "USD", env: "RAZORPAY_CRAM_URL" },
  cram_call: { id: "cram_call", label: "Urgent Cram Call", amount: 99, currency: "USD", env: "RAZORPAY_CRAM_URL" }
};

export function resolvePlan(value) {
  return plans[String(value || "").toLowerCase()] || null;
}

export function checkoutUrl(plan) {
  const value = process.env[plan.env]?.trim();
  return value && /^https:\/\//i.test(value) ? value : null;
}

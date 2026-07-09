import { normalizeEmail } from "./http.js";
import { gumroadPlans } from "./plans.js";

const VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

// Verifies a license key against every plan with a configured Gumroad
// product, in order. Fails closed (returns null) on any network/JSON
// error or a disqualifying purchase state — never throws past the caller.
export async function verifyGumroadLicense(email, licenseKey) {
  const accessToken = process.env.GUMROAD_ACCESS_TOKEN;
  if (!accessToken || !licenseKey) return null;

  for (const plan of gumroadPlans()) {
    const productId = process.env[plan.productEnv]?.trim();
    if (!productId) continue;

    let data;
    try {
      const response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: accessToken,
          product_id: productId,
          license_key: licenseKey,
          increment_uses_count: "false"
        })
      });
      if (!response.ok) continue;
      data = await response.json();
    } catch (error) {
      console.error(`Gumroad license verify request failed for plan ${plan.id}:`, error);
      continue;
    }

    if (!data?.success) continue;

    const purchase = data.purchase || {};
    if (purchase.refunded || purchase.chargebacked || purchase.disputed) return null;
    if (purchase.email && normalizeEmail(purchase.email) !== normalizeEmail(email)) return null;

    return { plan: plan.id, email };
  }

  return null;
}

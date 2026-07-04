import { handleError, HttpError, json, readJson, requireEmail, safeMetadata, text } from "./_lib/http.js";
import { insert } from "./_lib/supabase.js";
import { checkoutUrl, resolvePlan } from "./_lib/plans.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const plan = resolvePlan(body.plan);
    if (!plan) throw new HttpError(400, "Unknown plan");
    const redirectUrl = checkoutUrl(plan);
    const [intent] = await insert("payment_intents", {
      email,
      plan: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      provider: "razorpay",
      provider_link: redirectUrl,
      status: redirectUrl ? "redirect_ready" : "manual_followup",
      source_page: text(body.source_page, 300) || null,
      metadata: safeMetadata(body.metadata)
    });
    return json({ ok: true, intent_id: intent.id, plan: plan.id, amount: plan.amount, currency: plan.currency, redirect_url: redirectUrl, manual_followup: !redirectUrl }, 201);
  } catch (error) {
    return handleError(error);
  }
}

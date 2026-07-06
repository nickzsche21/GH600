import { handleError, HttpError, json, readJson, requireEmail, safeMetadata, text } from "./_lib/http.js";
import { insert } from "./_lib/supabase.js";
import { resolvePlan } from "./_lib/plans.js";
import { createCheckout } from "./_lib/providers.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const plan = resolvePlan(body.plan);
    if (!plan) throw new HttpError(400, "Unknown plan");
    const checkout = createCheckout(plan);
    const [intent] = await insert("payment_intents", {
      email,
      plan: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      provider: plan.provider,
      provider_link: checkout.redirectUrl || null,
      status: checkout.redirectUrl ? "redirect_ready" : "manual_followup",
      source_page: text(body.source_page, 300) || null,
      metadata: safeMetadata(body.metadata)
    });
    return json({
      ok: true,
      intent_id: intent.id,
      plan: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      provider: plan.provider,
      redirect_url: checkout.redirectUrl || null,
      manual_followup: Boolean(checkout.manual)
    }, 201);
  } catch (error) {
    return handleError(error);
  }
}

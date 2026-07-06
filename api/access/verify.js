import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { findActiveEntitlement, grantEntitlement, issueSession, redeemAccessCode, registerFailedCode } from "../_lib/entitlements.js";
import { resolvePlan } from "../_lib/plans.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const code = text(body.code, 100).toUpperCase();
    if (!code) throw new HttpError(400, "Access code is required");

    // Per-buyer reference: a shared max_uses>1 code still creates one
    // entitlement per email, and a returning buyer (cleared storage, expired
    // 30-day session) gets a fresh token here without burning another use.
    const reference = `code:${code}:${email}`;
    const existingEntitlement = await findActiveEntitlement({ email, reference });
    if (existingEntitlement) {
      const session = await issueSession(existingEntitlement);
      return json({ ok: true, plan: existingEntitlement.plan, token: session.token, expires_at: session.expires_at });
    }

    const redeemed = await redeemAccessCode(code, email);
    if (!redeemed) {
      await registerFailedCode(code, email);
      return json({ ok: false, error: "That email/code pair is not active" }, 401);
    }
    const plan = resolvePlan(redeemed.plan);
    if (!plan) throw new HttpError(422, "Unknown plan on access code");

    const entitlement = await grantEntitlement({
      email,
      plan: plan.id,
      source: "manual",
      granted_by: `code:${code}`,
      reference
    });
    const session = await issueSession(entitlement);
    return json({ ok: true, plan: plan.id, token: session.token, expires_at: session.expires_at });
  } catch (error) {
    return handleError(error);
  }
}

// Consolidated access endpoints. One Vercel function serves
// /api/access/verify and /api/access/session (dispatched on the last path
// segment) to stay under the Hobby 12-function cap without changing any client
// URL. Each handler is byte-for-byte the logic that previously lived in its
// own file (api/access/verify.js, api/access/session.js).
import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { findActiveEntitlement, grantEntitlement, issueSession, redeemAccessCode, registerFailedCode, verifySession } from "../_lib/entitlements.js";
import { resolvePlan } from "../_lib/plans.js";
import { verifyGumroadLicense } from "../_lib/gumroad.js";

export async function verify(request) {
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
    if (redeemed) {
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
    }

    // Not a local access_codes match — try it as a Gumroad license key
    // before failing. Doesn't count toward the code lockout on its own path.
    const gumroadMatch = await verifyGumroadLicense(email, code);
    if (gumroadMatch) {
      const gumroadReference = `gumroad:${gumroadMatch.plan}:${email}`;
      const entitlement = await grantEntitlement({
        email,
        plan: gumroadMatch.plan,
        source: "manual",
        granted_by: "gumroad_license",
        reference: gumroadReference
      });
      const session = await issueSession(entitlement);
      return json({ ok: true, plan: entitlement.plan, token: session.token, expires_at: session.expires_at });
    }

    await registerFailedCode(code, email);
    return json({ ok: false, error: "That email/code pair is not active" }, 401);
  } catch (error) {
    return handleError(error);
  }
}

export async function session(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    if (!token) throw new HttpError(400, "token is required");
    const verified = await verifySession(token);
    if (!verified) return json({ ok: false, error: "Session is invalid or expired" }, 401);
    return json({ ok: true, plan: verified.plan, email: verified.email });
  } catch (error) {
    return handleError(error);
  }
}

const handlers = { verify, session };

export async function POST(request) {
  const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();
  const handler = handlers[action];
  if (!handler) return json({ ok: false, error: "Unknown access action" }, 404);
  return handler(request);
}

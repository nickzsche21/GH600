import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { grantEntitlement, issueSession, redeemAccessCode, registerFailedCode } from "../_lib/entitlements.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const code = text(body.code, 100).toUpperCase();
    if (!code) throw new HttpError(400, "Access code is required");
    const redeemed = await redeemAccessCode(code, email);
    if (!redeemed) {
      await registerFailedCode(code);
      return json({ ok: false, error: "That email/code pair is not active" }, 401);
    }
    const entitlement = await grantEntitlement({
      email,
      plan: redeemed.plan,
      source: "manual",
      granted_by: `code:${code}`
    });
    const session = await issueSession(entitlement);
    return json({ ok: true, plan: redeemed.plan, token: session.token, expires_at: session.expires_at });
  } catch (error) {
    return handleError(error);
  }
}

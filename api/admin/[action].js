// Consolidated admin endpoints. One Vercel function serves
// /api/admin/grant and /api/admin/revoke (dispatched on the last path segment)
// to stay under the Hobby 12-function cap without changing any client URL. Each
// handler is byte-for-byte the logic that previously lived in its own file.
import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin.js";
import { resolvePlan } from "../_lib/plans.js";
import { select } from "../_lib/supabase.js";
import { grantEntitlement, issueSession, revokeEntitlement } from "../_lib/entitlements.js";

export async function grant(request) {
  try {
    const grantedBy = await requireAdmin(request);
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const plan = resolvePlan(body.plan);
    if (!plan) throw new HttpError(400, "Unknown plan");
    const source = text(body.source, 20).toLowerCase();
    if (!["wise", "manual"].includes(source)) throw new HttpError(400, "source must be wise or manual");
    const reference = text(body.reference, 200);
    if (!reference) throw new HttpError(400, "reference is required");
    const entitlement = await grantEntitlement({
      email,
      plan: plan.id,
      source,
      reference,
      granted_by: grantedBy,
      expires_at: body.expires_at || null
    });
    const session = await issueSession(entitlement);
    return json({ ok: true, plan: plan.id, token: session.token, expires_at: session.expires_at }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function revoke(request) {
  try {
    await requireAdmin(request);
    const body = await readJson(request);
    const entitlementId = text(body.entitlement_id, 100);
    const email = text(body.email, 254).toLowerCase();
    const reason = text(body.reason, 200) || "admin_revoked";
    let targetId = entitlementId;
    if (!targetId) {
      if (!email) throw new HttpError(400, "entitlement_id or email is required");
      const rows = await select("entitlements", { email: `eq.${email}`, active: "eq.true", limit: "1" });
      if (!rows.length) throw new HttpError(404, "No active entitlement for that email");
      targetId = rows[0].id;
    }
    const entitlement = await revokeEntitlement({ entitlement_id: targetId, reason });
    if (!entitlement) throw new HttpError(404, "Entitlement not found");
    return json({ ok: true, entitlement_id: entitlement.id });
  } catch (error) {
    return handleError(error);
  }
}

const handlers = { grant, revoke };

export async function POST(request) {
  const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();
  const handler = handlers[action];
  if (!handler) return json({ ok: false, error: "Unknown admin action" }, 404);
  return handler(request);
}

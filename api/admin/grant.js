import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin.js";
import { resolvePlan } from "../_lib/plans.js";
import { grantEntitlement, issueSession } from "../_lib/entitlements.js";

export async function POST(request) {
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

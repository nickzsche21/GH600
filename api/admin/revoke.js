import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { requireAdmin } from "../_lib/admin.js";
import { select } from "../_lib/supabase.js";
import { revokeEntitlement } from "../_lib/entitlements.js";

export async function POST(request) {
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

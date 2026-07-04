import { handleError, HttpError, json, readJson, requireEmail, text } from "../_lib/http.js";
import { select, update } from "../_lib/supabase.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const email = requireEmail(body.email);
    const code = text(body.code, 100).toUpperCase();
    if (!code) throw new HttpError(400, "Access code is required");
    const rows = await select("access_codes", { code: `eq.${code}`, active: "eq.true", limit: "1" });
    const access = rows[0];
    const validEmail = access && (access.email === "*" || access.email.toLowerCase() === email);
    const notExpired = access && (!access.expires_at || new Date(access.expires_at) > new Date());
    const usesAvailable = access && (access.max_uses == null || access.uses < access.max_uses);
    if (!access || !validEmail || !notExpired || !usesAvailable) return json({ ok: false, error: "That email/code pair is not active" }, 401);
    await update("access_codes", { id: `eq.${access.id}` }, { uses: access.uses + 1, last_used_at: new Date().toISOString() });
    return json({ ok: true, plan: access.plan });
  } catch (error) {
    return handleError(error);
  }
}

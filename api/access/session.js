import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { verifySession } from "../_lib/entitlements.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    if (!token) throw new HttpError(400, "token is required");
    const session = await verifySession(token);
    if (!session) return json({ ok: false, error: "Session is invalid or expired" }, 401);
    return json({ ok: true, plan: session.plan, email: session.email });
  } catch (error) {
    return handleError(error);
  }
}

import { handleError, json, readJson, safeMetadata, text } from "./_lib/http.js";
import { insert } from "./_lib/supabase.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const sessionId = text(body.session_id, 100);
    const eventName = text(body.event_name, 100);
    if (!sessionId || !eventName) return json({ ok: false, error: "session_id and event_name are required" }, 400);
    await insert("analytics_events", {
      session_id: sessionId,
      email: text(body.email, 254).toLowerCase() || null,
      event_name: eventName,
      metadata: safeMetadata(body.metadata)
    });
    return json({ ok: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}

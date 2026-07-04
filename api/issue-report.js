import { handleError, json, readJson, requireEmail, safeMetadata, text } from "./_lib/http.js";
import { insert } from "./_lib/supabase.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const message = text(body.message, 5000);
    if (message.length < 5) return json({ ok: false, error: "Please add a little more detail" }, 400);
    const [report] = await insert("issue_reports", {
      email: requireEmail(body.email), message,
      path: text(body.path, 300) || null,
      session_id: text(body.session_id, 100) || null,
      metadata: safeMetadata(body.metadata)
    });
    return json({ ok: true, id: report.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}

import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { insert, update } from "../_lib/supabase.js";

function attemptPayload(body) {
  const total = Math.max(1, Math.min(100, Number(body.total_questions) || 12));
  const score = Math.max(0, Math.min(total, Number(body.score) || 0));
  return {
    session_id: text(body.session_id, 100),
    email: text(body.email, 254).toLowerCase() || null,
    score,
    total_questions: total,
    readiness_percent: Math.max(0, Math.min(100, Number(body.readiness_percent) || Math.round(score / total * 100))),
    strongest_domains: Array.isArray(body.strongest_domains) ? body.strongest_domains.map(value => text(value, 80)).slice(0, 6) : [],
    weakest_domains: Array.isArray(body.weakest_domains) ? body.weakest_domains.map(value => text(value, 80)).slice(0, 6) : [],
    answers: Array.isArray(body.answers) ? body.answers.slice(0, 100) : [],
    completed: body.completed !== false,
    updated_at: new Date().toISOString()
  };
}

export async function POST(request) {
  try {
    const body = await readJson(request);
    const payload = attemptPayload(body);
    if (!payload.session_id) throw new HttpError(400, "session_id is required");
    if (body.attempt_id) {
      const rows = await update(
        "diagnostic_attempts",
        { id: `eq.${text(body.attempt_id, 80)}`, session_id: `eq.${payload.session_id}` },
        payload
      );
      if (!rows.length) throw new HttpError(404, "Diagnostic attempt not found");
      return json({ ok: true, attempt_id: rows[0].id });
    }
    const [attempt] = await insert("diagnostic_attempts", payload);
    return json({ ok: true, attempt_id: attempt.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}

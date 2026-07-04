import { handleError, json, readJson, requireEmail, safeMetadata, text } from "./_lib/http.js";
import { insert } from "./_lib/supabase.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const [lead] = await insert("leads", {
      email: requireEmail(body.email),
      source: text(body.source || "website", 80),
      plan_interest: text(body.plan_interest, 40) || null,
      current_score: Number.isFinite(body.current_score) ? Math.round(body.current_score) : null,
      path: text(body.path, 300) || null,
      utm_source: text(body.utm_source, 100) || null,
      utm_medium: text(body.utm_medium, 100) || null,
      utm_campaign: text(body.utm_campaign, 100) || null,
      metadata: safeMetadata(body.metadata)
    });
    return json({ ok: true, id: lead.id }, 201);
  } catch (error) {
    return handleError(error);
  }
}

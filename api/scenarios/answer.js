import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { insert, select } from "../_lib/supabase.js";
import { verifySession } from "../_lib/entitlements.js";
import { gradingFields } from "../_lib/scenario-map.js";
import { contentTiers } from "../_lib/plans.js";

export async function POST(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    const sessionId = text(body.session_id, 100);
    const scenarioId = text(body.scenario_id, 100);
    const selectedIndex = Number(body.selected_index);
    if (!sessionId || !scenarioId || !Number.isInteger(selectedIndex)) {
      throw new HttpError(400, "session_id, scenario_id and selected_index are required");
    }
    const session = await verifySession(token);
    if (!session) throw new HttpError(401, "Session is invalid or expired");

    const rows = await select("gh600_scenarios_v2", { id: `eq.${scenarioId}`, limit: "1" });
    const scenario = rows[0];
    if (!scenario) throw new HttpError(404, "Scenario not found");
    if (!contentTiers(session.plan).includes(scenario.plan_required)) {
      throw new HttpError(403, "Scenario is not included in your plan");
    }

    const { correct_index, correct_explanation, distractor_explanations } = gradingFields(scenario);
    const correct = selectedIndex === correct_index;
    const explanation = correct ? correct_explanation : (distractor_explanations[selectedIndex] || correct_explanation);

    await insert("scenario_attempts", {
      session_id: sessionId,
      email: session.email,
      scenario_id: scenario.id,
      scenario_version: scenario.created_version,
      selected_index: selectedIndex,
      correct,
      duration_ms: Number.isFinite(body.duration_ms) ? Math.round(body.duration_ms) : null,
      attempt_id: text(body.attempt_id, 80) || null
    });

    return json({ ok: true, correct, correct_index, explanation, decision_principle: null });
  } catch (error) {
    return handleError(error);
  }
}

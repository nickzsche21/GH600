// Consolidated Pro-lab scenario endpoints. One Vercel function serves
// /api/scenarios/next, /answer, /progress, /reset (dispatched on the last path
// segment) so the deployment stays under the Hobby 12-function cap without
// changing any client URL. Each handler below is byte-for-byte the logic that
// previously lived in its own file.
import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { select, insert, remove } from "../_lib/supabase.js";
import { verifySession } from "../_lib/entitlements.js";
import { toClientScenario, gradingFields } from "../_lib/scenario-map.js";
import { allowedMocks, contentTiers } from "../_lib/plans.js";

// PostgREST in./not.in. list syntax: quote each value so a comma or reserved
// character in an id can't break the filter or widen the match.
function quoteListValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function next(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    const sessionId = text(body.session_id, 100);
    const requestedMock = text(body.mock_id, 20).toUpperCase() || null;
    if (!sessionId) throw new HttpError(400, "session_id is required");
    const session = await verifySession(token);
    if (!session) throw new HttpError(401, "Session is invalid or expired");

    const tiers = contentTiers(session.plan);
    const mocks = allowedMocks(session.plan);
    if (!tiers.length || !mocks.length) return json({ ok: true, done: true });
    if (requestedMock && !mocks.includes(requestedMock)) {
      return json({ ok: false, error: "That mock is not included in your plan" }, 403);
    }

    const attempts = await select("scenario_attempts", { session_id: `eq.${sessionId}`, select: "scenario_id" });
    const attemptedIds = attempts.map(row => row.scenario_id);

    const query = {
      plan_required: `in.(${tiers.join(",")})`,
      review_status: "not.eq.rejected",
      mock_id: requestedMock ? `eq.${requestedMock}` : `in.(${mocks.join(",")})`,
      order: "mock_id.asc,mock_position.asc",
      limit: "1"
    };
    if (attemptedIds.length) query.id = `not.in.(${attemptedIds.map(quoteListValue).join(",")})`;

    const rows = await select("gh600_scenarios_v2", query);
    const scenario = rows[0];
    if (!scenario) return json({ ok: true, done: true });

    return json({ ok: true, done: false, scenario: toClientScenario(scenario) });
  } catch (error) {
    return handleError(error);
  }
}

export async function answer(request) {
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

export async function progress(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    const sessionId = text(body.session_id, 100);
    if (!sessionId) throw new HttpError(400, "session_id is required");
    const session = await verifySession(token);
    if (!session) throw new HttpError(401, "Session is invalid or expired");

    const tiers = contentTiers(session.plan);
    const mocks = allowedMocks(session.plan);
    if (!tiers.length || !mocks.length) return json({ ok: true, mocks: {}, core: { completed: 0, total: 0 } });

    const universe = await select("gh600_scenarios_v2", {
      select: "id,mock_id",
      plan_required: `in.(${tiers.join(",")})`,
      mock_id: `in.(${mocks.join(",")})`
    });
    const attempts = await select("scenario_attempts", { session_id: `eq.${sessionId}`, select: "scenario_id" });
    const attemptedIds = new Set(attempts.map(row => row.scenario_id));

    const byMock = {};
    for (const mockId of mocks) byMock[mockId] = { completed: 0, total: 0 };
    for (const row of universe) {
      const bucket = byMock[row.mock_id];
      if (!bucket) continue;
      bucket.total++;
      if (attemptedIds.has(row.id)) bucket.completed++;
    }

    const core = { completed: 0, total: 0 };
    for (const [mockId, bucket] of Object.entries(byMock)) {
      if (mockId === "DRILL") continue;
      core.completed += bucket.completed;
      core.total += bucket.total;
    }

    return json({ ok: true, mocks: byMock, core });
  } catch (error) {
    return handleError(error);
  }
}

export async function reset(request) {
  try {
    const body = await readJson(request);
    const token = text(body.token, 300);
    const sessionId = text(body.session_id, 100);
    const mockId = text(body.mock_id, 20).toUpperCase();
    if (!sessionId || !mockId) throw new HttpError(400, "session_id and mock_id are required");
    const session = await verifySession(token);
    if (!session) throw new HttpError(401, "Session is invalid or expired");
    if (!allowedMocks(session.plan).includes(mockId)) {
      throw new HttpError(403, "That mock is not included in your plan");
    }

    const rows = await select("gh600_scenarios_v2", { select: "id", mock_id: `eq.${mockId}` });
    const ids = rows.map(row => row.id);
    if (ids.length) {
      await remove("scenario_attempts", {
        session_id: `eq.${sessionId}`,
        scenario_id: `in.(${ids.map(quoteListValue).join(",")})`
      });
    }

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

const handlers = { next, answer, progress, reset };

export async function POST(request) {
  const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();
  const handler = handlers[action];
  if (!handler) return json({ ok: false, error: "Unknown scenario action" }, 404);
  return handler(request);
}

import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { select } from "../_lib/supabase.js";
import { verifySession } from "../_lib/entitlements.js";
import { toClientScenario } from "../_lib/scenario-map.js";
import { allowedMocks, contentTiers } from "../_lib/plans.js";

// PostgREST in./not.in. list syntax: quote each value so a comma or reserved
// character in an id can't break the filter or widen the match.
function quoteListValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function POST(request) {
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

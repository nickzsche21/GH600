import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { select } from "../_lib/supabase.js";
import { verifySession } from "../_lib/entitlements.js";
import { allowedMocks, contentTiers } from "../_lib/plans.js";

export async function POST(request) {
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

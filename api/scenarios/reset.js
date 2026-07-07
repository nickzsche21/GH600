import { handleError, HttpError, json, readJson, text } from "../_lib/http.js";
import { select, remove } from "../_lib/supabase.js";
import { verifySession } from "../_lib/entitlements.js";
import { allowedMocks } from "../_lib/plans.js";

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

import test from "node:test";
import assert from "node:assert/strict";
import { next as scenariosNext, answer as scenariosAnswer } from "../api/scenarios/[action].js";
import { issueSession } from "../api/_lib/entitlements.js";

process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
process.env.ENTITLEMENT_SIGNING_SECRET = "scenarios-test-secret";

function request(path, body) {
  return new Request(`https://gh600.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function tokenFor(plan) {
  const originalFetch = globalThis.fetch;
  let storedHash;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/access_sessions") && options.method === "POST") {
      storedHash = JSON.parse(options.body).token_hash;
      return Response.json([{ id: "session-row" }], { status: 201 });
    }
    return Response.json([]);
  };
  try {
    const { token } = await issueSession({ id: "ent-1", email: "buyer@example.com", plan });
    return { token, storedHash };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function mockVerifySessionFetch(plan) {
  return async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/access_sessions") && options.method === "GET") {
      return Response.json([{
        id: "session-row", email: "buyer@example.com", plan,
        expires_at: new Date(Date.now() + 60000).toISOString(), revoked: false
      }]);
    }
    if (path.endsWith("/access_sessions") && options.method === "PATCH") return Response.json([{ id: "session-row" }]);
    return Response.json([]);
  };
}

const founderRow = {
  id: "GH600-V2-010", title: "Founder row", prompt: "prompt", artifact: null, artifact_type: null,
  options: ["a", "b", "c", "d"], correct_answer: "A", correct_option_index: 0,
  explanation: "because A", wrong_answer_explanations: { B: "no", C: "no", D: "no" },
  domain_code: "D1", subskill: "skill", difficulty: "easy", plan_required: "founder",
  mock_id: "MOCK_1", mock_position: 1, created_version: "v2"
};

const proRow = { ...founderRow, id: "GH600-V2-200", plan_required: "pro", mock_id: "MOCK_5", mock_position: 5 };

test("a founding_access token requesting MOCK_5 (a pro-only mock) is refused", async () => {
  const { token } = await tokenFor("founding_access");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockVerifySessionFetch("founding_access");
  try {
    const response = await scenariosNext(request("/api/scenarios/next", { token, session_id: "s1", mock_id: "MOCK_5" }));
    assert.equal(response.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a founding_access token gets a founder-tier row and never sees the answer key", async () => {
  const { token } = await tokenFor("founding_access");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/access_sessions")) return mockVerifySessionFetch("founding_access")(url, options);
    if (path.endsWith("/scenario_attempts") && options.method === "GET") return Response.json([]);
    if (path.endsWith("/gh600_scenarios_v2")) return Response.json([founderRow]);
    return Response.json([]);
  };
  try {
    const response = await scenariosNext(request("/api/scenarios/next", { token, session_id: "s1", mock_id: "MOCK_1" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.scenario.id, "GH600-V2-010");
    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /correct_option_index/);
    assert.doesNotMatch(serialized, /"explanation"/);
    assert.doesNotMatch(serialized, /wrong_answer_explanations/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a founding_access token cannot grade against a pro-tier scenario id", async () => {
  const { token } = await tokenFor("founding_access");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/access_sessions")) return mockVerifySessionFetch("founding_access")(url, options);
    if (path.endsWith("/gh600_scenarios_v2")) return Response.json([proRow]);
    return Response.json([]);
  };
  try {
    const response = await scenariosAnswer(request("/api/scenarios/answer", {
      token, session_id: "s1", scenario_id: proRow.id, selected_index: 0
    }));
    assert.equal(response.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("answer grades correctly and returns the explanation for the submitted scenario only", async () => {
  const { token } = await tokenFor("pro");
  const originalFetch = globalThis.fetch;
  let insertedAttempt;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/access_sessions")) return mockVerifySessionFetch("pro")(url, options);
    if (path.endsWith("/gh600_scenarios_v2")) return Response.json([proRow]);
    if (path.endsWith("/scenario_attempts") && options.method === "POST") {
      insertedAttempt = JSON.parse(options.body);
      return Response.json([insertedAttempt], { status: 201 });
    }
    return Response.json([]);
  };
  try {
    const response = await scenariosAnswer(request("/api/scenarios/answer", {
      token, session_id: "s1", scenario_id: proRow.id, selected_index: 1, duration_ms: 4200
    }));
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.correct, false);
    assert.equal(body.correct_index, 0);
    assert.equal(body.explanation, "no");
    assert.equal(insertedAttempt.scenario_id, proRow.id);
    assert.equal(insertedAttempt.scenario_version, "v2");
    assert.equal(insertedAttempt.correct, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

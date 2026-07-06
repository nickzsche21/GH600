import test from "node:test";
import assert from "node:assert/strict";
import { toClientScenario, gradingFields } from "../api/_lib/scenario-map.js";

const sampleRow = {
  id: "GH600-V2-001",
  title: "Sample scenario",
  prompt: "What should you do?",
  artifact: "{\"tool\":\"repo\"}",
  artifact_type: "tool_permission_manifest",
  options: ["A answer", "B answer", "C answer", "D answer"],
  correct_answer: "D",
  correct_option_index: 3,
  explanation: "D is correct because...",
  wrong_answer_explanations: { A: "wrong because A", B: "wrong because B", C: "wrong because C" },
  domain: "Tool Use & Environment Interaction",
  domain_code: "D2",
  subskill: "Identify required tools",
  difficulty: "hard",
  plan_required: "founder",
  mock_id: "MOCK_1",
  mock_position: 1,
  scenario_type: "artifact_decision",
  created_version: "v2"
};

test("toClientScenario maps domain_code to a numeric primary_domain", () => {
  const client = toClientScenario(sampleRow);
  assert.equal(client.primary_domain, 2);
});

test("toClientScenario wraps the artifact into the {name, code} shape app.js expects", () => {
  const client = toClientScenario(sampleRow);
  assert.equal(client.artifact_type, "code");
  const parsed = JSON.parse(client.artifact_content);
  assert.deepEqual(parsed, { name: "tool_permission_manifest", code: "{\"tool\":\"repo\"}" });
});

test("toClientScenario never leaks the answer key", () => {
  const client = toClientScenario(sampleRow);
  assert.equal("correct_index" in client, false);
  assert.equal("correct_option_index" in client, false);
  assert.equal("explanation" in client, false);
  assert.equal("wrong_answer_explanations" in client, false);
});

test("toClientScenario returns null artifact fields when there is no artifact", () => {
  const client = toClientScenario({ ...sampleRow, artifact: null });
  assert.equal(client.artifact_type, null);
  assert.equal(client.artifact_content, null);
});

test("gradingFields remaps letter-keyed distractor explanations to numeric indices, skipping the correct letter", () => {
  const fields = gradingFields(sampleRow);
  assert.equal(fields.correct_index, 3);
  assert.equal(fields.correct_explanation, "D is correct because...");
  assert.deepEqual(fields.distractor_explanations, { 0: "wrong because A", 1: "wrong because B", 2: "wrong because C" });
  assert.equal(3 in fields.distractor_explanations, false);
});

import { buildBalancedDiagnostic } from "./diagnostic-utils.js";

const domains = [
  { id: 1, short: "Architecture", name: "Architecture & SDLC", weight: "15–20%", color: "#94b5ff", desc: "Success criteria, planning boundaries, inspectable artifacts and human intervention." },
  { id: 2, short: "Tool use", name: "Tool Use & Environment", weight: "20–25%", color: "#c8ff47", desc: "MCP configuration, permissions, execution contexts, retries, rollback and escalation." },
  { id: 3, short: "Memory", name: "Memory, State & Execution", weight: "10–15%", color: "#8bf3c6", desc: "Task-relevant memory, durable state, expiration, continuity and context drift." },
  { id: 4, short: "Evaluation", name: "Evaluation & Tuning", weight: "15–20%", color: "#ffb86b", desc: "Signals, traces, root-cause classification and behavior tuning." },
  { id: 5, short: "Multi-agent", name: "Multi-Agent Coordination", weight: "15–20%", color: "#c9a7ff", desc: "Isolation, handoffs, conflict resolution, recovery and lifecycle management." },
  { id: 6, short: "Guardrails", name: "Guardrails & Accountability", weight: "10–15%", color: "#ff8f8f", desc: "Risk-tiered autonomy, least privilege, approvals and irreversible actions." }
];

const questions = [
  { d:1, objective:"Define planning and action boundaries", artifact:{name:"agent_run_policy.yml",code:`trigger: issue_labeled
allowed_scope:
  paths: ["services/billing/**", ".github/workflows/**"]
planner:
  emits_plan: true
executor:
  may_edit_before_approval: true
  target_branch: main
change_risk:
  authz_rules: high
  ci_only: insufficient`}, q:"A coding agent is triggered from an issue label. Its plan mentions an authorization-rule change, but the policy lets it edit `main` before approval. The team wants autonomous bug fixes to stay fast while preventing unreviewed architectural/security changes. What is the best control?", a:["Require a signed structured plan and block high-risk path/rule changes until a maintainer approves the plan","Keep the policy unchanged but require the agent to paste its reasoning into the issue after it commits","Allow edits only when the issue has fewer than three acceptance criteria","Run a second agent after the commit and compare whether both changed the same files"], c:0, why:"The risk is not that the agent lacks a plan; it is that execution is allowed before approval for high-risk changes. A plan gate tied to change class prevents unsafe edits while preserving autonomy for lower-risk work." },
  { d:1, objective:"Define measurable success criteria", artifact:{name:"issue_acceptance.md",code:`Goal: upgrade payment SDK
Done when:
- build passes
- no lint errors
Recent incident:
- checkout returned 200
- webhook signature verification failed in production
- paid users were not entitled`}, q:"The agent closes SDK-upgrade issues once build and lint pass, but the last release broke paid access because webhook verification was not exercised. Which revised success definition is strongest?", a:["The pull request is open, build passes, and the agent used fewer than 20 tool calls","Build, lint, targeted webhook tests, entitlement creation, and a checkout smoke path all pass before closure","The agent includes a confidence score above 80 percent in the final message","A reviewer leaves any comment on the pull request before merge"], c:1, why:"Good success criteria represent the actual user and system outcome. Here, checkout and entitlement behavior are part of success; build and lint are necessary but too shallow." },
  { d:1, objective:"Produce inspectable artifacts", artifact:{name:"pr_evidence.txt",code:`Agent final note:
Changed auth guard to reduce friction.

Missing:
- original plan
- tool calls
- diff rationale
- test evidence
- human approval record`}, q:"A security reviewer cannot reconstruct why an autonomous refactor relaxed an authorization guard. The team still wants agents to create pull requests. Which workflow change gives the strongest inspectability?", a:["Attach the plan, tool transcript summary, diff rationale, test evidence, risk notes, and approvals to the pull request","Ask the agent to save its full private conversation locally for audit requests","Require the final commit message to say whether the model felt confident","Disable all agent refactors involving security-sensitive code"], c:0, why:"The pull request should become the auditable package: intent, evidence, changes, and approvals. Local transcripts or confidence statements do not create reliable review artifacts." },
  { d:2, objective:"Configure least-privilege tool access", artifact:{name:"mcp_tools.json",code:`{
  "task": "update docs and open a PR",
  "servers": {
    "github": {
      "repositories": ["*"],
      "tools": ["contents.read", "contents.write", "pull_requests.write", "actions.write", "members.write"],
      "token_ttl": "30d"
    }
  }
}`}, q:"A documentation agent only needs to read repository content and open pull requests in one docs repository. The current MCP configuration exposes organization-wide write and membership tools. Which correction best reduces risk without blocking the task?", a:["Move the token into an environment variable but leave the tool list unchanged","Restrict the server to the docs repository, allow content read plus pull request creation, remove Actions and membership tools, and shorten token lifetime","Keep organization-wide tools but tell the agent in the prompt not to use them","Add an audit log and let the same token continue to administer organization membership"], c:1, why:"Least privilege must be enforced in the tool boundary, not only in prompting or secret storage. Repository, action, and lifetime scope all matter for MCP-style tool access." },
  { d:2, objective:"Implement safe retries", artifact:{name:"release_trace.log",code:`10:02:11 POST /releases request_id=rel-884 timeout
10:02:42 retry POST /releases request_id=rel-991 201
10:03:18 webhook received for rel-884 201
10:04:03 duplicate release detected`}, q:"A deployment agent retries after a timeout and sometimes creates duplicate releases. The release API supports idempotency keys and a status lookup endpoint. What should the workflow do first?", a:["Increase timeout and retry up to five times because the first call usually fails","Use one idempotency key per intended release, check release state after uncertain outcomes, and retry only when state is absent or failed","Ask a second model to decide whether the timeout probably succeeded","Disable retries and require a human to manually re-run every timeout"], c:1, why:"Timeout means the outcome is unknown, not failed. Idempotency plus state verification prevents duplicate side effects while keeping recovery automated." },
  { d:2, objective:"Scope execution environment", artifact:{name:"runner_context.yml",code:`job: fix-gh600-bug
checkout: org/*
token_scopes:
  - contents:write
  - workflows:write
  - administration:write
branch_protection_bypass: true
network: unrestricted`}, q:"An agent is assigned a one-repository UI bug, but its runner can edit any org repository, rewrite workflows, bypass branch protection, and access unrestricted network. Which setup best contains blast radius?", a:["Keep the runner as-is, but require the agent to mention the target repository in its final answer","Use a repository-scoped token, isolated branch/workspace, pull-request-only writes, branch protection, and allowlisted network egress","Let the agent push directly as long as the branch name starts with `agent/`","Give the agent admin rights only during business hours"], c:1, why:"Containment requires enforced boundaries around repository access, write path, branch rules, and environment capabilities. Naming and time windows do not meaningfully reduce authority." },
  { d:3, objective:"Choose an appropriate memory strategy", artifact:{name:"memory_record.json",code:`{
  "tenant": "global",
  "subject": "Acme refund exception",
  "value": "Refund approval limit raised to $5000",
  "source": "support chat",
  "expires_at": null,
  "applies_to": ["all_customers"]
}`}, q:"A support agent must remember Acme's temporary refund exception for 90 days, but the saved memory is global and has no expiry. What is the best correction?", a:["Move the exception into a longer system prompt so every run sees it","Store it as tenant-scoped durable memory with source, expiry, and retrieval filters that prevent cross-customer use","Keep it global because the exception may help other customers with similar problems","Delete all durable memory and rely only on the current conversation"], c:1, why:"The requirement is durable but isolated memory. Scope, provenance, expiry, and retrieval rules prevent one customer's exception from contaminating unrelated decisions." },
  { d:3, objective:"Resume from durable state", artifact:{name:"migration_checkpoint.json",code:`{
  "run_id": "mig-2026-07-10",
  "completed_repos": 73,
  "last_repo": "api-gateway",
  "pending": ["billing-api", "web-app"],
  "last_verified_hash": "9f21",
  "chat_context_available": false
}`}, q:"A migration agent crashed after completing 73 repositories. Some repositories have side effects outside Git. How should it resume safely?", a:["Restart from repository one and repeat every action to guarantee consistency","Load the durable checkpoint, verify recorded side effects for the last completed item, then continue with the next pending repository","Ask the model to infer progress from the issue comments and continue from its best guess","Skip verification because the checkpoint says 73 repositories are complete"], c:1, why:"Durable state is the right source of progress, but it should be verified at the boundary before new side effects. Guessing from chat or blindly replaying work is unsafe." },
  { d:3, objective:"Prevent stale context", artifact:{name:"retrieval_result.txt",code:`selected_memory:
- title: Deploy via Classic Release
  updated_at: 2024-02-03
  superseded_by: GitHub Actions deploy v3
  confidence: high
current_policy:
- Actions deploy v3 required for production`}, q:"An agent keeps recommending a retired deployment procedure because its old memory has high confidence. Which memory control addresses the root cause?", a:["Increase the number of retrieved memories so newer items might appear too","Use provenance, freshness, supersession metadata, and pruning/expiry rules during retrieval","Copy both the old and new deployment procedures into every prompt","Disable retrieval for all production tasks"], c:1, why:"The failure is stale retrieval, not lack of context. Freshness and supersession metadata let the system demote or prune obsolete memory before it influences a recommendation." },
  { d:4, objective:"Select meaningful evaluation signals", artifact:{name:"eval_summary.csv",code:`metric,value
build_pass_rate,0.98
acceptance_criteria_verified,0.41
review_rework_rate,0.37
rollback_24h_rate,0.18
avg_tokens,11200`}, q:"A pull-request agent has a high build pass rate but frequently misunderstands the issue and causes rework. Which evaluation bundle is most useful for tuning?", a:["Average token count, model latency, and number of files opened","Acceptance-criteria coverage, targeted test results, review rework, rollback rate, and trace examples for misses","Number of pull request comments and branch-name length","Only build pass rate, because failing builds are the clearest signal"], c:1, why:"Build pass rate is too narrow. The useful bundle connects intent, evidence, human review, operational fallout, and concrete traces that explain failures." },
  { d:4, objective:"Classify root causes", artifact:{name:"failure_trace.log",code:`retrieved_policy=correct
plan=rotate staging key only
tool_call=rotate_secret(env="prod", key="stripe_live")
tool_schema_required_env=["staging","prod"]
review=reasoning matched policy; parameter was wrong`}, q:"The agent understood the policy and planned a staging-only rotation, but called the tool with `env=\"prod\"`. How should this failure be classified first?", a:["Reasoning failure, because any bad action means the plan was wrong","Tool invocation or interface-control failure, because the chosen parameter violated the otherwise correct plan","Memory drift, because the agent must have remembered an old secret policy","Multi-agent coordination failure, because another reviewer should have caught it"], c:1, why:"The trace shows correct retrieval and planning, with the error introduced at tool-call construction. Classification matters because the fix should target schema validation or action checks, not memory or reasoning." },
  { d:4, objective:"Tune from evidence", artifact:{name:"trace_pattern.txt",code:`pass cases: retrieved_docs <= 6
fail cases: retrieved_docs >= 18
observed behavior:
- newest policy ranked 14th
- answer cites older policy
- tests chosen from unrelated package`}, q:"Evaluation traces show the agent fails when retrieval floods the context and pushes the newest policy below the useful window. What is the best tuning move?", a:["Make the system prompt longer so the agent is reminded to read everything","Improve retrieval filtering/ranking, cap low-value context, prioritize fresh policy, and rerun the same evaluation set","Increase autonomy so the agent can decide which policy to follow after acting","Add more few-shot examples even if they consume additional context"], c:1, why:"The evidence points to context selection failure. Better retrieval and prioritization address the failure mode directly; adding more prompt content would likely worsen the overload." },
  { d:5, objective:"Isolate parallel execution", artifact:{name:"orchestrator.yml",code:`runs:
  - agent: security-fix
    issue: auth-timeout
  - agent: dependency-fix
    issue: bump-actions
workspace: /tmp/shared-checkout
branch: main
preflight_file_lock: false
merge_strategy: last_writer_wins`}, q:"Two agents work on independent issues in the same checkout. Both edit `.github/workflows/deploy.yml`, and the later run overwrites the earlier security fix. What should change?", a:["Keep the shared checkout but ask both agents to commit more frequently","Use isolated workspaces/branches, run an overlap check for owned files before execution, and require an explicit merge decision for conflicts","Let the dependency agent always win because dependency bumps are routine","Disable all parallel agents until the workflow file is never edited"], c:1, why:"Parallelism is not the problem by itself; unmanaged shared state is. Isolation plus early overlap detection preserves speed while making conflicts explicit." },
  { d:5, objective:"Document handoffs", artifact:{name:"handoff.md",code:`Task: implement selected auth design
Chosen design: token exchange at edge
Rejected:
- browser-stored long-lived token: rejected for leakage risk
- backend polling: rejected for latency
Missing:
- acceptance criteria
- open risks
- current files changed`}, q:"A planner hands work to an implementation agent. The implementer keeps reopening rejected designs and misses a latency requirement. What should the handoff include?", a:["Only the final task title so the implementer can reason independently","Decisions, constraints, rejected alternatives with reasons, acceptance criteria, open risks, and current state","The full raw planning transcript, including every dead end","A request for the implementer to restart discovery from zero"], c:1, why:"A useful handoff preserves the decisions that matter without flooding the next agent. Acceptance criteria and rejected alternatives prevent repeated debate and missed constraints." },
  { d:5, objective:"Recover degraded workflows", artifact:{name:"pipeline_state.json",code:`{
  "planner": "done",
  "implementer": "opening PR 4",
  "reviewer": "stalled: 47m",
  "pending_reviews": 3,
  "policy": "max_pending_reviews=1"
}`}, q:"In a three-agent pipeline, the reviewer has stalled while the implementer keeps opening new pull requests. What is the safest recovery pattern?", a:["Let the implementer continue because review can catch up later","Pause dependent implementation, preserve artifacts, retry or replace the reviewer within a bounded limit, then escalate if still stalled","Delete all branches and restart the entire pipeline immediately","Allow the implementer to approve its own pull requests until the reviewer recovers"], c:1, why:"The system must stop accumulating unreviewed work, preserve evidence, and use bounded recovery before escalation. Self-approval breaks the control the reviewer exists to provide." },
  { d:6, objective:"Right-size human intervention", artifact:{name:"autonomy_matrix.yml",code:`actions:
  format_code:
    reversibility: high
    approval: required
  rotate_prod_secret:
    reversibility: medium
    approval: auto
  delete_cloud_resource:
    reversibility: low
    approval: auto
audit_log: enabled`}, q:"The current autonomy matrix slows harmless formatting but auto-approves production secret rotation and destructive cloud deletes. Which policy is best?", a:["Require approval for every action so the agent can never act alone","Auto-approve reversible formatting; require explicit authorization for production secrets and destructive infrastructure actions","Keep auto-approval because audit logs can explain mistakes later","Block formatting and secret rotation, but allow cloud deletes during incidents"], c:1, why:"Autonomy should track risk and reversibility. Logs support accountability but do not replace approval for sensitive or destructive actions." },
  { d:6, objective:"Enforce controlled execution paths", artifact:{name:"incident_runbook.md",code:`severity: critical
agent_capability: prepare_patch_and_tests
production_change_policy:
  required_approvers: 2
  bypass_allowed: false
  evidence_required: diff, tests, rollback_plan`}, q:"At 2 a.m., an agent finds a critical production fix. The runbook forbids bypassing two-person approval but allows the agent to prepare evidence. What should happen?", a:["The agent deploys immediately because critical severity overrides normal controls","The agent prepares the patch, tests, and rollback evidence, then waits in the protected approval path","The agent uses a personal maintainer token so the outage is resolved faster","The agent records approval after deployment once humans wake up"], c:1, why:"Criticality can justify urgency, not bypass. The agent should compress preparation time while the controlled path enforces production authorization." },
  { d:6, objective:"Preserve accountability", artifact:{name:"identity_audit.log",code:`actor=agent-shared action=delete_resource target=prod-cache
actor=agent-shared action=rotate_secret target=billing
actor=agent-shared action=merge_pr target=auth
note=5 agents use the same workload identity`}, q:"Five agents share one service identity, so destructive actions cannot be attributed to a specific workload. Which change best restores accountability?", a:["Keep the shared identity but require each agent to write its name in commit messages","Use distinct workload identities with scoped permissions and immutable action logs","Store the shared credential in a stronger vault","Add more detailed natural-language final summaries after each run"], c:1, why:"Accountability needs reliable identity at the action boundary plus tamper-resistant logs. A better vault protects the secret, but it does not distinguish which agent acted." }
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => HTML_ESCAPES[char]);

const backend = window.GH600_BACKEND || { enabled: false, apiBase: "/api" };
const sessionId = localStorage.getItem("gh600lab-session-id") || (crypto.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
localStorage.setItem("gh600lab-session-id", sessionId);
const query = new URLSearchParams(window.location.search);
const attribution = {
  utm_source: query.get("utm_source") || "",
  utm_medium: query.get("utm_medium") || "",
  utm_campaign: query.get("utm_campaign") || ""
};

async function apiRequest(path, payload) {
  if (!backend.enabled) return null;
  try {
    const response = await fetch(`${backend.apiBase}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Unexpected server response" }));
    return response.ok ? data : { ...data, ok: false, status: response.status };
  } catch (error) {
    console.warn(`GH600 API ${path} unavailable`, error);
    return null;
  }
}

function trackEvent(name, properties = {}) {
  const event = { name, properties, at: new Date().toISOString() };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...properties });
  const events = JSON.parse(localStorage.getItem("gh600lab-analytics") || "[]");
  events.push(event);
  localStorage.setItem("gh600lab-analytics", JSON.stringify(events.slice(-100)));
  window.dispatchEvent(new CustomEvent("gh600lab:analytics", { detail: event }));
  void apiRequest("/event", {
    session_id: sessionId,
    email: localStorage.getItem("gh600lab-known-email") || null,
    event_name: name,
    metadata: properties
  });
}

function saveLocalRecord(key, record) {
  const records = JSON.parse(localStorage.getItem(key) || "[]");
  records.push({ ...record, at: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(records));
}

function captureLead(record) {
  saveLocalRecord("gh600lab-leads", record);
  localStorage.setItem("gh600lab-known-email", record.email.toLowerCase());
  return apiRequest("/lead", {
    ...record,
    path: `${window.location.pathname}${window.location.search}`,
    ...attribution
  });
}

function rankDomains(domainScores) {
  const ranked = domains.map((domain, index) => ({ name: domain.name, score: domainScores[index] })).sort((a, b) => b.score - a.score);
  return {
    strongest_domains: ranked.filter(item => item.score === ranked[0].score).map(item => item.name),
    weakest_domains: ranked.filter(item => item.score === ranked[ranked.length - 1].score).map(item => item.name)
  };
}

function diagnosticPayload(result, email = null) {
  return {
    session_id: sessionId,
    email,
    score: result.correct,
    total_questions: result.total,
    readiness_percent: result.score,
    ...rankDomains(result.domainScores),
    answers: result.answers,
    completed: true
  };
}

const landingScores = [82, 41, 44, 74, 38, 79];
$("#landing-domain-bars").innerHTML = domains.map((d, i) => `
  <div class="domain-row"><span>${d.short}</span><div><i style="width:${landingScores[i]}%;background:${d.color}"></i></div><b>${landingScores[i]}%</b></div>`).join("");

$("#blueprint-grid").innerHTML = domains.map(d => `
  <article class="domain-card" data-index="0${d.id}">
    <span>DOMAIN 0${d.id}</span><h3>${d.name}</h3><p>${d.desc}</p>
    <div class="domain-weight" style="--domain-color:${d.color};--weight:${parseInt(d.weight) * 3}px"><i></i>${d.weight} OF EXAM</div>
  </article>`).join("");

const quizDialog = $("#quiz-dialog");
const quizBody = $("#quiz-body");
let quizSet = [];
let quizIndex = 0;
let selected = null;
let answers = [];
let locked = false;
let timer = 0;
let timerId = null;
let pendingResult = null;

function buildDiagnostic() {
  const authoredQuestions = questions.map((question, index) => ({ ...question, scenarioId: `gh600-${index + 1}` }));
  return buildBalancedDiagnostic(domains, authoredQuestions);
}

function startQuiz() {
  quizSet = buildDiagnostic();
  quizIndex = 0;
  answers = [];
  timer = 8 * 60;
  trackEvent("diagnostic_started", { question_count: quizSet.length });
  clearInterval(timerId);
  timerId = setInterval(() => {
    timer = Math.max(0, timer - 1);
    const timerEl = $("#question-timer");
    if (timerEl) timerEl.textContent = formatTime(timer);
    if (timer === 0) finishQuiz();
  }, 1000);
  if (!quizDialog.open) quizDialog.showModal();
  document.body.style.overflow = "hidden";
  renderQuestion();
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function renderQuestion() {
  locked = false;
  selected = null;
  const item = quizSet[quizIndex];
  const domain = domains[item.d - 1];
  $("#quiz-progress-label").textContent = `Scenario ${quizIndex + 1} of ${quizSet.length}`;
  $("#quiz-progress-bar").style.width = `${((quizIndex + 1) / quizSet.length) * 100}%`;
  quizBody.innerHTML = `
    <section class="quiz-question" style="--domain-color:${domain.color}">
      <aside class="quiz-sidebar">
        <span class="domain-chip">DOMAIN 0${domain.id}</span>
        <h3>${domain.name}</h3><p>${domain.desc}</p>
        <div class="timer"><small>TIME LEFT</small><span id="question-timer">${formatTime(timer)}</span></div>
        <p class="quiz-legal">Original practice<br>Public-doc aligned<br>Hands-on readiness</p>
      </aside>
      <div class="question-main">
        <span class="question-kicker">${item.artifact ? "ARTIFACT LAB" : "PRODUCTION SCENARIO"} · CHOOSE ONE</span>
        ${item.artifact ? `<div class="question-artifact"><div><span>${escapeHtml(item.artifact.name)}</span><small>INSPECT THIS ARTIFACT</small></div><pre><code>${escapeHtml(item.artifact.code)}</code></pre></div>` : ""}
        <h2>${escapeHtml(item.q)}</h2>
        <div class="answer-list">${item.a.map((answer, i) => `<button class="answer-option" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span><b>${escapeHtml(answer)}</b></button>`).join("")}</div>
        <div id="explanation-slot"></div>
        <div class="question-actions"><button class="button button-dark" id="submit-answer" disabled>Check decision <span>→</span></button></div>
      </div>
      <aside class="objective-panel"><span>BLUEPRINT OBJECTIVE</span><h4>${escapeHtml(item.objective)}</h4><div class="objective-line" style="--objective:${60 + item.d * 5}%"><i></i></div><p>Original scenario mapped to the public GH-600 skills outline and supporting documentation.</p></aside>
    </section>`;

  $$("[data-answer]", quizBody).forEach(button => button.addEventListener("click", () => {
    if (locked) return;
    selected = Number(button.dataset.answer);
    $$("[data-answer]", quizBody).forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    $("#submit-answer").disabled = false;
  }));
  $("#submit-answer").addEventListener("click", checkAnswer);
}

function checkAnswer() {
  if (selected === null || locked) return;
  locked = true;
  const item = quizSet[quizIndex];
  const correct = selected === item.c;
  answers.push({
    scenario_id: item.scenarioId,
    domain: item.d,
    objective: item.objective,
    selected_answer: selected,
    correct_answer: item.c,
    correct
  });
  $$("[data-answer]", quizBody).forEach((button, i) => {
    button.disabled = true;
    if (i === item.c) button.classList.add("correct");
    if (i === selected && !correct) button.classList.add("wrong");
  });
  $("#explanation-slot").innerHTML = `<div class="explanation ${correct ? "correct-exp" : "wrong-exp"}"><strong>${correct ? "Good call." : "Not quite."}</strong><p>${escapeHtml(item.why)}</p></div>`;
  const action = $("#submit-answer");
  action.disabled = false;
  action.innerHTML = quizIndex === quizSet.length - 1 ? "View readiness report <span>→</span>" : "Next scenario <span>→</span>";
  action.onclick = () => {
    quizIndex++;
    if (quizIndex >= quizSet.length) finishQuiz(); else renderQuestion();
  };
}

function finishQuiz() {
  clearInterval(timerId);
  const correct = answers.filter(a => a.correct).length;
  const score = answers.length ? Math.round(correct / quizSet.length * 100) : 0;
  const domainScores = domains.map(d => {
    const results = answers.filter(a => a.domain === d.id);
    return results.length ? Math.round(results.filter(a => a.correct).length / results.length * 100) : 0;
  });
  const result = { score, correct, domainScores, answers: [...answers], total: quizSet.length, date: new Date().toISOString(), mode: "diagnostic" };
  pendingResult = result;
  localStorage.setItem("gh600lab-last-result", JSON.stringify(result));
  trackEvent("diagnostic_completed", { score, correct, question_count: quizSet.length });
  result.attemptRequest = apiRequest("/diagnostic/complete", diagnosticPayload(result)).then(response => {
    if (response?.ok) result.attemptId = response.attempt_id;
    return response;
  });
  $("#quiz-progress-label").textContent = "Diagnostic complete";
  $("#quiz-progress-bar").style.width = "100%";
  renderReportGate(result);
}

const MOCK_LABELS = {
  MOCK_1: "Mock Exam 1", MOCK_2: "Mock Exam 2", MOCK_3: "Mock Exam 3",
  MOCK_4: "Mock Exam 4", MOCK_5: "Mock Exam 5", MOCK_6: "Mock Exam 6",
  DRILL: "Targeted Drills"
};
const MOCK_LENGTHS = {
  MOCK_1: 40, MOCK_2: 40, MOCK_3: 40, MOCK_4: 40, MOCK_5: 40, MOCK_6: 40, DRILL: 60
};
function mocksForPlan(plan) {
  if (plan === "pro" || plan === "team_pack") return ["MOCK_1", "MOCK_2", "MOCK_3", "MOCK_4", "MOCK_5", "MOCK_6", "DRILL"];
  if (plan === "founding_access") return ["MOCK_1", "MOCK_2", "MOCK_3"];
  return [];
}

let currentProScenario = null;
let proAnswers = [];
let proAttemptCount = 0;
let proScenarioStartedAt = 0;
let currentMockId = null;
let planProgress = { mocks: {}, core: { completed: 0, total: 0 } };

async function fetchPlanProgress() {
  const token = localStorage.getItem("gh600lab-session-token") || "";
  const response = await apiRequest("/scenarios/progress", { token, session_id: sessionId });
  return response?.ok ? response : { ok: false, mocks: {}, core: { completed: 0, total: 0 } };
}

const mockResumeDialog = $("#mock-resume-dialog");
$$('[data-close-mock-resume]').forEach(button => button.addEventListener("click", () => mockResumeDialog.close()));

async function startProLab(mockId) {
  planProgress = await fetchPlanProgress();
  const bucket = planProgress.mocks[mockId] || { completed: 0, total: 0 };
  if (bucket.completed > 0) {
    $("#mock-resume-heading").textContent = `${MOCK_LABELS[mockId] || "This mock"} is ${bucket.completed >= bucket.total ? "complete" : "in progress"}.`;
    $("#mock-resume-copy").textContent = `You've answered ${bucket.completed} of ${bucket.total} questions here. Continue where you left off, or restart from scratch.`;
    $("#mock-resume-continue").onclick = () => { mockResumeDialog.close(); beginProLabRun(mockId); };
    $("#mock-resume-restart").onclick = async () => {
      mockResumeDialog.close();
      const token = localStorage.getItem("gh600lab-session-token") || "";
      await apiRequest("/scenarios/reset", { token, session_id: sessionId, mock_id: mockId });
      if (mockId !== "DRILL") planProgress.core.completed = Math.max(0, planProgress.core.completed - bucket.completed);
      planProgress.mocks[mockId] = { ...bucket, completed: 0 };
      beginProLabRun(mockId);
    };
    mockResumeDialog.showModal();
    return;
  }
  beginProLabRun(mockId);
}

function beginProLabRun(mockId) {
  currentMockId = mockId;
  proAnswers = [];
  proAttemptCount = 0;
  timer = 18 * 60;
  clearInterval(timerId);
  timerId = setInterval(() => {
    timer = Math.max(0, timer - 1);
    const timerEl = $("#question-timer");
    if (timerEl) timerEl.textContent = formatTime(timer);
    if (timer === 0) finishProLab();
  }, 1000);
  if (!quizDialog.open) quizDialog.showModal();
  document.body.style.overflow = "hidden";
  renderNextProScenario();
}

async function renderNextProScenario() {
  locked = false;
  selected = null;
  const token = localStorage.getItem("gh600lab-session-token") || "";
  const response = await apiRequest("/scenarios/next", { token, session_id: sessionId, mock_id: currentMockId });
  if (response?.done) { finishProLab(); return; }
  if (!response?.ok || !response.scenario) { expireProLab(); return; }
  currentProScenario = response.scenario;
  proScenarioStartedAt = Date.now();
  proAttemptCount++;
  trackEvent("paid_scenario_started", { scenario_id: currentProScenario.id, mock_id: currentMockId });
  const domain = domains[currentProScenario.primary_domain - 1];
  const artifact = currentProScenario.artifact_type === "code" && currentProScenario.artifact_content
    ? JSON.parse(currentProScenario.artifact_content) : null;
  updateProProgressDisplay();
  quizBody.innerHTML = `
    <section class="quiz-question" style="--domain-color:${domain.color}">
      <aside class="quiz-sidebar">
        <span class="domain-chip">DOMAIN 0${domain.id}</span>
        <h3>${domain.name}</h3><p>${domain.desc}</p>
        <div class="timer"><small>TIME LEFT</small><span id="question-timer">${formatTime(timer)}</span></div>
        <p class="quiz-legal">Pro lab · Server-graded<br>Public-doc aligned<br>Hands-on readiness</p>
      </aside>
      <div class="question-main">
        <span class="question-kicker">${artifact ? "ARTIFACT LAB" : "PRODUCTION SCENARIO"} · CHOOSE ONE</span>
        ${artifact ? `<div class="question-artifact"><div><span>${escapeHtml(artifact.name)}</span><small>INSPECT THIS ARTIFACT</small></div><pre><code>${escapeHtml(artifact.code)}</code></pre></div>` : ""}
        <h2>${escapeHtml(currentProScenario.prompt)}</h2>
        <div class="answer-list">${currentProScenario.options.map((answer, i) => `<button class="answer-option" data-answer="${i}"><span>${String.fromCharCode(65 + i)}</span><b>${escapeHtml(answer)}</b></button>`).join("")}</div>
        <div id="explanation-slot"></div>
        <div class="question-actions"><button class="button button-dark" id="submit-answer" disabled>Check decision <span>→</span></button></div>
      </div>
      <aside class="objective-panel"><span>BLUEPRINT OBJECTIVE</span><h4>${escapeHtml(currentProScenario.objective)}</h4><div class="objective-line" style="--objective:${60 + domain.id * 5}%"><i></i></div><p>Original scenario mapped to the public GH-600 skills outline and supporting documentation.</p></aside>
    </section>`;

  $$("[data-answer]", quizBody).forEach(button => button.addEventListener("click", () => {
    if (locked) return;
    selected = Number(button.dataset.answer);
    $$("[data-answer]", quizBody).forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
    $("#submit-answer").disabled = false;
  }));
  $("#submit-answer").addEventListener("click", checkProAnswer);
}

function updateProProgressDisplay() {
  const bucket = planProgress.mocks[currentMockId] || { completed: 0, total: MOCK_LENGTHS[currentMockId] || 40 };
  if (currentMockId === "DRILL") {
    $("#quiz-progress-label").textContent = `${MOCK_LABELS.DRILL} · ${bucket.completed}/${bucket.total}`;
    $("#quiz-progress-bar").style.width = `${Math.min(100, (bucket.completed / (bucket.total || 1)) * 100)}%`;
    return;
  }
  const core = planProgress.core;
  $("#quiz-progress-label").textContent = `${MOCK_LABELS[currentMockId] || "Pro lab"} · ${core.completed}/${core.total || 1} completed`;
  $("#quiz-progress-bar").style.width = `${Math.min(100, (core.completed / (core.total || 1)) * 100)}%`;
}

async function checkProAnswer() {
  if (selected === null || locked) return;
  locked = true;
  const action = $("#submit-answer");
  action.disabled = true;
  const token = localStorage.getItem("gh600lab-session-token") || "";
  const durationMs = Date.now() - proScenarioStartedAt;
  const response = await apiRequest("/scenarios/answer", {
    token, session_id: sessionId, scenario_id: currentProScenario.id, scenario_version: currentProScenario.version,
    selected_index: selected, duration_ms: durationMs
  });
  const correct = Boolean(response?.correct);
  const correctIndex = response?.correct_index ?? selected;
  proAnswers.push({ scenario_id: currentProScenario.id, domain: currentProScenario.primary_domain, correct });
  $$("[data-answer]", quizBody).forEach((button, i) => {
    button.disabled = true;
    if (i === correctIndex) button.classList.add("correct");
    if (i === selected && !correct) button.classList.add("wrong");
  });
  $("#explanation-slot").innerHTML = `<div class="explanation ${correct ? "correct-exp" : "wrong-exp"}"><strong>${correct ? "Good call." : "Not quite."}</strong><p>${escapeHtml(response?.explanation || "")}</p></div>`;
  trackEvent("paid_scenario_completed", { scenario_id: currentProScenario.id, mock_id: currentMockId, correct });
  const bucket = planProgress.mocks[currentMockId];
  if (bucket) bucket.completed++;
  if (currentMockId !== "DRILL") planProgress.core.completed = Math.min(planProgress.core.total, planProgress.core.completed + 1);
  updateProProgressDisplay();
  action.disabled = false;
  const mockTotal = bucket?.total || MOCK_LENGTHS[currentMockId] || 40;
  const mockComplete = (bucket?.completed ?? proAttemptCount) >= mockTotal;
  action.innerHTML = mockComplete ? "View readiness report <span>→</span>" : "Next scenario <span>→</span>";
  action.onclick = mockComplete ? () => finishProLab() : () => renderNextProScenario();
}

function finishProLab() {
  clearInterval(timerId);
  const correct = proAnswers.filter(a => a.correct).length;
  const total = proAnswers.length || 1;
  const score = Math.round((correct / total) * 100);
  const domainScores = domains.map(d => {
    const results = proAnswers.filter(a => a.domain === d.id);
    return results.length ? Math.round(results.filter(a => a.correct).length / results.length * 100) : 0;
  });
  const result = { score, correct, domainScores, answers: [...proAnswers], total: proAnswers.length, date: new Date().toISOString(), mode: "pro", mockId: currentMockId };
  trackEvent("pro_lab_completed", { score, correct, total: proAnswers.length, mock_id: currentMockId });
  $("#quiz-progress-label").textContent = `${MOCK_LABELS[currentMockId] || "Pro lab"} complete`;
  $("#quiz-progress-bar").style.width = "100%";
  renderDetailedReport(result);
}

function expireProLab() {
  clearInterval(timerId);
  closeQuiz();
  localStorage.removeItem("gh600lab-session-token");
  const message = $("#pro-gate-message");
  if (message) message.textContent = "Your session expired — please re-enter your email and license key.";
  proGateDialog.showModal();
}

function renderReportGate(result) {
  quizBody.innerHTML = `
    <section class="quiz-results">
      <div class="result-score"><div class="score-ring" style="--score:${result.score}"><strong>${result.score}%</strong><span>Readiness</span></div><h2>${result.score >= 75 ? "You’re close." : "Good—now we know."}</h2><p>${result.correct} of ${result.total} decisions correct</p></div>
      <div class="report-gate"><span>YOUR DETAILED REPORT IS READY</span><h2>Unlock weak domains and your three-day study path.</h2><p>Enter your email to see all six domain scores, your weakest objective, and the recommended next move.</p><div class="report-teaser"><span>6 domain scores</span><span>weakest cluster</span><span>3-day plan</span></div><form id="report-email-form"><input type="email" id="report-email" placeholder="you@company.com" required><button class="button button-primary" type="submit">Show my report →</button></form></div>
    </section>`;
  $("#report-email-form").addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("#report-email").value.trim();
    const submit = event.submitter;
    if (submit) { submit.disabled = true; submit.textContent = "Saving…"; }
    saveLocalRecord("gh600lab-report-leads", { email, score: result.score, source: "diagnostic_report" });
    await captureLead({ email, current_score: result.score, source: "diagnostic_report", plan_interest: "founder" });
    if (result.attemptRequest) await result.attemptRequest;
    await apiRequest("/diagnostic/complete", { ...diagnosticPayload(result, email), attempt_id: result.attemptId });
    localStorage.setItem("gh600lab-report-email", email);
    trackEvent("email_captured", { source: "diagnostic_report", score: result.score });
    renderDetailedReport(result);
  });
}

function renderDetailedReport(result) {
  const minScore = Math.min(...result.domainScores);
  const weakest = domains[result.domainScores.indexOf(minScore)];
  const strongest = domains[result.domainScores.indexOf(Math.max(...result.domainScores))];
  quizBody.innerHTML = `
    <section class="quiz-results">
      <div class="result-score"><div class="score-ring" style="--score:${result.score}"><strong>${result.score}%</strong><span>Readiness</span></div><h2>${result.mode === "pro" ? "Full lab complete." : "Your report is unlocked."}</h2><p>${result.correct} of ${result.total} decisions correct</p></div>
      <div class="result-details"><span>YOUR READINESS MAP</span><h3>Focus next on ${weakest.name}.</h3><p class="result-summary">Strongest: ${strongest.name}. Weakest: ${weakest.name}. Your next three days should close the highest-impact gap before adding more breadth.</p>
        <div class="result-domain-list">${domains.map((d,i) => `<div class="result-domain" style="--domain-color:${d.color}"><span>${d.name}</span><div><i style="width:${result.domainScores[i]}%"></i></div><b>${result.domainScores[i]}%</b></div>`).join("")}</div>
        <div class="result-cram"><b>3-DAY STUDY PLAN</b><p><span>01</span> Review ${weakest.short} objectives and linked official documentation.</p><p><span>02</span> Retake missed artifact labs without notes.</p><p><span>03</span> Complete a timed mixed-domain run and review every distractor.</p></div>
        <div class="result-actions"><button class="button button-dark" id="retry-quiz">Retake ${result.mode === "pro" ? (MOCK_LABELS[result.mockId] || "Pro lab") : "diagnostic"}</button>${result.mode === "pro" ? '<button class="button button-outline-light" id="back-to-mocks">Choose another mock</button>' : '<button class="button button-primary" id="unlock-from-results">Buy founding access — $29 <span>→</span></button>'}</div>
      </div>
    </section>`;
  $("#retry-quiz").addEventListener("click", () => { if (result.mode === "pro") startProLab(result.mockId); else startQuiz(); });
  const backToMocks = $("#back-to-mocks");
  if (backToMocks) backToMocks.addEventListener("click", () => { closeQuiz(); openProGate(); });
  const unlockButton = $("#unlock-from-results");
  if (unlockButton) unlockButton.addEventListener("click", () => { trackEvent("founding_access_clicked", { source: "results" }); closeQuiz(); openAccess("founder"); });
}

function closeQuiz() {
  clearInterval(timerId);
  quizDialog.close();
  document.body.style.overflow = "";
}

$$('[data-start-quiz]').forEach(button => button.addEventListener("click", startQuiz));
$$("#pricing [data-start-quiz]").forEach(button => button.addEventListener("click", () => trackEvent("pricing_clicked", { plan: "free", source: "pricing" })));
$("#close-quiz").addEventListener("click", closeQuiz);
quizDialog.addEventListener("cancel", e => { e.preventDefault(); closeQuiz(); });

$$('[data-email-plan]').forEach(link => link.addEventListener("click", () => {
  trackEvent("pricing_clicked", {
    plan: link.dataset.emailPlan,
    source: link.closest("#pricing") ? "pricing" : "contact"
  });
}));

async function loadFoundingCount() {
  const meter = $("#founding-meter");
  if (!meter) return;

  const claimedEl = $("#founding-claimed");
  const progress = $("#founding-progress");
  const progressBar = $("#founding-progress-bar");
  const liveLabel = $("#founding-live-label");
  const source = $("#founding-source");
  const response = await apiRequest("/access/founding-count", {});

  if (!response?.ok || !Number.isFinite(response.claimed) || !Number.isFinite(response.limit)) {
    meter.classList.add("is-unavailable");
    liveLabel.textContent = "Founding access open";
    source.textContent = "Live count is temporarily unavailable. No estimate is shown.";
    return;
  }

  const limit = Math.max(1, Math.round(response.limit));
  const claimed = Math.min(limit, Math.max(0, Math.round(response.claimed)));
  const percent = Math.min(100, claimed / limit * 100);
  claimedEl.textContent = String(claimed);
  claimedEl.nextElementSibling.textContent = `/ ${limit}`;
  progressBar.style.width = `${percent}%`;
  progress.setAttribute("aria-valuemax", String(limit));
  progress.setAttribute("aria-valuenow", String(claimed));
  progress.setAttribute("aria-valuetext", `${claimed} of ${limit} founding memberships activated`);
  liveLabel.textContent = "Live from active members";
  source.textContent = "Updates from activated founding access. No invented numbers.";

  if (claimed >= limit) {
    $("#founding-meter-title").textContent = "The founding allocation is full.";
    $("#founding-count-label").textContent = "founding memberships activated";
    $$('[data-open-access][data-plan="founder"]').forEach(button => {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.textContent = "Founding access full";
    });
  }
}
void loadFoundingCount();

const accessDialog = $("#access-dialog");
function openAccess(plan = "founder") {
  $("#access-plan").value = plan;
  updatePlanFields();
  accessDialog.showModal();
}
function updatePlanFields() {
  const plan = $("#access-plan").value;
  const action = $("#access-form button[type='submit']");
  action.firstChild.textContent = plan === "pro" ? "Continue to Pro checkout " : "Continue to founding access ";
}
function closeAccess() { accessDialog.close(); }
$$('[data-open-access]').forEach(button => button.addEventListener("click", event => {
  const plan = button.dataset.plan || "founder";
  const source = button.closest("#pricing") ? "pricing" : "hero";
  if (window.handleCheckout?.(plan, source)) {
    event.preventDefault();
    return;
  }
  trackEvent("pricing_clicked", { plan, source });
  if (plan === "founder") trackEvent("founding_access_clicked", { source });
  openAccess(plan);
}));
$$('[data-close-access]').forEach(button => button.addEventListener("click", closeAccess));
$("#access-plan").addEventListener("change", updatePlanFields);
$("#access-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#access-email").value.trim();
  const plan = $("#access-plan").value;
  trackEvent("checkout_started", { plan });
  const submit = event.submitter;
  if (submit) { submit.disabled = true; submit.firstChild.textContent = "Preparing checkout… "; }
  const metadata = {};
  await captureLead({ email, plan_interest: plan, source: "checkout_intent", metadata });
  trackEvent("email_captured", { source: "checkout_intent", plan });
  const intent = await apiRequest("/checkout-intent", { email, plan, source_page: `${window.location.pathname}${window.location.search}`, metadata });
  const checkoutUrl = intent?.redirect_url || window.GH600_CHECKOUT?.[plan];
  if (checkoutUrl) {
    trackEvent("checkout_redirected", { plan, provider: intent?.provider || "local_config" });
    window.location.assign(checkoutUrl);
    return;
  }
  closeAccess();
  event.target.reset();
  updatePlanFields();
  showToast("Founding access reserved — checkout is being connected.");
  if (submit) submit.disabled = false;
});

const proGateDialog = $("#pro-gate-dialog");
const proAreaDialog = $("#pro-area-dialog");

function renderMockPicker(plan) {
  localStorage.setItem("gh600lab-plan", plan);
  const mocks = mocksForPlan(plan);
  const mockCount = mocks.filter(id => id !== "DRILL").length;
  $("#pro-area-kicker").textContent = plan === "founding_access" ? "PRO LAB · FOUNDING ACCESS" : "PRO LAB · FULL BANK";
  $("#pro-area-heading").textContent = mocks.includes("DRILL")
    ? `${mockCount} mock exams + targeted drills are unlocked.`
    : `${mockCount} mock exams are unlocked.`;
  $("#mock-picker").innerHTML = mocks.map(mockId => `<button class="button button-outline-light" data-mock="${mockId}">${MOCK_LABELS[mockId]} <span>→</span></button>`).join("")
    || `<p>No mock exams are included on this plan yet.</p>`;
  $$("[data-mock]", $("#mock-picker")).forEach(button => button.addEventListener("click", () => {
    proAreaDialog.close();
    startProLab(button.dataset.mock);
  }));
  fetchPlanProgress().then(progress => {
    $$("[data-mock]", $("#mock-picker")).forEach(button => {
      const mockId = button.dataset.mock;
      const bucket = progress.mocks[mockId];
      if (!bucket || !bucket.total) return;
      const status = bucket.completed >= bucket.total ? "Completed ✓" : bucket.completed > 0 ? "In progress" : "Not started";
      button.innerHTML = `${MOCK_LABELS[mockId]} <small>${status} · ${bucket.completed}/${bucket.total}</small><span>→</span>`;
    });
  });
}

async function openProGate() {
  const token = localStorage.getItem("gh600lab-session-token");
  if (token) {
    const response = await apiRequest("/access/session", { token });
    if (response?.ok) { renderMockPicker(response.plan); proAreaDialog.showModal(); return; }
    localStorage.removeItem("gh600lab-session-token");
  }
  proGateDialog.showModal();
}
$$('[data-open-pro]').forEach(button => button.addEventListener("click", openProGate));
$$('[data-close-pro]').forEach(button => button.addEventListener("click", () => proGateDialog.close()));
$$('[data-close-pro-area]').forEach(button => button.addEventListener("click", () => proAreaDialog.close()));
$("#pro-gate-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#pro-email").value.trim().toLowerCase();
  const code = $("#pro-code").value.trim().toUpperCase();
  trackEvent("pro_gate_attempted", { has_email: Boolean(email), code_length: code.length });
  const remote = await apiRequest("/access/verify", { email, code });
  if (!remote?.ok) {
    $("#pro-gate-message").textContent = "That email/license key pair isn't active — check the key from your Gumroad receipt.";
    return;
  }
  localStorage.setItem("gh600lab-session-token", remote.token);
  localStorage.setItem("gh600lab-pro-email", email);
  localStorage.setItem("gh600lab-known-email", email);
  trackEvent("pro_gate_unlocked", { plan: remote.plan });
  proGateDialog.close();
  renderMockPicker(remote.plan);
  proAreaDialog.showModal();
});

const issueDialog = $("#issue-dialog");
$$('[data-open-issue]').forEach(button => button.addEventListener("click", () => issueDialog.showModal()));
$$('[data-close-issue]').forEach(button => button.addEventListener("click", () => issueDialog.close()));
$("#issue-form").addEventListener("submit", async event => {
  event.preventDefault();
  const report = { email: $("#issue-email").value.trim(), message: $("#issue-text").value.trim(), path: `${window.location.pathname}${window.location.search}`, session_id: sessionId };
  saveLocalRecord("gh600lab-issues", report);
  await apiRequest("/issue-report", report);
  trackEvent("issue_reported", { path: report.path });
  issueDialog.close();
  event.target.reset();
  showToast("Issue saved — thank you for improving the lab.");
});

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

trackEvent("landing_viewed", { path: `${window.location.pathname}${window.location.search}`, ...attribution });

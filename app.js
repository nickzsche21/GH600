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
  { d:1, objective:"Define planning and action boundaries", artifact:{name:"agent-policy.yml",code:`mode: autonomous
plan:
  output: false
  approval_before_action: false
execution:
  target_branch: main`}, q:"A coding agent receives an issue and immediately edits the default branch before a maintainer sees its approach. The team wants speed but must prevent unreviewed architectural changes. What is the best first control?", a:["Require the agent to output a structured plan and block execution until that plan is approved","Shorten the issue template so the agent starts faster","Give the agent a larger context window","Run the same agent twice and compare the commits"], c:0, why:"Separating planning from execution creates a meaningful review gate before action. The plan must be structured and validated; more context or duplicate runs do not prevent an unsafe edit." },
  { d:1, objective:"Define measurable success criteria", q:"An agent closes dependency-update issues whenever the build passes, but some releases still break at runtime. Which task definition most improves its success criteria?", a:["Success means the pull request was created","Success means CI, targeted integration tests, and the deployment smoke check all pass","Success means the agent used fewer than ten tool calls","Success means a reviewer reacted with an emoji"], c:1, why:"Success criteria should reflect the development intent and operational outcome. A build alone is an incomplete proxy when runtime behavior matters." },
  { d:1, objective:"Produce inspectable artifacts", q:"A security team cannot reconstruct why an autonomous refactor changed an authorization rule. Which workflow change gives the strongest observability without stopping automation?", a:["Record the agent's plan, tool calls, diffs, test results, and approval in the pull request","Ask the agent to explain itself only if a bug is reported","Save the final chat transcript on a developer laptop","Disable autonomous refactoring entirely"], c:0, why:"Standard development artifacts—especially the pull request—should carry the plan, evidence, changes, and approval so the action remains inspectable and auditable." },
  { d:2, objective:"Configure least-privilege tool access", artifact:{name:"mcp.json",code:`{
  "repositories": ["*"],
  "permissions": ["repo:admin", "org:admin"],
  "allowed_actions": ["read", "pull_request"]
}`}, q:"A documentation agent only needs to read source files and open pull requests, but its MCP token can administer repositories. What should you do?", a:["Keep admin access because the agent is trusted","Scope the token to required repositories and only the read-content/create-PR permissions","Hide the token value in the system prompt","Add a second admin token for failover"], c:1, why:"Tool permissions should be scoped to the minimum actions and repositories required. Secret placement does not compensate for excessive authorization." },
  { d:2, objective:"Implement safe retries", q:"A deployment tool times out after sending a release request. The agent retries and occasionally creates two releases. What should the workflow implement first?", a:["A higher retry limit","An idempotency key plus state verification before retrying","A larger model","A second deployment agent"], c:1, why:"When the outcome is uncertain, retrying blindly is unsafe. Idempotency and state verification make repeated calls deterministic and prevent duplicate side effects." },
  { d:2, objective:"Scope execution environment", q:"An agent must fix a bug in one repository but its credentials can create branches across the entire organization. Which setup best contains the blast radius?", a:["Repository-scoped credentials, an isolated branch, and a pull-request-only path","Organization admin access with detailed logging","A global token that expires in one year","Direct pushes with branch names prefixed by agent/"], c:0, why:"Repository scope, branch isolation, and a reviewed PR path constrain both permission and execution context. Naming conventions and logging alone do not reduce authority." },
  { d:3, objective:"Choose an appropriate memory strategy", artifact:{name:"memory-record.json",code:`{
  "customer": "acme-42",
  "fact": "Approved exception",
  "scope": "global",
  "expires_at": null
}`}, q:"A triage agent must remember a customer's approved exception for 90 days across sessions, but unrelated customers must never influence each other. Which design fits?", a:["Keep all conversations in one long prompt","Use external, customer-scoped memory with an expiration rule","Store the exception in the model's system prompt","Rely on short-term conversation memory"], c:1, why:"The fact must persist across sessions, so short-term memory is insufficient. External memory should be scoped per customer and expire with the policy." },
  { d:3, objective:"Resume from durable state", q:"A long-running migration agent crashes after completing 73 of 100 repositories. How should it resume safely?", a:["Restart from repository one to verify everything","Load a durable checkpoint of completed work and verify the next pending repository","Ask the model to remember where it stopped","Infer progress from the current chat length"], c:1, why:"Durable checkpoints preserve progress and decisions outside transient context. Verification before the next action limits drift and repeated work." },
  { d:3, objective:"Prevent stale context", q:"An agent keeps recommending a retired deployment procedure because it remains in long-term memory. What is the best memory control?", a:["Increase retrieval top-k","Add provenance, freshness metadata, and pruning rules to memory","Copy the old procedure into every prompt","Disable all external memory"], c:1, why:"Persistent memory needs lifecycle controls. Provenance and freshness allow stale items to be detected, while pruning or expiration removes them intentionally." },
  { d:4, objective:"Select meaningful evaluation signals", artifact:{name:"evaluation.log",code:`build_passed=true
syntax_errors=0
acceptance_criteria_checked=false
review_findings=7
rollback_within_24h=true`}, q:"A pull-request agent produces syntactically valid patches that often misunderstand the issue. Which evaluation set is most useful?", a:["Token count and response length only","Issue acceptance criteria, relevant test outcomes, review findings, and rollback rate","Number of comments in the pull request","Average branch-name length"], c:1, why:"Evaluation must connect development intent with quality and operational outcomes. Cost metrics can supplement—but cannot replace—correctness and reliability signals." },
  { d:4, objective:"Classify root causes", q:"An agent chose the right remediation but called a production tool with a malformed parameter. Logs show its reasoning and retrieved context were correct. How should the failure be classified?", a:["Reasoning failure","Tool misuse or interface failure","Memory drift","Multi-agent conflict"], c:1, why:"The decision was correct and context was sound; the failure occurred at tool invocation. Correct classification prevents unnecessary prompt or memory changes." },
  { d:4, objective:"Tune from evidence", q:"Evaluation traces show an agent succeeds until retrieved documents exceed the context budget, after which it ignores the latest policy. What is the best tuning move?", a:["Make the system prompt longer","Improve retrieval filtering and context prioritization, then rerun the evaluation","Increase agent autonomy","Add more unrelated examples"], c:1, why:"The evidence identifies context overload. Selective retrieval and prioritization address that root cause; additional prompt content would worsen it." },
  { d:5, objective:"Isolate parallel execution", artifact:{name:"orchestrator.yml",code:`agents: [security-fix, dependency-fix]
workspace: /tmp/shared
branch: main
file_ownership_check: false`}, q:"Two agents work on independent issues but both modify the same workflow file in a shared checkout. Conflicts appear late and waste both runs. What should change?", a:["Give both agents the same branch so they see changes sooner","Use isolated branches/workspaces and detect overlapping file ownership before execution","Let the faster agent overwrite the slower one","Disable all parallel work"], c:1, why:"Parallel agents need isolated execution plus early conflict detection. This preserves concurrency while making overlapping ownership explicit." },
  { d:5, objective:"Document handoffs", q:"A planning agent hands work to an implementation agent, which repeatedly revisits already-rejected designs. What artifact should the handoff include?", a:["Only the final task title","Structured decisions, constraints, rejected alternatives, acceptance criteria, and current state","The planner's entire unfiltered conversation","A request to start from scratch"], c:1, why:"A concise, durable handoff prevents duplicated reasoning and contradictory outputs while avoiding the noise and stale material of a full transcript." },
  { d:5, objective:"Recover degraded workflows", q:"In a three-agent pipeline, the reviewer stalls while the implementer continues opening new changes. What is the safest recovery pattern?", a:["Allow unlimited pending reviews","Pause dependent work, preserve artifacts, retry or replace the reviewer, then escalate if the threshold is exceeded","Delete all branches and restart immediately","Ask the implementer to approve its own work"], c:1, why:"Recovery should contain downstream impact, preserve evidence, attempt bounded recovery, and retain a human escalation path." },
  { d:6, objective:"Right-size human intervention", artifact:{name:"guardrails.yml",code:`actions:
  format_code: auto
  rotate_prod_secret: auto
  delete_cloud_resource: auto
audit_log: true`}, q:"A maintenance agent can format code, rotate production secrets, and delete cloud resources. Which autonomy policy is best?", a:["Require approval for every action","Allow all actions because logs exist","Auto-approve reversible formatting; require explicit authorization for secrets and destructive infrastructure actions","Block the agent from formatting code"], c:2, why:"Autonomy should be proportional to risk. Low-risk reversible work can stay fast, while security-sensitive or irreversible actions require explicit control." },
  { d:6, objective:"Enforce controlled execution paths", q:"An agent identifies a critical production fix at 2 a.m. Company policy requires two-person approval for production changes. What should happen?", a:["The agent bypasses policy because severity is critical","The agent prepares the patch and evidence, then waits in the controlled approval path","The agent uses a personal token to deploy","The agent edits the audit log to mark approval"], c:1, why:"Urgency does not remove compliance requirements. The agent can accelerate preparation and evidence while the protected production path enforces authorization." },
  { d:6, objective:"Preserve accountability", q:"A team uses one shared service identity for five agents, making it impossible to attribute destructive actions. Which change best restores accountability?", a:["Give every agent the shared password","Use distinct workload identities and immutable action logs","Store the shared token in a more secure vault","Ask agents to include their names in commit messages"], c:1, why:"Distinct identities provide reliable attribution; immutable logs preserve the record. A protected shared credential is still unable to distinguish actors." }
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

async function startProLab(mockId) {
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
  await renderNextProScenario();
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
  const mockLength = MOCK_LENGTHS[currentMockId] || 40;
  $("#quiz-progress-label").textContent = `${MOCK_LABELS[currentMockId] || "Pro lab"} · scenario ${proAttemptCount}`;
  $("#quiz-progress-bar").style.width = `${Math.min(100, (proAttemptCount / mockLength) * 100)}%`;
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
  action.disabled = false;
  const mockLength = MOCK_LENGTHS[currentMockId] || 40;
  const mockComplete = proAttemptCount >= mockLength;
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
  if (message) message.textContent = "Your session expired — please re-enter your email and access code.";
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

const accessDialog = $("#access-dialog");
function openAccess(plan = "founder") {
  $("#access-plan").value = plan;
  updatePlanFields();
  accessDialog.showModal();
}
function updatePlanFields() {
  const plan = $("#access-plan").value;
  $("#team-fields").hidden = plan !== "team";
  $("#cram-fields").hidden = plan !== "cram";
  const action = $("#access-form button[type='submit']");
  action.firstChild.textContent = plan === "team" ? "Reserve team pack " : plan === "cram" ? "Request cram slot " : plan === "pro" ? "Continue to Pro checkout " : "Continue to founding access ";
}
function closeAccess() { accessDialog.close(); }
$$('[data-open-access]').forEach(button => button.addEventListener("click", () => {
  const plan = button.dataset.plan || "founder";
  trackEvent("pricing_clicked", { plan, source: button.closest("#pricing") ? "pricing" : "hero" });
  if (plan === "founder") trackEvent("founding_access_clicked", { source: button.closest("#pricing") ? "pricing" : "hero" });
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
  const metadata = plan === "team" ? {
    company: $("#team-company").value.trim(),
    team_size: Number($("#team-size").value) || null,
    message: $("#team-message").value.trim()
  } : plan === "cram" ? {
    preferred_time: $("#cram-time").value.trim(),
    exam_date: $("#cram-exam-date").value,
    weak_area: $("#cram-weak-area").value.trim()
  } : {};
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
  showToast(plan === "team" || plan === "cram" ? "Request saved — I’ll follow up personally." : "Founding access reserved — checkout is being connected.");
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
    $("#pro-gate-message").textContent = "That email/code pair is not active. Check the code or contact support.";
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

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const app = readFileSync(resolve(root, "app.js"), "utf8");
const diagnosticUtils = readFileSync(resolve(root, "diagnostic-utils.js"), "utf8");

test("all local page assets exist", () => {
  const assets = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
    .map(match => match[1])
    .filter(value => !/^(?:https?:|mailto:)/.test(value));
  for (const asset of assets) assert.equal(existsSync(resolve(root, asset)), true, `${asset} should exist`);
});

test("backend config loads before the application", () => {
  assert.ok(html.indexOf('src="backend-config.js"') < html.indexOf('src="app.js'));
});

test("legal pages are linked from the public site and exist", () => {
  for (const route of ["terms", "privacy", "refunds"]) {
    assert.match(html, new RegExp(`href="${route}\\/"`));
    assert.equal(existsSync(resolve(root, route, "index.html")), true, `${route}/index.html should exist`);
  }
});

test("header exposes factual product proof and a mobile diagnostic CTA", () => {
  assert.match(html, /300 original scenarios · 6 domains/);
  assert.match(html, /mobile-header-cta[^>]*data-start-quiz/);
  assert.doesNotMatch(html, /18<\/strong><span>original scenarios live/);
});

test("diagnostic answer positions are balanced instead of inheriting authored B-heavy indexes", () => {
  assert.match(app, /buildBalancedDiagnostic\(domains, authoredQuestions\)/);
  assert.match(diagnosticUtils, /\[0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3\]/);
  assert.match(app, /scenarioId: `gh600-\$\{index \+ 1\}`/);
  assert.match(app, /scenario_id: item\.scenarioId/);
  assert.doesNotMatch(app, /questions\.indexOf\(item\)/);
});

test("front end calls every revenue endpoint", () => {
  for (const route of ["/lead", "/event", "/diagnostic/complete", "/checkout-intent", "/access/verify", "/access/session", "/access/founding-count", "/issue-report"]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("team and cram offers route directly to the published support email", () => {
  assert.match(html, /mailto:nikhil211884@gmail\.com\?subject=GH600%20Lab%20Team/);
  assert.match(html, /mailto:nikhil211884@gmail\.com\?subject=GH600%20Lab%20urgent%20cram/);
  assert.match(html, /id="contact"/);
  assert.match(html, /No invented numbers/);
  assert.doesNotMatch(html, /Manager readiness snapshot/);
  assert.doesNotMatch(html, /Domain-level team gaps/);
});

test("server credential name is absent from browser assets", () => {
  const publicBundle = ["index.html", "app.js", "diagnostic-utils.js", "backend-config.js", "checkout-config.js", "access-config.js"]
    .map(file => readFileSync(resolve(root, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(publicBundle, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(publicBundle, /GUMROAD_ACCESS_TOKEN/);
});

test("no secret-shaped values leak into browser assets", () => {
  const publicBundle = ["index.html", "app.js", "diagnostic-utils.js", "backend-config.js", "checkout-config.js", "access-config.js"]
    .map(file => readFileSync(resolve(root, file), "utf8"))
    .join("\n");
  const secretShapes = [
    /sbp_[a-f0-9]{40}/,
    /sk_live_/,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT shape (e.g. service-role keys)
    /"role"\s*:\s*"service_role"/,
    /pdl_live_/,
    /pdl_sdbx_/
  ];
  for (const pattern of secretShapes) assert.doesNotMatch(publicBundle, pattern, `matched forbidden secret shape: ${pattern}`);
});

test("no wildcard DEMO-ACCESS code is reachable from a deployable build", () => {
  const accessConfig = readFileSync(resolve(root, "access-config.js"), "utf8");
  assert.doesNotMatch(accessConfig, /email:\s*"\*"/);
  assert.doesNotMatch(accessConfig, /DEMO-ACCESS/);
});

test("pro gate stores a server-issued session token, not a boolean flag", () => {
  assert.doesNotMatch(app, /gh600lab-pro-access["'],\s*"granted"/);
  assert.match(app, /gh600lab-session-token/);
});

test("diagnostic and Pro-lab rendering escape server/authored content before it hits innerHTML", () => {
  assert.match(app, /const escapeHtml = /);
  // Diagnostic path (renderQuestion): prompt, options, artifact name/code, objective, explanation.
  assert.match(app, /<h2>\$\{escapeHtml\(item\.q\)\}<\/h2>/);
  assert.match(app, /<b>\$\{escapeHtml\(answer\)\}<\/b>/);
  assert.match(app, /<span>\$\{escapeHtml\(item\.artifact\.name\)\}<\/span>/);
  assert.match(app, /<code>\$\{escapeHtml\(item\.artifact\.code\)\}<\/code>/);
  assert.match(app, /<h4>\$\{escapeHtml\(item\.objective\)\}<\/h4>/);
  assert.match(app, /<p>\$\{escapeHtml\(item\.why\)\}<\/p>/);
  // Pro-lab path (renderNextProScenario): same fields off the server scenario object.
  assert.match(app, /<h2>\$\{escapeHtml\(currentProScenario\.prompt\)\}<\/h2>/);
  assert.match(app, /<h4>\$\{escapeHtml\(currentProScenario\.objective\)\}<\/h4>/);
  assert.match(app, /escapeHtml\(response\?\.explanation/);
});

test("Pro-lab scenario delivery distinguishes an exhausted mock from an expired/invalid session", () => {
  assert.match(app, /if \(response\?\.done\)/);
  assert.match(app, /function expireProLab/);
});

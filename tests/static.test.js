import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const app = readFileSync(resolve(root, "app.js"), "utf8");

test("all local page assets exist", () => {
  const assets = [...html.matchAll(/(?:src|href)="([^"#?]+)"/g)]
    .map(match => match[1])
    .filter(value => !/^https?:/.test(value));
  for (const asset of assets) assert.equal(existsSync(resolve(root, asset)), true, `${asset} should exist`);
});

test("backend config loads before the application", () => {
  assert.ok(html.indexOf('src="backend-config.js"') < html.indexOf('src="app.js"'));
});

test("front end calls every revenue endpoint", () => {
  for (const route of ["/lead", "/event", "/diagnostic/complete", "/checkout-intent", "/access/verify", "/access/session", "/issue-report"]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("server credential name is absent from browser assets", () => {
  const publicBundle = ["index.html", "app.js", "backend-config.js", "checkout-config.js", "access-config.js"]
    .map(file => readFileSync(resolve(root, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(publicBundle, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("no secret-shaped values leak into browser assets", () => {
  const publicBundle = ["index.html", "app.js", "backend-config.js", "checkout-config.js", "access-config.js"]
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

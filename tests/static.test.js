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
  for (const route of ["/lead", "/event", "/diagnostic/complete", "/checkout-intent", "/access/verify", "/issue-report"]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("server credential name is absent from browser assets", () => {
  const publicBundle = ["index.html", "app.js", "backend-config.js", "checkout-config.js", "access-config.js"]
    .map(file => readFileSync(resolve(root, file), "utf8"))
    .join("\n");
  assert.doesNotMatch(publicBundle, /SUPABASE_SERVICE_ROLE_KEY/);
});

// One-time seed: migrates the 18 Pro-lab scenarios out of the (removed) inline
// app.js bundle and into the `scenarios` table. Run once per environment:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-scenarios.js
// Safe to re-run: skips any scenario whose title already exists.
import scenarios from "./scenario-data.js";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

async function restRequest(path, options) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(options?.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

for (const scenario of scenarios) {
  const existing = await restRequest(`scenarios?title=eq.${encodeURIComponent(scenario.title)}&limit=1`);
  if (existing.length) {
    console.log(`skip (exists): ${scenario.title}`);
    continue;
  }
  await restRequest("scenarios", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(scenario)
  });
  console.log(`inserted: ${scenario.title}`);
}
console.log("Done.");

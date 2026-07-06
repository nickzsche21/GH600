// One-time (re-runnable) import of the validated 300-scenario premium bank
// into public.gh600_scenarios_v2. This is the Pro lab's content source as of
// docs/plans/premium-bank-300.md — see docs/history/schema-migrations.md.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-scenarios-v2.js
// Safe to re-run: upserts by `id` (Prefer: resolution=merge-duplicates).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const scenarios = JSON.parse(readFileSync(resolve(here, "data/gh600-scenarios-v2.json"), "utf8"));

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const BATCH_SIZE = 50;

async function upsertBatch(batch) {
  const response = await fetch(`${url}/rest/v1/gh600_scenarios_v2?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/json",
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(batch)
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
}

for (let i = 0; i < scenarios.length; i += BATCH_SIZE) {
  const batch = scenarios.slice(i, i + BATCH_SIZE);
  await upsertBatch(batch);
  console.log(`upserted ${Math.min(i + BATCH_SIZE, scenarios.length)}/${scenarios.length}`);
}
console.log(`Done. ${scenarios.length} rows upserted into gh600_scenarios_v2.`);

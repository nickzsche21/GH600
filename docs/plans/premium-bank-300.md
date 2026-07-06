# GH600 — Ship the 300-Scenario Premium Bank (All-in-One-Shot)

## Context

The Pro lab currently serves **18** scenarios from the repo `scenarios` table
(`scripts/seed-scenarios.js` → `api/scenarios/next.js`/`answer.js`). We have a **validated,
import-ready 300-scenario premium bank** at
`~/Downloads/gh600_scenario_bank_v2_300_premium 2/` (VALIDATION_REPORT: `RESULT: PASS`, 0
errors/warnings, 0 recalled/unauthorized flags) — six 40-question mocks + 60 drills, tiered
`free_diagnostic` (12) / `founder` (108) / `pro` (180), in its own richer table
`gh600_scenarios_v2`. All 300 rows are `needs_sme_review` (structural validity ≠ editorial
approval).

**Decision locked:** adopt the v2 table (keep its mock/tier structure) and enable the full
bank at once (no incremental `review_status` gate), served by a **three-tier access model**:

| Tier | Plan (`plans.js` id) | Content served | `plan_required` rows | Source |
|---|---|---|---|---|
| **Free** | (no entitlement) | 12 diagnostic questions | — | inline `app.js` bank (unchanged) |
| **Founder** | `founding_access` ($29) | 120 questions · **MOCK_1–3** | `free_diagnostic` + `founder` | `gh600_scenarios_v2` |
| **Pro** | `pro` (**NEW plan**) | 300 questions · **MOCK_1–6 + drills** | `free_diagnostic` + `founder` + `pro` | `gh600_scenarios_v2` |

(`team_pack` uses the Pro content set, per the bank README.) This matches the bank's own
tiering exactly: Founder = the 12 free-diagnostic rows + 108 founder rows (MOCK_1–3); Pro =
all 300 (MOCK_1–6 + the 60 drills).

**Free stays inline.** The public free 12 remains the hand-authored `app.js` lead-magnet
bank (intentionally public); the v2 `free_diagnostic` rows are only used *inside* the paid
Founder/Pro sets. No change to the free flow.

**This adds a new `pro` plan** — so per `CLAUDE.md` "Adding a plan or price?" it touches
`api/_lib/plans.js`, `.env.example` (`PADDLE_PRICE_PRO` / `PADDLE_CHECKOUT_PRO`), the
Paddle dashboard (new product/price), and the launch-plan/PRD pricing section.
**Pro price is an open decision** (PRD §11 pencils the standard individual price at **$49
one-time** — recommended default).

**Deliberate trade-off (call it out, per `CLAUDE.md`):**
- Rule 6 ("no test-bank inflation without demand") and PRD §15/§30 say approve-then-serve.
  Serving all 300 unreviewed accepts the risk that a wrong answer key / weak distractor
  reaches a paying user → refund/trust exposure. The bank ships every row as
  `needs_sme_review`; we are choosing to serve regardless. The **one** hard guarantee we
  keep: the table's `check (contains_recalled_or_unauthorized_exam_content = false)` stays,
  so no unauthorized/recalled content is ever served.
- **Kill-switch confirmed (locked):** delivery filters `review_status = not.eq.rejected`, so
  a bad row is pulled with a one-field `review_status = 'rejected'` update — reversible
  per-row, no deploy. The issue-report flow already feeds this.

**Surfaces touched (revenue-flow change + new plan — `CLAUDE.md` "state every surface"):**
Supabase (`gh600_scenarios_v2`, `scenario_attempts`, `supabase/schema.sql`) ·
`api/scenarios/next.js` + `answer.js` · `api/_lib/plans.js` (**new `pro` plan** +
content-tier map) · `.env.example` (`PADDLE_PRICE_PRO`, `PADDLE_CHECKOUT_PRO`) ·
`api/checkout-intent.js` (already provider-generic — just resolves the new plan) · `app.js`
(scenario cap / mock run, artifact already handled server-side; landing-page Pro CTA) ·
docs (`data-model.md`, `api-contracts.md`) · `README.md` + `GH600-Lab-Launch-Plan.md` /
PRD §11 (three tiers, content counts, Pro price) · tests.

---

## Phase 1 — Import the validated bank into Supabase

Source: `~/Downloads/gh600_scenario_bank_v2_300_premium 2/` (already `RESULT: PASS`).

- Run **`GH600_SCENARIO_BANK_V2_ONE_CLICK.sql`** (schema + 300-row seed in one file; or the
  separate `supabase_schema.sql` then `supabase_seed.sql`) in the Supabase SQL editor.
  Confirm final count = **300**. Re-runnable (upsert by `id`). RLS is enabled with no public
  policy — matches our service-role-only posture, no change needed.
- Mirror the DDL into **`supabase/schema.sql`** (append `create table if not exists
  public.gh600_scenarios_v2 …` verbatim from the bank) so our schema file stays the source
  of truth and a fresh environment rebuilds identically. Add a note in
  `docs/history/schema-migrations.md`.
- Re-validate if the pack is ever modified: `python validate_question_bank.py` must end
  `RESULT: PASS` before import.

## Phase 2 — Repoint + adapt server delivery (the real work)

The v2 columns don't match the client contract, so `next.js`/`answer.js` query
`gh600_scenarios_v2` and **map** fields. Add one small helper
**`api/_lib/scenario-map.js`** with `toClientScenario(row)` and `gradingFields(row)`:

| Client/grading field expected | v2 source column | Mapping |
|---|---|---|
| `id` | `id` (text) | as-is (opaque string — client already treats it as a string) |
| `primary_domain` (int 1–6) | `domain_code` `D1`–`D6` | `Number(domain_code.slice(1))` |
| `objective` | `subskill` | as-is |
| `difficulty` | `difficulty` | as-is |
| `prompt` | `prompt` | as-is |
| `options` (array[4]) | `options` | as-is |
| `artifact_type` / `artifact_content` | `artifact_type` + `artifact` | if `artifact` present → `artifact_type:"code"`, `artifact_content: JSON.stringify({ name: row.artifact_type, code: row.artifact })`; else both null (matches the `{name,code}` shape `app.js:320-321,334` parses) |
| `version` | `created_version` (`"v2"`) | store `scenario_version` as text; **change `scenario_attempts.scenario_version` to `text`** |
| `correct_index` (grading only) | `correct_option_index` | as-is (never sent by `next.js`) |
| `correct_explanation` | `explanation` | as-is |
| `distractor_explanations` (by index) | `wrong_answer_explanations` (keys `A`/`B`/`C`) | remap letter→numeric index (`A`→0…), skipping the correct index |
| `decision_principle` | — | `null` (v2 folds this into `explanation`) |

- **`api/scenarios/next.js`**: query `gh600_scenarios_v2` instead of `scenarios`; keep the
  "exclude already-attempted `session_id`" logic (now matching on text `scenario_id`);
  return `toClientScenario(row)` (answer key still stripped — `next.js` only returns the
  mapped public fields). **Add plan-tier gating** (Phase 3).
- **`api/scenarios/answer.js`**: fetch the v2 row, grade with `gradingFields(row)`
  (`correct_option_index`, mapped explanations), write the attempt. `scenario_id` is now
  text.
- **`scenario_attempts`** (`supabase/schema.sql`): change `scenario_id uuid references
  scenarios(id)` → `scenario_id text` (drop the FK, or repoint to
  `gh600_scenarios_v2(id)`); `scenario_version` → `text`. Old dev rows are throwaway.
- **Retire the legacy path**: `scripts/seed-scenarios.js` + `scripts/scenario-data.js` +
  the repo `scenarios` table are no longer the Pro source. Leave the `scenarios` table in
  schema for now (harmless) but stop seeding it; note it deprecated in `data-model.md`.

## Phase 3 — Add the Pro plan + tier gating (who gets which rows)

**Add a new `pro` plan** to **`api/_lib/plans.js`** (mirrors the `founder` shape; Paddle
provider; price per open decision, default $49):

```js
const pro = {
  id: "pro", label: "Pro", amount: 49, currency: "USD", provider: "paddle",
  checkoutEnv: "PADDLE_CHECKOUT_PRO", priceEnv: "PADDLE_PRICE_PRO", legacyEnv: null
};
// register aliases: pro
```

Prices locked: **Founder $29** (existing `founding_access`, unchanged) · **Pro $49** (new).

Then a content-tier map (delivery must respect the buyer's plan so we never hand `pro`
rows to a `founder` buyer):

```js
// content tiers a given entitlement plan may be served, widest first
export function contentTiers(planId) {
  switch (planId) {
    case "pro":
    case "team_pack":       return ["free_diagnostic", "founder", "pro"]; // 300 · MOCK_1–6 + drills
    case "founding_access": return ["free_diagnostic", "founder"];        // 120 · MOCK_1–3
    default:                return [];                                    // free tier is inline, not v2
  }
}
```

`next.js` adds `plan_required: in.(<tiers>)` **and `review_status: not.eq.rejected`** to the
`gh600_scenarios_v2` query, tiers from `contentTiers(session.plan)`; an empty list ⇒ no paid
rows (defensive). Add the Paddle env vars to `.env.example` and create the Pro product/price
in the Paddle dashboard.

**`checkout-intent.js`** already resolves any plan generically, so `?plan=pro` works once
the plan exists — just wire a Pro CTA/`data-plan="pro"` button on the landing page.

## Phase 4 — Mock-based delivery (`api/scenarios/next.js` + `app.js`)

Because the tiers are *defined by mocks* (Founder = 3 mocks, Pro = 6 mocks + drills), a run
= **one mock** (40 questions), not a single 300-question sitting. Make the mock a
first-class unit rather than an uncapped stream:

- **`api/scenarios/next.js`**: accept an optional `mock_id`; when present, filter
  `mock_id = eq.<id>` and order by `mock_position`, still excluding already-attempted rows
  for this `session_id`. Enforce that the requested `mock_id` is within
  `contentTiers(session.plan)` (a Founder token requesting `MOCK_5` → 403/`done`). Drills
  (`mock_id='DRILL'`) are Pro-only.
- **`app.js`**: add a **mock picker** in the Pro-area dialog listing the mocks the buyer's
  tier unlocks (Founder → MOCK_1–3; Pro → MOCK_1–6 + a Drills option). Selecting one calls
  `startProLab(mockId)` which passes `mock_id` to `/scenarios/next`. Replace the fixed
  `PRO_LAB_MAX_SCENARIOS` cap with "run until this mock's rows are exhausted or the timer
  ends"; the progress bar uses the mock's length (40). Show which mock is in progress.
- No answer-key exposure changes — grading stays server-side in `/scenarios/answer`.

*(A lighter fallback, if the mock picker is too much for this pass: keep the single
one-at-a-time stream capped at 40 per session and ignore `mock_id`. But since the tiers are
sold as "3 mocks / 6 mocks," the picker is what makes the purchased structure real — do it
here unless we explicitly defer it.)*

## Phase 5 — Docs, tests, claims

- **`docs/engineering/data-model.md`**: add the `gh600_scenarios_v2` row (columns, tiering,
  answer-key never client-exposed); mark repo `scenarios` deprecated; note
  `scenario_attempts.scenario_id/version` type change.
- **`docs/engineering/api-contracts.md`**: update `/scenarios/next` + `/scenarios/answer`
  (new source table, tier gating, mapped response shape).
- **`README.md` + `GH600-Lab-Launch-Plan.md` / PRD §11**: document the three tiers
  precisely — Free = 12 diagnostic · Founder ($29) = 120 / 3 mocks · Pro ($49) = 300 /
  6 mocks + drills; state exactly what each plan unlocks (truth-in-advertising per PRD §9
  "must not promise"). Add the `pro` plan to the pricing section. Update the §25
  verification matrix rows.
- **Tests**: update `tests/*` scenario cases to the v2 shape; add a unit test for
  `toClientScenario`/`gradingFields` (letter→index remap, D-code→int, artifact wrapping);
  assert `next.js` never returns `correct_option_index`/`explanation`; assert tier gating
  filters `plan_required`.

---

## Verification

1. **Import**: `gh600_scenarios_v2` has 300 rows; `validate_question_bank.py` = PASS.
2. **`npm test`** green, including the new mapping + tier-gating tests.
3. **End-to-end (vercel dev)**: mint a session token (admin grant or code redeem), hit
   `/api/scenarios/next` repeatedly → get mapped scenarios, never an answer key; submit via
   `/api/scenarios/answer` → correct grading + explanation. **Tier check:** a
   `founding_access` token gets only MOCK_1–3 rows and is refused MOCK_4–6/drills; a `pro`
   (or `team_pack`) token gets all six mocks + drills.
4. **Reversibility check**: set one row `review_status='rejected'` (if we keep that filter)
   or flip a `published`/serve flag → it stops appearing on the next `/scenarios/next`, no
   deploy.
5. **Answer-key leak check**: `grep` the `/scenarios/next` JSON and page source — no
   `correct_option_index`, `explanation`, or `wrong_answer_explanations`.

## Decisions — all locked

- **Tiers:** Free = 12 diagnostic (inline) · Founder `founding_access` **$29** = 120 /
  MOCK_1–3 · Pro `pro` (new) **$49** = 300 / MOCK_1–6 + drills · `team_pack` = Pro content.
- **Review kill-switch:** yes — delivery filters `review_status = not.eq.rejected`; all 300
  serve now, a bad row is pulled with a one-field update.
- **Mock picker:** build it (Phase 4) — the tiers are sold as "3 mocks / 6 mocks + drills,"
  so a run = one mock.
- **Source:** validated pack at `~/Downloads/gh600_scenario_bank_v2_300_premium 2/`.

No open decisions remain — ready to execute.

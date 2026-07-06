# Data model

## Supabase tables (`supabase/schema.sql`)

All tables have RLS enabled with **no public policies** — every read/write
goes through a Vercel API function using the service-role key
(`api/_lib/supabase.js`). Don't add a public policy; add an API endpoint.

| Table | Purpose | Written by | Read by |
|---|---|---|---|
| `leads` | Email capture (report gate, checkout intent) | `api/lead.js` | founder (SQL editor) |
| `analytics_events` | Every `trackEvent()` call | `api/event.js` | founder (SQL editor) |
| `diagnostic_attempts` | Quiz scores + domain breakdown | `api/diagnostic/complete.js` | founder (SQL editor) |
| `payment_intents` | Checkout attempts, resolved plan/amount/provider, redirect status | `api/checkout-intent.js` | founder (SQL editor) |
| `access_codes` | Manually issued Pro-lab unlock codes | founder (SQL editor, manual insert), `redeem_access_code`/`register_failed_code` RPCs | `api/access/verify.js` |
| `issue_reports` | User-submitted bug/issue text | `api/issue-report.js` | founder (SQL editor) |
| `purchases` | A *confirmed* payment (Paddle webhook or Wise/manual admin grant) — distinct from the pre-payment `payment_intents` row | `api/_lib/entitlements.js` (`recordPurchase`) | `api/webhooks/paddle.js`, `api/admin/grant.js` |
| `entitlements` | Source-agnostic paid access derived from a purchase or a redeemed code | `api/_lib/entitlements.js` (`grantEntitlement`/`revokeEntitlement`) | `api/access/session.js`, `api/admin/revoke.js` |
| `access_sessions` | The revocable record behind a Pro-lab session token — only a SHA-256 hash of the token is stored, never the raw value | `api/_lib/entitlements.js` (`issueSession`) | `api/_lib/entitlements.js` (`verifySession`) |
| `scenarios` | **Deprecated** — the original 18-scenario table, superseded by `gh600_scenarios_v2`. Kept for history; no longer seeded or queried. | — | — |
| `gh600_scenarios_v2` | The 300-scenario premium bank (prompt, options, answer key, `plan_required` tier, `mock_id`/`mock_position`) — paid content, never selected into a client-facing response in full | imported via `scripts/seed-scenarios-v2.js` | `api/scenarios/next.js` (strips answer key via `api/_lib/scenario-map.js`), `api/scenarios/answer.js` (grades) |
| `scenario_attempts` | Per-scenario Pro-lab attempt log, keyed by the anonymous browser `session_id` (not the auth token); `scenario_id`/`scenario_version` are `text` (v2 uses opaque string ids, not uuids) | `api/scenarios/answer.js` | founder (SQL editor) |

Key columns to know before writing a migration:
- `access_codes.max_uses` / `uses` / `expires_at` / `active` /
  `failed_attempts` / `locked_until` — gate validity via the
  `redeem_access_code` RPC (atomic `UPDATE ... RETURNING`, no
  read-then-write race) and `register_failed_code` (locks a code for 15
  minutes after 5 failed attempts).
- `purchases` has a **unique `(provider, provider_payment_id)`** — this is
  the webhook idempotency key; redelivery never double-grants.
- `entitlements.source_purchase_id` makes `grantEntitlement()` idempotent
  per purchase; manual/Wise grants without a purchase use `(source,
  metadata->>reference)` instead (see `api/admin/grant.js`).
- `access_sessions.token_hash` is the **only** thing stored for a session
  token — the raw token is returned once and never persisted. Revoking an
  entitlement (`revokeEntitlement()`) also flips every linked session's
  `revoked` flag.
- `diagnostic_attempts` stores `answers` as raw `jsonb` (array, capped at
  100 entries in `attemptPayload()`) — not normalized into rows.
- `metadata` columns are free-form `jsonb`, sanitized by `safeMetadata()`
  (10KB cap, non-object values coerced to `{}`).

Indexes exist for the lookup patterns actually used: email lookups
(`lower(email)`), session-ordered event/attempt history, active access
codes, active entitlements, and unrevoked session tokens. Add an index
only when a new query pattern needs one.

## Free diagnostic content (`app.js`, not a database table)

`domains` (6 fixed exam domains with id/short/name/weight/color/desc) and
`questions` (one object per scenario: `d` domain id, optional `artifact`
{name, code}, `q`, `a` (answer array), `c` (correct index), `why`
(explanation)) remain hand-authored arrays at the top of `app.js` — this
is the free 12-question lead magnet (`buildDiagnostic()` picks 2 per
domain), intentionally public.

The **paid** Pro lab no longer reads from this array or ships in `app.js`
at all — it lives in `public.gh600_scenarios_v2` (300 scenarios: six
40-question mocks + 60 drills, tiered `free_diagnostic`/`founder`/`pro` via
`plan_required`) and is served one question at a time via
`/api/scenarios/next` + `/api/scenarios/answer` (see
`docs/engineering/api-contracts.md`). See
`docs/history/schema-migrations.md` for why v2 replaced the original
18-scenario `scenarios` table, and `docs/plans/premium-bank-300.md` for
the full tiering/mock-picker design.

- **`api/_lib/scenario-map.js`** is the only place that translates
  `gh600_scenarios_v2` columns into the client-facing shape
  (`toClientScenario`, strips the answer key) and the grading shape
  (`gradingFields`, remaps `wrong_answer_explanations` letter keys
  A/B/C/D → numeric option indices).
- **`api/_lib/plans.js`** owns `contentTiers(planId)` (which
  `plan_required` values a plan may be served) and `allowedMocks(planId)`
  (which `mock_id` values a plan may request) — Founder = `MOCK_1`–`3`,
  Pro/Team = `MOCK_1`–`6` + `DRILL`. Every query in
  `api/scenarios/*.js` goes through these, never a hand-rolled tier check.
- **Review kill-switch:** every v2 row imports as `review_status =
  'needs_sme_review'` and is served anyway (accepted risk, not an
  oversight — see `CLAUDE.md` rule 6). `api/scenarios/next.js` filters
  `review_status = not.eq.rejected`, so pulling a bad row from delivery is
  a one-column `UPDATE`, no deploy.

Adding a question to the free bank means editing the `app.js` array
directly (small, hand-authored, occasional). Adding to the paid v2 bank
means regenerating/re-validating the source pack and re-running
`scripts/seed-scenarios-v2.js` (it upserts by `id`) — see
`GH600-Lab-Launch-Plan.md` ("Quality moat") for the review bar: objective
ID, source link, two-reviewer agreement.

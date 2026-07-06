# Schema Migrations

All migrations are timestamped SQL files in `supabase/migrations/` and pushed
via `supabase db push`. Migration files are idempotent (`create table if not exists`,
`alter table ... add column if not exists`, etc.) — rerunning is safe.

## 20260705230804_init_schema.sql

**Initial schema for GH600 Lab Phase 1** (Entitlements, Paddle payments, paid content).

### Core tables (lead funnel + free diagnostic)
- `leads` — Lead capture at the report gate
- `analytics_events` — All `trackEvent()` calls from the client
- `diagnostic_attempts` — Free 12-question diagnostic quiz results
- `payment_intents` — Checkout intent records (pre-payment)
- `access_codes` — Manually issued Pro-lab unlock codes
- `issue_reports` — User bug reports

### Phase 1: Payments + Entitlements + Paid Content
- `purchases` — Confirmed payments (Paddle webhook, Wise/manual admin grant)
- `entitlements` — Source-agnostic access derived from a purchase or code
- `access_sessions` — Revocable session tokens backing the Pro-lab gate
- `scenarios` — The 18 paid scenarios (prompt, options, answer key)
- `scenario_attempts` — Per-scenario attempt log for analytics

### Database setup
- **pgcrypto** extension for `gen_random_uuid()`
- **RLS enabled** on all tables (no public policies — all writes via API service-role)
- **Indexes** for the lookup patterns actually used: email searches, session-ordered
  events, active access codes, active entitlements, unrevoked session tokens
- **PostgreSQL functions** (`redeem_access_code`, `register_failed_code`) for atomic
  code redemption and 15-minute lockout after 5 failures

### Webhook & admin idempotency
- Purchases table has a unique `(provider, provider_payment_id)` to prevent webhook
  redelivery from double-granting
- Entitlements use `source_purchase_id` for purchase-based grants and
  `(source, metadata->>reference)` for manual/Wise grants — both idempotent

## 20260706172518_premium_bank_v2.sql

**Premium bank v2 (`gh600_scenarios_v2`) replaces `scenarios` as the Pro
lab's content source** — see `docs/plans/premium-bank-300.md`.

- The repo-authored 18-scenario `scenarios` table (seeded by
  `scripts/seed-scenarios.js`) is superseded by a validated, externally
  produced 300-scenario pack imported into `public.gh600_scenarios_v2`
  (`scripts/seed-scenarios-v2.js` + `scripts/data/gh600-scenarios-v2.json`).
  **Why:** 18 questions can't fill a 3-mock / 6-mock tiered offering; the v2
  pack has `plan_required` (`free_diagnostic`/`founder`/`pro`) and `mock_id`
  (`MOCK_1`–`MOCK_6`/`DRILL`) columns so tiering and mock structure are data,
  not application logic slicing a flat list.
- **Deliberate risk accepted:** every row imports as `review_status =
  'needs_sme_review'` (structural validation ≠ editorial approval) and is
  served anyway. Kill-switch: setting a row's `review_status = 'rejected'`
  pulls it from delivery with one `UPDATE`, no deploy — see the plan's
  "deliberate trade-off" section and `CLAUDE.md` rule 6.
- **`scenarios` (v1) is deprecated, not dropped.** `api/scenarios/*.js` no
  longer queries it; don't seed it going forward.
- **`scenario_attempts.scenario_id`/`.scenario_version` changed from
  `uuid`/`integer` to `text`** — v2 ids are opaque strings
  (`GH600-V2-001`, …) and `created_version` is the literal `"v2"`. The old
  FK to `scenarios(id)` was dropped; there is intentionally no FK to
  `gh600_scenarios_v2` (an attempt should survive its scenario being pulled
  via the review kill-switch).
- **Re-import:** `node scripts/seed-scenarios-v2.js` (upserts by `id`, safe
  to re-run). The original validated package also ships a single-file SQL
  import if you'd rather paste it into the Supabase SQL editor directly —
  either path produces the same 300 rows.

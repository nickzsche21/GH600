# Docs index

**GH600 Lab is LIVE at https://gh600.com** 🚀

Deep reference material for GH600 Lab (production deployed, paid tier active). `CLAUDE.md` (repo root) is the operating rules + retrieval map; this tree is what it points into.

## Quick start
- **`LATEST_CHANGES.md`** — What changed (2026-07-07): Phase 2 fixes complete,
  all 10 findings fixed, deployed to gh600.com.
- **`PRODUCTION_DEPLOYMENT.md`** — Operations guide for the live site:
  health checks, monitoring, incident response, runbooks, secrets rotation.
- **`QUICK_START.md`** — "I want to…" guide for common tasks (run locally,
  deploy, add endpoints, understand tier structure, debug).
- **`CHEATSHEET.md`** — command reference, file locations, tier breakdown,
  API endpoints, database queries, troubleshooting, security checklist.
- **`DOCUMENTATION_UPDATES.md`** — summary of docs created/updated with
  new files, updated sections, navigation guide, and next steps.

## Architecture & engineering
- `architecture/system-map.md` — how the static frontend, API functions,
  and Supabase fit together; the full revenue-flow request path including
  mock-based Pro lab delivery.
- `engineering/api-contracts.md` — all 12 `api/*.js` endpoints: request
  body, response shape, validation, tier gating, side effects. Includes
  the scenario-map helper and plan-tier routing.
- `engineering/data-model.md` — 11 Supabase tables (`supabase/schema.sql`),
  the in-memory free diagnostic (`app.js` `questions` array), the
  300-scenario premium bank (`gh600_scenarios_v2`), and the scenario-mapping
  logic (`api/_lib/scenario-map.js`).
- `engineering/commands.md` — run, test, lint, deploy locally and to
  Vercel.

## Business & product
- `business/revenue-flow.md` — funnel steps (landing → diagnostic → email
  gate → plan form → payment → Pro lab), analytics events, and where each
  is implemented.

## History & planning
- `history/known-issues.md` — known gaps and intentional shortcuts (demo
  access codes, privacy pages, rate limiting) — read before "fixing" one so
  you don't undo an intentional MVP tradeoff.
- `history/schema-migrations.md` — timestamped database migrations
  (`supabase/migrations/`): Phase 1 init schema (entitlements, Paddle/Wise,
  scenarios, sessions), Phase 2 premium bank v2 (300 scenarios, tier
  structure, mock-based delivery).
- `history/IMPLEMENTATION_STATUS.md` — comprehensive snapshot of the paid
  MVP: what's built (3 tiers, 12 endpoints, entitlements, Paddle/Wise
  routing), what's broken (10 code-review findings ranked by severity),
  what's next (phases 1–5 implementation plan), and deployment checklist.

## Implementation plans
- `plans/premium-bank-300.md` — Phase 1–5 breakdown for adopting the
  validated 300-scenario premium bank: import DDL + seed data, repoint
  scenario delivery (`api/scenarios/next.js`/`answer.js`), add tier gating
  via `contentTiers(plan)` and `allowedMocks(plan)` in `api/_lib/plans.js`,
  implement mock picker UI in `app.js`, docs update.
- `plans/code-review-fixes-2026-07-06.md` — **executed.** Fixed all 10 code
  review findings: Phase 1 revenue-blocking (Paddle email resolution via
  `resolvePaddleEmail()`, idempotent code redemption/re-login, partial-refund
  guard, plan-alias normalization), Phase 2 Pro-lab quality (session-expiry
  vs. exhausted-mock UX, `escapeHtml()` XSS fix, per-`(code,email)` lockout,
  mock-cap terminal button), Phase 3 hardening (widened Paddle replay window,
  quoted PostgREST filters, shared `api/_lib/crypto.js`). See
  `history/known-issues.md` "Fix status" for the finding-by-finding mapping.

Business strategy (pricing, positioning, kill criteria) lives at the repo
root in `GH600-Lab-Launch-Plan.md`, not under `docs/` — referenced directly
from `CLAUDE.md`.

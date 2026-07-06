# Docs index

Deep reference material for GH600 Lab. `CLAUDE.md` (repo root) is the
operating rules + retrieval map; this tree is what it points into.

- `architecture/system-map.md` — how the static frontend, API functions,
  and Supabase fit together; the full revenue-flow request path.
- `engineering/api-contracts.md` — every `api/*.js` endpoint: request body,
  response shape, validation, side effects.
- `engineering/data-model.md` — Supabase tables (`supabase/schema.sql`) and
  the in-memory `domains`/`questions` quiz data in `app.js`.
- `engineering/commands.md` — run, test, lint, deploy.
- `business/revenue-flow.md` — funnel steps, analytics events, and where
  each is implemented.
- `history/known-issues.md` — known gaps and intentional shortcuts (demo
  access codes, blank checkout URLs, single-file question bank) — read
  before "fixing" one so you don't undo an intentional MVP tradeoff.
- `history/schema-migrations.md` — timestamped database migrations
  (`supabase/migrations/`) and what each one adds: Phase 1 includes
  entitlements, payments (Paddle/Wise), paid content (scenarios), and
  revocable session tokens.
- `history/IMPLEMENTATION_STATUS.md` — comprehensive snapshot of what's
  built, what's broken, and what's next: 11 tables, 12 API endpoints, Paddle
  + Wise payment routing, free/Founder/Pro tier structure, premium 300-
  scenario bank, and ranked fix plan (10 findings, severity 1–3).
- `plans/` — implementation plans (process specs) for larger changes:
  - `plans/premium-bank-300.md` — **executed.** Adopted the validated
    300-scenario `gh600_scenarios_v2` premium bank behind three tiers (Free
    12 / Founder $29 · 120 / Pro $49 · 300 + drills): server adapter
    (`api/_lib/scenario-map.js`), new `pro` plan + tier gating
    (`api/_lib/plans.js`), `review_status` kill-switch, mock picker in
    `app.js`. See `history/schema-migrations.md` for the migration and
    `engineering/data-model.md`/`engineering/api-contracts.md` for the
    resulting shape.
  - `plans/code-review-fixes-2026-07-06.md` — fix plan for the 2026-07-06
    paid-lab code review (`history/known-issues.md`): revenue-critical Paddle
    email/idempotency/refund/plan-alias bugs, Pro-lab correctness (session
    expiry, XSS escaping, mock cap), lockout keying, and a shared
    `api/_lib/crypto.js`. Phase 1 blocks paid traffic.

Business strategy (pricing, positioning, kill criteria) lives at the repo
root in `GH600-Lab-Launch-Plan.md`, not under `docs/` — it predates this
tree and is referenced directly from `CLAUDE.md`.

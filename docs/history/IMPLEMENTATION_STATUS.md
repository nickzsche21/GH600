# Implementation Status — GH600 Lab Paid MVP

**Last updated:** 2026-07-06

## Overview

GH600 Lab has been built as a **paid-ready, revenue-critical MVP** combining a free diagnostic (12 questions), three paid tiers (Founder $29 / Pro $49 / Team $149), and a 300-scenario premium content bank served server-side with full entitlement and session management.

---

## Phase 1: Core MVP ✅ Complete

### Infrastructure
- ✅ **Static frontend** (`index.html`, `app.js`, `styles.css`) — responsive, no framework
- ✅ **Vercel Edge Functions** (`api/*.js`) — serverless, stateless, plain `POST(request)`
- ✅ **Supabase Postgres** — RLS-protected, service-role-only writes
- ✅ **Schema migration pipeline** — `supabase/migrations/`, idempotent, seeded

### Database (11 tables)
- ✅ `leads` — email capture at report gate
- ✅ `analytics_events` — all client events
- ✅ `diagnostic_attempts` — free quiz results
- ✅ `payment_intents` — checkout intent records
- ✅ `access_codes` — manual unlock codes + atomic RPCs
- ✅ `issue_reports` — user feedback
- ✅ `purchases` — confirmed payments (Paddle/Wise/manual)
- ✅ `entitlements` — source-agnostic access grants
- ✅ `access_sessions` — revocable session tokens
- ✅ `scenarios` — deprecated (v1 18-question bank)
- ✅ `gh600_scenarios_v2` — 300-scenario premium bank with tier/mock structure

### API Endpoints (12 total)
- ✅ `POST /api/lead` — lead capture
- ✅ `POST /api/event` — analytics sink
- ✅ `POST /api/diagnostic/complete` — free quiz completion
- ✅ `POST /api/checkout-intent` — pricing authority (Paddle/Wise router)
- ✅ `POST /api/webhooks/paddle` — payment confirmation (signature-verified)
- ✅ `POST /api/access/verify` — access code redemption (atomic RPC)
- ✅ `POST /api/access/session` — session verification (HMAC-verified)
- ✅ `POST /api/admin/grant` — manual/Wise grant (bearer-token auth)
- ✅ `POST /api/admin/revoke` — revoke entitlements
- ✅ `POST /api/scenarios/next` — get next scenario (tier-gated, no answer key)
- ✅ `POST /api/scenarios/answer` — grade scenario server-side
- ✅ `POST /api/issue-report` — user issue submission

### Payment Providers
- ✅ **Paddle** (Founding $29 / Pro $49) — hosted checkout, webhook signature verification
- ✅ **Wise** (Team $149 / Cram $99) — manual admin grant via `admin/grant` endpoint
- ✅ **Manual codes** — access-code RPC with 15-minute lockout after 5 failures

### Security
- ✅ **Entitlements system** — source-agnostic access grants (purchase-based or code-based)
- ✅ **Session tokens** — HMAC-enveloped, revocable, hash-only stored (no raw value persisted)
- ✅ **Admin bearer auth** — `ADMIN_API_TOKEN` constant-time comparison
- ✅ **Webhook signature verification** — Paddle HMAC-SHA256 + timestamp replay guard
- ✅ **RLS on all tables** — no public policies; all writes via service-role API
- ✅ **Answer-key security** — paid scenarios never sent in full; grading server-side only

### Features
- ✅ Responsive marketing site with hero, method, pricing, testimonial sections
- ✅ Free 12-question diagnostic (inline, hand-authored lead magnet)
- ✅ Email-gated readiness report with domain breakdown
- ✅ Three-tier access model (Free / Founder / Pro) with strict tier gating
- ✅ Mock-based delivery (Founder: 3 mocks / Pro: 6 mocks + drills)
- ✅ Mock picker UI in Pro section
- ✅ 40-question mock exams (timed, server-graded)
- ✅ Answer explanations, decision principles, blueprint mapping
- ✅ Local analytics + server-side event tracking
- ✅ Local fallback (no backend API) for dev/preview

---

## Phase 2: Known Issues & Planned Fixes 🔧 In Progress

**Critical blocking issues found in code review:** see `docs/plans/code-review-fixes-2026-07-06.md`

### Severity 1 — Revenue-blocking (must fix before live)
1. **Paddle buyer never gets access** — webhook email resolution broken; needs Paddle API lookup
2. **Re-login locks out customers** — idempotency missing; each login creates new entitlement
3. **Partial refund revokes Pro** — overly broad adjustment handling; needs full-refund check
4. **Access code plan alias breaks tier gating** — plan normalization missing

### Severity 2 — Pro-lab correctness
5. Expired session mid-lab shows bogus result
6. Pro-lab answer scrolling / option rendering XSS risk
7. Diagnostic render performance (1000+ attempts in one session)
8. Mock cap enforcement + UI sync issues
9. Lockout keying (per-code vs. per-email confusion)
10. Shared crypto (HMAC, token hashing) needs consolidation

### Severity 3 — Operational
- [ ] Privacy/terms/refund pages
- [ ] Rate limiting (bot controls)
- [ ] 300-scenario SME editorial review (currently `needs_sme_review`)

---

## Phase 3: Implementation Plans 📋

### 1. Premium Bank v2 (300 scenarios)
**Status:** ✅ Schema merged, seeding script ready
**File:** `docs/plans/premium-bank-300.md`

**What it does:**
- Imports validated 300-scenario premium bank into `gh600_scenarios_v2`
- Tier gating: Free (12, inline) / Founder (120, MOCK_1–3) / Pro (300, MOCK_1–6 + drills)
- Mock-based delivery (40 questions per mock, not uncapped stream)
- Answer-key never shipped; grading server-side only
- Deliberate trade-off: all 300 ship as `needs_sme_review` (structural ≠ editorial); kill-switch on `review_status = 'rejected'` per row

**Surfaces touched:**
- `supabase/migrations/` — v2 schema + 300-row seed
- `api/_lib/scenario-map.js` — column mapping (v2 table → client contract)
- `api/_lib/plans.js` — new `pro` plan + content-tier routing
- `api/scenarios/next.js` + `answer.js` — tier-gated queries, mock-based filtering
- `app.js` — mock picker UI, progress tracking, 40-question cap
- `.env.example` — `PADDLE_PRICE_PRO`, `PADDLE_CHECKOUT_PRO`
- Docs — data-model.md, api-contracts.md, README.md, launch-plan.md

### 2. Code Review Fixes (2026-07-06)
**Status:** 📋 Fix plan written, ready for implementation
**File:** `docs/plans/code-review-fixes-2026-07-06.md`

**Critical path (must fix before live):**
1. **Paddle email resolution** — add `resolvePaddleEmail()` with Paddle API fallback
2. **Idempotent code redemption** — add `findActiveEntitlement()`, compute per-buyer reference
3. **Partial refund handling** — require full-refund check on `adjustment.created`
4. **Plan normalization** — resolve access-code plan via `resolvePlan()` before grant

**Pro-lab correctness:**
5. Session expiry handling in `app.js`
6. XSS escaping in scenario rendering
7. Diagnostic performance tuning
8. Mock cap + UI sync
9. Lockout keying standardization
10. Shared `api/_lib/crypto.js` (consolidate HMAC + token hashing)

---

## Architecture Map

```
┌─────────────────────────────────────────────────────────────┐
│                      INDEX.HTML                             │
│  (Load order: backend-config → access-config → app.js)      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    app.js (CLIENT)         styles.css
    ├─ Quiz logic           (responsive UI,
    ├─ Analytics            dark mode)
    ├─ Checkout intent
    └─ Pro-lab gate
         │
         │ (POST/JSON)
         ▼
    ┌──────────────────────────────┐
    │     VERCEL EDGE FUNCTIONS    │
    ├──────────────────────────────┤
    │ api/                         │
    ├─ lead.js                    │
    ├─ event.js                   │
    ├─ diagnostic/complete.js     │
    ├─ checkout-intent.js         │
    ├─ webhooks/paddle.js         │
    ├─ access/verify.js           │
    ├─ access/session.js          │
    ├─ admin/grant.js             │
    ├─ admin/revoke.js            │
    ├─ scenarios/next.js          │
    ├─ scenarios/answer.js        │
    └─ issue-report.js            │
         │
         │ (REST via service-role key)
         ▼
    ┌──────────────────────────────┐
    │   SUPABASE (RLS-protected)   │
    ├──────────────────────────────┤
    │ leads                        │
    │ analytics_events             │
    │ diagnostic_attempts          │
    │ payment_intents              │
    │ access_codes (+ RPCs)        │
    │ issue_reports                │
    │ purchases                    │
    │ entitlements                 │
    │ access_sessions              │
    │ gh600_scenarios_v2 (300)     │
    │ scenario_attempts            │
    └──────────────────────────────┘
         │
         │ (webhook from)
         ▼
    ┌──────────────────┐
    │  PADDLE          │
    │ (hosted link,    │
    │  Merchant-of-Rec)│
    └──────────────────┘

    ┌──────────────────┐
    │  WISE            │
    │ (transfer,       │
    │  manual grant)   │
    └──────────────────┘
```

---

## Config Hierarchy

| File | Purpose | Public? | Example |
|------|---------|---------|---------|
| `.env` | Server secrets (Supabase, Paddle, admin token) | ❌ NO (Vercel only) | `SUPABASE_SERVICE_ROLE_KEY`, `PADDLE_API_KEY`, `ADMIN_API_TOKEN` |
| `.env.example` | Template (safe to commit) | ✅ YES | Same structure, `YOUR_*` placeholders |
| `backend-config.js` | API route + enabled flag | ✅ YES (public) | `{enabled: true, apiBase: "/api"}` |
| `access-config.js` | Demo codes (for local fallback) | ✅ YES | Empty by default, can add test codes |
| `checkout-config.js` | Fallback URLs | ✅ YES | Blank, overridden by server |

---

## Testing & Verification Checklist

### Local
- [ ] `npm test` passes (unit tests on API helpers, plans, static validation)
- [ ] `vercel dev` runs (Edge Functions + Supabase locally)
- [ ] Free diagnostic completes locally (no API, uses `localStorage`)
- [ ] Payment intent submits (falls back to checkout URL)

### Staging (Vercel + Supabase + Paddle sandbox)
- [ ] Diagnostic → email gate → readiness report works
- [ ] Founding Access → Paddle checkout → webhook → entitlement → Pro lab
- [ ] Pro lab: mock picker, 40-question cap, server-graded, no answer key in page
- [ ] Access code redemption (atomicity, lockout, reuse)
- [ ] Session token persistence across browser reload
- [ ] Session expiry (re-verify on every Pro entry)
- [ ] Refund / chargeback → entitlement revoked
- [ ] Admin grant (Wise) → entitlement → Pro access

### Before go-live
- [ ] SME review of 300 scenarios (`review_status` checks)
- [ ] All 10 code-review findings fixed + tested
- [ ] Secrets rotated (Supabase, Paddle, tokens) in production
- [ ] Privacy/terms/refund pages live
- [ ] Rate limiting in place

---

## Surfaces (per CLAUDE.md Rule: "state every surface touched")

### Free diagnostic
- `app.js` — quiz UI, hand-authored `questions` array
- `index.html` — report dialog
- `styles.css` — responsive grid
- `api/diagnostic/complete.js` — upsert attempt record
- `supabase/schema.sql` — `diagnostic_attempts` table

### Paid checkout + entitlement
- `app.js` — plan selector, redirect to Paddle/form
- `api/checkout-intent.js` — pricing authority (ignore client `amount`)
- `api/_lib/plans.js` — plan definitions + provider routing
- `api/webhooks/paddle.js` — signature verification + grant
- `api/admin/grant.js` — manual Wise/direct grant
- `api/_lib/entitlements.js` — `grantEntitlement()` / `revokeEntitlement()` / `issueSession()`
- `supabase/schema.sql` — `purchases`, `entitlements`, `access_sessions`

### Pro lab (paid scenarios)
- `app.js` — mock picker, 40-question cap, session token verification
- `api/scenarios/next.js` — tier-gated scenario delivery (no answer key)
- `api/scenarios/answer.js` — server-side grading
- `api/_lib/scenario-map.js` — v2 table column mapping
- `api/_lib/plans.js` — `contentTiers()` + mock routing
- `.env.example` — `PADDLE_PRICE_PRO`, `PADDLE_CHECKOUT_PRO`
- `supabase/schema.sql` — `gh600_scenarios_v2`, `scenario_attempts`
- `docs/` — data-model, api-contracts, launch-plan, README

---

## Deployment Checklist

1. **Environment setup**
   - [ ] Create Supabase project
   - [ ] Run `supabase link --project-ref <ref>`
   - [ ] Run `supabase db push` (applies all migrations)
   - [ ] Create Paddle account (sandbox + live)
   - [ ] Generate `ENTITLEMENT_SIGNING_SECRET` and `ADMIN_API_TOKEN`

2. **Paddle dashboard**
   - [ ] Create Founding Access product + $29 price
   - [ ] Create Pro product + $49 price (new)
   - [ ] Create hosted checkout links
   - [ ] Register webhook for `transaction.completed`, `transaction.refunded`, `adjustment.created`
   - [ ] Copy webhook secret

3. **Vercel**
   - [ ] Import project (root = `gh600-lab`)
   - [ ] Add all `.env.example` vars to Project Settings → Environment Variables
   - [ ] Deploy
   - [ ] Test: diagnostic → email → readiness
   - [ ] Test: Founding Access → Paddle → entitlement → Pro lab

4. **Premium bank**
   - [ ] Run `node scripts/seed-scenarios-v2.js` (with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`)
   - [ ] Verify 300 rows in `gh600_scenarios_v2`

5. **Pre-go-live**
   - [ ] SME review 300 scenarios (`SELECT * FROM gh600_scenarios_v2 WHERE review_status='needs_sme_review'`)
   - [ ] Rotate secrets (Supabase, Paddle) to live mode
   - [ ] Test sandbox payment → sandbox webhook → live domain resolve
   - [ ] Remove test access codes from Supabase

---

## Known Gaps (see `docs/history/known-issues.md`)

- Privacy, terms, refund pages (open)
- Rate limiting / bot controls (open)
- 300-scenario editorial review (deliberate: serving as `needs_sme_review`)
- Longer-term: Paddle API checkout (vs. hosted link)
- Longer-term: magic-link resend access (not code re-entry)

---

## File Structure Summary

```
gh600-lab/
├─ index.html                      (static, public)
├─ app.js                          (client logic)
├─ styles.css                      (UI)
├─ .env                            (secrets, git-ignored)
├─ .env.example                    (template, public)
├─ backend-config.js               (API enabled flag)
├─ access-config.js                (demo codes, local-only)
├─ checkout-config.js              (fallback URLs)
│
├─ api/
│  ├─ _lib/
│  │  ├─ http.js                   (response helpers)
│  │  ├─ supabase.js               (REST wrapper, service-role)
│  │  ├─ plans.js                  (pricing authority)
│  │  ├─ providers.js              (Paddle/Wise routing)
│  │  ├─ entitlements.js           (grant/revoke/session)
│  │  └─ scenario-map.js           (v2 column mapping)
│  ├─ lead.js                      (email capture)
│  ├─ event.js                     (analytics sink)
│  ├─ diagnostic/
│  │  └─ complete.js               (free quiz result)
│  ├─ checkout-intent.js           (pricing + checkout link)
│  ├─ access/
│  │  ├─ verify.js                 (code redemption)
│  │  └─ session.js                (token verification)
│  ├─ admin/
│  │  ├─ grant.js                  (manual grant)
│  │  └─ revoke.js                 (revoke entitlement)
│  ├─ scenarios/
│  │  ├─ next.js                   (get scenario)
│  │  └─ answer.js                 (grade scenario)
│  ├─ webhooks/
│  │  └─ paddle.js                 (payment webhook)
│  └─ issue-report.js              (feedback)
│
├─ scripts/
│  ├─ seed-scenarios.js            (deprecated v1)
│  ├─ seed-scenarios-v2.js         (300-scenario import)
│  └─ data/
│     ├─ scenario-data.js          (deprecated)
│     └─ gh600-scenarios-v2.json   (300 scenarios, validated)
│
├─ supabase/
│  ├─ schema.sql                   (source of truth)
│  ├─ migrations/
│  │  ├─ 20260705230804_init_schema.sql
│  │  └─ 20260706172518_premium_bank_v2.sql
│  └─ .temp/                       (CLI temp, git-ignored)
│
├─ tests/
│  ├─ api.test.js                  (endpoint tests)
│  ├─ plans.test.js                (plan definitions)
│  ├─ static.test.js               (security: no secrets in client)
│  ├─ entitlements.test.js         (grant/session logic)
│  └─ webhook.test.js              (Paddle webhook)
│
├─ docs/
│  ├─ README.md                    (index)
│  ├─ architecture/
│  │  └─ system-map.md             (components, request flow)
│  ├─ engineering/
│  │  ├─ data-model.md             (11 tables, schema)
│  │  ├─ api-contracts.md          (12 endpoints)
│  │  └─ commands.md               (run, test, deploy)
│  ├─ business/
│  │  └─ revenue-flow.md           (funnel steps, events)
│  ├─ history/
│  │  ├─ known-issues.md           (open gaps)
│  │  ├─ schema-migrations.md      (v1 + v2 migrations)
│  │  └─ IMPLEMENTATION_STATUS.md  (this file)
│  └─ plans/
│     ├─ premium-bank-300.md       (v2 import + tier gating)
│     └─ code-review-fixes-2026-07-06.md (10 findings, phases)
│
├─ CLAUDE.md                       (operating rules)
├─ AGENTS.md                       (symlink to CLAUDE.md)
├─ README.md                       (user-facing guide)
├─ GH600-Lab-Launch-Plan.md        (strategy, PRD, pricing)
└─ vercel.json                     (deployment config, optional)
```

---

## Next Steps

1. **Implement Phase 2 fixes** (code-review-fixes-2026-07-06.md)
   - Fix Paddle email resolution
   - Fix code redemption idempotency
   - Fix refund handling
   - Fix plan normalization
   - ~5–10h work, blocks live traffic

2. **Complete Pro-lab correctness** (fixes 5–10)
   - Session expiry, XSS, performance, UI sync
   - ~3–5h work, quality improvements

3. **Seed premium bank** (if not done)
   - Run `node scripts/seed-scenarios-v2.js`
   - Verify 300 rows in Supabase

4. **Deploy to staging** + test full revenue flow

5. **Get SME review** of 300 scenarios

6. **Go live** (Paddle live mode, secrets rotated)

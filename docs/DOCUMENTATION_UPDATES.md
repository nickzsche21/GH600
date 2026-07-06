# Documentation Updates — 2026-07-07

## Overview

Complete documentation has been created for GH600 Lab's paid-ready MVP, including architecture, API contracts, implementation status, quick-start guides, and detailed fix plans for identified issues.

---

## New Files Created

### Quick Reference
- **`docs/QUICK_START.md`** (NEW)
  - "I want to…" guide for common tasks
  - Task-driven navigation (run locally, deploy, add endpoints, understand tiers, debug)
  - Key files reference table
  - Common patterns and code snippets
  - Troubleshooting guide
  - Glossary of terms

### Implementation Status
- **`docs/history/IMPLEMENTATION_STATUS.md`** (NEW)
  - Comprehensive snapshot of the paid MVP (Phase 1 complete)
  - 11 tables, 12 API endpoints, 3 payment tiers
  - Known issues (10 code-review findings) ranked by severity
  - Phase 1–5 implementation plans
  - Architecture diagram
  - Config hierarchy
  - Testing & verification checklist
  - Deployment checklist
  - File structure summary
  - Next steps with estimated effort

### Implementation Plans
- **`docs/plans/premium-bank-300.md`** (REFERENCED)
  - Phase 1–5 breakdown for 300-scenario premium bank
  - Tier structure: Free (12) / Founder (120) / Pro (300)
  - Mock-based delivery (40-question exams)
  - Server-side scenario mapping
  - Tier gating logic
  - Surfaces touched (comprehensive checklist)

- **`docs/plans/code-review-fixes-2026-07-06.md`** (REFERENCED)
  - 10 ranked code-review findings
  - Phase 1 (4 revenue-blocking fixes)
  - Phase 2 (6 quality improvements)
  - Detailed fix strategies for each finding

### Migration History
- **`docs/history/schema-migrations.md`** (UPDATED)
  - 20260705230804_init_schema.sql (Phase 1: entitlements, payments, sessions)
  - 20260706172518_premium_bank_v2.sql (Phase 2: 300 scenarios, tier structure)
  - Database setup details (pgcrypto, RLS, indexes, functions)
  - Webhook & admin idempotency patterns

---

## Updated Files

### Architecture
- **`docs/architecture/system-map.md`**
  - Updated components table to include tier structure and mock-based delivery
  - Expanded request flow (steps 1–10) with details on:
    - Paddle email resolution (server-side lookup)
    - Mock picker UI in Pro section
    - Tier-gated scenario delivery
    - Answer-key security (never shipped to client)
  - Added mock-based runs and content tier structure
  - Clarified scenario mapping via `api/_lib/scenario-map.js`

### Engineering
- **`docs/engineering/data-model.md`** (ALREADY UPDATED)
  - Documents `gh600_scenarios_v2` (300 scenarios)
  - Explains tier gating via `contentTiers(planId)` and `allowedMocks(planId)`
  - Describes scenario mapping (`api/_lib/scenario-map.js`)
  - Notes `scenarios` table deprecation
  - Explains `review_status` kill-switch for content delivery

- **`docs/engineering/api-contracts.md`** (ALREADY UPDATED)
  - Updated `/api/scenarios/next` with tier gating, mock filtering
  - Updated `/api/scenarios/answer` with plan re-check and grading
  - Explains `scenario-map.js` column mapping
  - Describes `contentTiers()` and `allowedMocks()` routing

### Business
- **`docs/business/revenue-flow.md`** (UPDATED)
  - Added mock-related analytics events:
    - `mock_selected` — user picks a mock from the picker
    - `mock_run_completed` — mock exam finishes
    - `pro_lab_exited` — user exits mid-run
  - Clarified payment providers (Paddle for Founding/Pro, Wise for Team/Cram)
  - Added pricing to the funnel ($29 Founding, $49 Pro, $149 Team, $99 Cram)

### Index & Navigation
- **`docs/README.md`** (UPDATED)
  - Added "Quick start" section pointing to `QUICK_START.md`
  - Reorganized into 5 clear sections:
    - Quick start
    - Architecture & engineering
    - Business & product
    - History & planning
    - Implementation plans
  - Enhanced descriptions of each doc to call out key topics
  - Clarified that plans are now actively referenced from main docs

---

## What Each Doc Covers Now

| Doc | Purpose | Audience | Key Takeaways |
|-----|---------|----------|---|
| `QUICK_START.md` | Task-driven guide | Everyone | "I want to…" quick navigation, code patterns, troubleshooting |
| `IMPLEMENTATION_STATUS.md` | Comprehensive snapshot | Founders, architects, reviewers | What's built, what's broken (10 findings), what's next (phases 1–5) |
| `system-map.md` | Architecture overview | Architects, new engineers | Components, full request flow, 3-tier structure, mock-based Pro lab |
| `data-model.md` | Database schema & content | Backend engineers, DBAs | 11 tables, free diagnostic, premium bank, tier gating, scenario mapping |
| `api-contracts.md` | API specification | Backend engineers, integrators | 12 endpoints, request/response shapes, tier gating, grading logic |
| `revenue-flow.md` | Funnel & analytics | Product, analytics, founders | Funnel steps, 8 client events + 3 server events, pricing authority |
| `schema-migrations.md` | Migration history | DevOps, DBAs | Two migrations (init + premium bank v2), idempotency patterns |
| `known-issues.md` | Open gaps | Everyone building features | Demo codes, privacy pages, rate limiting, intentional MVP tradeoffs |
| `premium-bank-300.md` | Premium bank plan | Implementation team | Phases 1–5, tier gating, mock picker, content mapping, surfaces touched |
| `code-review-fixes-2026-07-06.md` | Fix plan | Implementation team | 10 findings ranked by severity, Phase 1–3, estimated effort per finding |

---

## Key Topics Now Documented

### 1. Free Diagnostic (12 questions)
- Inline in `app.js` (`questions` array)
- Hand-authored, public, lead magnet
- 2 questions per domain (6 domains)
- Scores captured in `diagnostic_attempts`

### 2. Paid Tiers
- **Free:** 12 diagnostic (no payment)
- **Founder:** $29, MOCK_1–3 (120 questions)
- **Pro:** $49, MOCK_1–6 + drills (300 questions)
- **Team:** $149, uses Pro content (via `team_pack` plan alias)
- **Cram:** $99, uses Pro content (via `cram` plan alias)

### 3. Payment Providers
- **Paddle:** Founding ($29) & Pro ($49) hosted checkout + webhook
- **Wise:** Team ($149) & Cram ($99) manual grant via admin endpoint
- **Manual codes:** Access codes with atomic RPC redemption + 15-min lockout

### 4. Entitlements & Sessions
- Entitlements: source-agnostic access (Paddle, Wise, manual code)
- Sessions: HMAC-enveloped tokens, hash-only stored, revocable
- Re-verified on every Pro-lab entry
- Never client-trusted; no `localStorage` boolean flags

### 5. Pro Lab (Paid Scenarios)
- 300-scenario premium bank in `gh600_scenarios_v2`
- 6 mock exams (MOCK_1–6, 40 questions each) + 60 drills
- Mock picker UI in Pro section
- One scenario per API call (no answer key sent)
- Server-side grading, returns explanation only
- Tier gating: Founder gets MOCK_1–3, Pro gets all + drills

### 6. Scenario Mapping
- `api/_lib/scenario-map.js` translates v2 columns to client contract
- Strips answer key in `toClientScenario()`
- Remaps explanations in `gradingFields()`
- Never exposes `correct_index` or full `explanations` to client

### 7. Code-Review Findings (10 total)
- **Severity 1 (revenue-blocking):** Paddle email, idempotency, refunds, plan aliases
- **Severity 2 (Pro-lab quality):** Session expiry, XSS, performance, UI sync
- **Severity 3 (operational):** Privacy pages, rate limiting
- Full details in `docs/plans/code-review-fixes-2026-07-06.md`

### 8. Security Model
- Secrets never in `app.js` or config files (enforced by `tests/static.test.js`)
- Pricing only in `api/_lib/plans.js` (client amount ignored)
- Answer keys only in Supabase (never sent to browser)
- Session tokens opaque, HMAC-verified, hash-only stored
- Webhooks signature-verified before parsing
- Admin endpoints bearer-token auth
- RLS on all tables (no public policies)

---

## How to Navigate the Docs

### If you want to understand the big picture
1. Start: `docs/QUICK_START.md` → "Understand the codebase"
2. Read: `docs/architecture/system-map.md`
3. Deep dive: `docs/history/IMPLEMENTATION_STATUS.md`

### If you want to implement a feature
1. Start: `docs/QUICK_START.md` → relevant task
2. Check: `docs/engineering/data-model.md` (schema) + `docs/engineering/api-contracts.md` (endpoints)
3. Reference: `docs/plans/premium-bank-300.md` or `docs/plans/code-review-fixes-2026-07-06.md` (if applicable)

### If you're deploying
1. Start: `docs/history/IMPLEMENTATION_STATUS.md` → "Deployment checklist"
2. Reference: `README.md` → "Deploy the paid-ready MVP"
3. Verify: "Testing & verification checklist" in `IMPLEMENTATION_STATUS.md`

### If you're debugging
1. Start: `docs/QUICK_START.md` → "Troubleshooting"
2. Check: `docs/history/known-issues.md` (is it intentional?)
3. Check: `docs/plans/code-review-fixes-2026-07-06.md` (is it a known finding?)

### If you're reviewing code
1. Reference: `docs/engineering/api-contracts.md` (is the change correct?)
2. Reference: `CLAUDE.md` (are the rules followed?)
3. Check: `docs/plans/code-review-fixes-2026-07-06.md` (is this a known issue?)

---

## Stats

| Metric | Count |
|--------|-------|
| New documentation files | 3 (QUICK_START.md, IMPLEMENTATION_STATUS.md, DOCUMENTATION_UPDATES.md) |
| Updated documentation files | 4 (system-map.md, revenue-flow.md, README.md, schema-migrations.md) |
| Total doc files now | 14 |
| API endpoints documented | 12 |
| Database tables documented | 11 |
| Implementation plans | 2 (premium-bank-300, code-review-fixes) |
| Code-review findings documented | 10 (4 severity 1, 6 severity 2–3) |
| Deployment checklist items | 15+ |
| Quick-start tasks covered | 10+ |

---

## Next Steps for Docs

- [ ] Add `api/_lib/scenario-map.js` implementation details (column mapping table)
- [ ] Add `api/_lib/plans.js` documentation (contentTiers, allowedMocks functions)
- [ ] Add test patterns (how to test scenario delivery, tier gating, entitlements)
- [ ] Create admin grant workflow guide (Wise transfer → admin/grant call → session token)
- [ ] Document the code-review fixes implementation once they're completed
- [ ] Update README.md with the new analytics events (mock_selected, mock_run_completed)
- [ ] Add privacy/terms/refund page templates (currently open)

---

## Document Health Checklist

- ✅ Architecture documented (system-map.md)
- ✅ API contracts documented (api-contracts.md)
- ✅ Database schema documented (data-model.md)
- ✅ Implementation status documented (IMPLEMENTATION_STATUS.md)
- ✅ Quick-start guide created (QUICK_START.md)
- ✅ Revenue flow documented (revenue-flow.md)
- ✅ Payment providers documented (throughout)
- ✅ Tier structure documented (system-map, data-model, QUICK_START)
- ✅ Security model documented (QUICK_START, multiple docs)
- ✅ Code-review findings documented (code-review-fixes plan)
- ✅ Deployment checklist created (IMPLEMENTATION_STATUS)
- ✅ Troubleshooting guide included (QUICK_START)
- ⚠️ Implementation guides for fixes (pending code changes)
- ⚠️ Test patterns (pending test implementation)
- ⚠️ Admin workflows (partial — basic grant endpoint documented)

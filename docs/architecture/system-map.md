# System map

## Components

| Component | Files | Runtime |
|---|---|---|
| Marketing site + free diagnostic UI | `index.html`, `styles.css`, `app.js` (hand-authored `questions` array) | Static, served by Vercel (or `python -m http.server` locally); free diagnostic works offline |
| Client config | `access-config.js`, `backend-config.js`, `checkout-config.js` | Loaded as plain `<script>` tags before `app.js` — see load order note below |
| API | `api/*.js`, `api/_lib/*.js` | Vercel Edge Functions (plain `export async function POST(request)`, no framework) |
| Database | `supabase/schema.sql` | Supabase Postgres (11 tables, RLS enabled), accessed only via service-role key from `api/_lib/supabase.js` |
| Payments | Gumroad (Founding $29, Pro $49, hosted checkout) + direct email/manual payment (Team $149, Cram $99) | Public Team/Cram CTAs open prefilled email to the founder; manual payment is fulfilled via `api/admin/[action].js` (bearer token) |
| Entitlement/session | `api/_lib/entitlements.js`, `api/access/session.js`, `api/access/verify.js` | Server-issued, revocable, HMAC-enveloped session tokens (hash-only stored, never raw value persisted); gate revalidated on every Pro-lab entry |
| Paid content tier structure | `api/_lib/plans.js` (`contentTiers`, `allowedMocks`) | Three tiers: Free (12 diagnostic inline) / Founder $29 (120 questions, MOCK_1–3) / Pro $49 (300 questions, MOCK_1–6 + drills) |
| Paid content delivery | `api/scenarios/next.js`, `api/scenarios/answer.js`, `api/_lib/scenario-map.js` | 300-scenario premium bank in `gh600_scenarios_v2`; one scenario per call (no answer key), graded server-side, tier-gated per plan |
| Mock-based runs | `app.js` mock picker, `/api/scenarios/next?mock_id=MOCK_N` | User selects which 40-question mock exam to run; UI shows progress per mock |

## Load order (`index.html`)

`backend-config.js` → `access-config.js` / `checkout-config.js` → `app.js`.
`tests/static.test.js` asserts `backend-config.js` loads before `app.js`;
don't reorder without updating that test.

`backend.enabled` (`backend-config.js`) is `true` on any `https:` host and
only falls back on `file:`. When `false`, `app.js` skips all
`apiRequest()` calls and falls back to `localStorage` + the (empty by
default) codes in `access-config.js`. This is the *local preview* path
only — production (Vercel + Supabase configured) always has
`backend.enabled === true`.

## Request path: a paid unlock, end to end

1. User finishes the diagnostic quiz (`app.js` → `finishQuiz()`), which
   POSTs to `/api/diagnostic/complete` (`api/diagnostic/complete.js`) and
   upserts a row in `diagnostic_attempts` (update path checks `session_id`
   ownership).
2. User enters email at the report gate → `captureLead()` POSTs to
   `/api/lead` (`api/lead.js`) → inserts into `leads`.
3. User clicks Founding or Pro → the hosted Gumroad checkout opens. Team and
   Cram CTAs instead open a prefilled email to `nikhil211884@gmail.com`,
   because those offers are manually scoped and delivered. Server-owned plan
   records remain available for founder-side fulfilment.
4a. **Paddle path (Founding/Pro):** buyer pays on Paddle's hosted page.
   Paddle calls `POST /api/webhooks/paddle` (`api/webhooks/paddle.js`),
   which verifies the `Paddle-Signature` HMAC over the raw body before
   parsing anything, resolves the buyer's email server-side (fetches from
   Paddle API if not in custom_data), then idempotently records a
   `purchases` row and calls `grantEntitlement()` (`api/_lib/entitlements.js`).
   Refund/chargeback events call `revokeEntitlement()`.
4b. **Wise path (Team/Cram):** founder confirms the transfer out-of-band
   and calls `POST /api/admin/grant` (`api/admin/grant.js`, bearer
   `ADMIN_API_TOKEN`), which grants the entitlement directly.
5. Either path ends in `grantEntitlement()` + `issueSession()`, which mints
   an opaque, HMAC-enveloped session token backed by a revocable
   `access_sessions` row (`api/_lib/entitlements.js`).
6. The buyer's own return-to-gate path (`POST /api/access/verify`) uses the
   same `redeem_access_code` RPC + `grantEntitlement`/`issueSession` — it's
   just another entitlement *source* ('manual'), not a separate mechanism.
7. `app.js` stores the returned token (`gh600lab-session-token`, not a
   boolean flag) and calls `POST /api/access/session` on every Pro-lab
   entry to re-verify it before opening the dialog.
8. Inside the lab, `app.js` renders a **mock picker** (Founder: MOCK_1–3,
   Pro: MOCK_1–6 + Drills). Selecting a mock calls `POST /api/scenarios/next`
   with `mock_id`, which returns one scenario at a time (no answer key,
   tier-gated via `contentTiers()` in `api/_lib/plans.js`). Each scenario
   returns via `toClientScenario()` (`api/_lib/scenario-map.js`), which
   strips the answer key and maps v2 columns to the client contract.
9. User submits an answer → `POST /api/scenarios/answer` (grades server-side
   via `gradingFields()`, returns explanation for *that scenario only*).
   After 40 questions or timer expires, the mock run finishes.
10. Scenarios never ship in full to the client. The answer key and
    decision principles stay in `supabase/public.gh600_scenarios_v2` and are
    only used in `/api/scenarios/answer` for grading — see
    `docs/engineering/data-model.md` for the v2 table shape and
    `docs/plans/premium-bank-300.md` for the tier/mock structure.

Every step also fires a named analytics event — see
`docs/business/revenue-flow.md`.

## Why no framework

Single static page + a handful of stateless Edge Functions. Adding a
frontend framework, router, or ORM here would be scope creep relative to
the product's actual size — see `CLAUDE.md` rule on not designing for
hypothetical future requirements.

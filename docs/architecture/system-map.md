# System map

## Components

| Component | Files | Runtime |
|---|---|---|
| Marketing site + quiz UI | `index.html`, `styles.css`, `app.js` | Static, served by Vercel (or `python -m http.server` locally) |
| Client config | `access-config.js`, `backend-config.js`, `checkout-config.js` | Loaded as plain `<script>` tags before `app.js` — see load order note below |
| API | `api/*.js`, `api/_lib/*.js` | Vercel Edge Functions (plain `export async function POST(request)`, no framework) |
| Database | `supabase/schema.sql` | Supabase Postgres, accessed only via the service-role key from `api/_lib/supabase.js` |
| Payments | Paddle (hosted checkout links, Merchant of Record) + Wise (payout + manual invoice) | Provider resolved per plan in `api/_lib/plans.js` / `api/_lib/providers.js`; Paddle confirmed via `api/webhooks/paddle.js`, Wise confirmed manually via `api/admin/grant.js` |
| Entitlement/session | `api/_lib/entitlements.js`, `api/access/session.js` | Server-issued, revocable, HMAC-enveloped session tokens back the Pro-lab gate — never client-trusted |
| Paid content | `api/scenarios/*.js`, `scenarios`/`scenario_attempts` tables | The 18 Pro scenarios live server-side; the client never receives the answer key |

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
3. User clicks a paid plan → `checkout_started` fires, then the access
   dialog POSTs to `/api/checkout-intent` (`api/checkout-intent.js`), which
   resolves the plan and its provider server-side via `api/_lib/plans.js` /
   `api/_lib/providers.js` (client-sent `amount` is ignored), inserts a
   `payment_intents` row, and returns a Paddle hosted-checkout
   `redirect_url` (Founding Access) or `manual_followup: true` (Team/Cram,
   which route through Wise).
4a. **Paddle path:** buyer pays on Paddle's hosted page. Paddle calls
   `POST /api/webhooks/paddle` (`api/webhooks/paddle.js`), which verifies
   the `Paddle-Signature` HMAC over the raw body before parsing anything,
   then idempotently records a `purchases` row and calls
   `grantEntitlement()` (`api/_lib/entitlements.js`). Refund/chargeback
   events call `revokeEntitlement()`.
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
8. Inside the lab, `app.js` calls `POST /api/scenarios/next` (returns one
   scenario, no answer key) and `POST /api/scenarios/answer` (grades
   server-side, returns the explanation for that scenario only) —
   see `docs/engineering/data-model.md` for the `scenarios` table shape.

Every step also fires a named analytics event — see
`docs/business/revenue-flow.md`.

## Why no framework

Single static page + a handful of stateless Edge Functions. Adding a
frontend framework, router, or ORM here would be scope creep relative to
the product's actual size — see `CLAUDE.md` rule on not designing for
hypothetical future requirements.

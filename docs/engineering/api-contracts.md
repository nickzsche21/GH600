# API contracts

All endpoints are Vercel Edge Functions exporting `POST(request)`. Shared
helpers: `api/_lib/http.js` (`json`, `readJson`, `HttpError`,
`handleError`, `text`, `normalizeEmail`, `requireEmail`, `safeMetadata`)
and `api/_lib/supabase.js` (`insert`/`select`/`update` over the Supabase
REST API using the service-role key). Every handler follows the same
shape: `readJson` → validate → `insert`/`select`/`update` → `json(...)`,
wrapped in `try { } catch (error) { return handleError(error) }`.

Responses are always `{ ok: boolean, ... }`. Errors use `HttpError(status,
message)` → `{ ok: false, error }`.

## `POST /api/lead` — `api/lead.js`

Inserts into `leads`. Requires a valid `email` (`requireEmail` throws 400
otherwise). Optional: `source` (default `"website"`), `plan_interest`,
`current_score`, `path`, `utm_source`, `utm_medium`, `utm_campaign`,
`metadata` (capped/truncated by `safeMetadata`). Returns `{ ok: true, id }`
(201).

## `POST /api/event` — `api/event.js`

Inserts into `analytics_events`. Requires `session_id` and `event_name`
(400 if either missing). Optional `email`, `metadata`. Returns `{ ok: true
}` (201). This is the sink for every `trackEvent()` call in `app.js` — see
`docs/business/revenue-flow.md` for the event list.

## `POST /api/diagnostic/complete` — `api/diagnostic/complete.js`

Upserts a `diagnostic_attempts` row. If `attempt_id` is present in the
body, does an `update` (404 if no matching row); otherwise `insert`.
Clamps `total_questions` to 1–100, `score` to 0–total,
`readiness_percent` to 0–100 (derived from score/total if not sent).
Requires `session_id` (400 otherwise). Returns `{ ok: true, attempt_id }`.

## `POST /api/checkout-intent` — `api/checkout-intent.js`

The pricing authority. Requires `email`; `plan` must resolve via
`resolvePlan()` in `api/_lib/plans.js` (400 "Unknown plan" otherwise) —
**client-sent `amount` is never used**. Resolves the plan's provider and
checkout link via `api/_lib/providers.js` (`checkoutUrl()` requires
`https://`), inserts a `payment_intents` row with `status`
`"redirect_ready"` or `"manual_followup"`, and returns `{ ok: true,
intent_id, plan, amount, currency, provider, redirect_url,
manual_followup }` (201). Founding Access and Pro resolve to **Gumroad**
(`redirect_url` set — interim provider while Paddle is stuck in merchant
verification; `checkoutUrl()` tries `GUMROAD_CHECKOUT_*` then
`PADDLE_CHECKOUT_*` then the legacy env, so unsetting the Gumroad env
flips a plan back to Paddle with no code change); Team/Cram resolve to
Wise (`manual_followup: true`, no redirect — founder follows up and
completes the sale via `/api/admin/grant`).

## `POST /api/webhooks/paddle` — `api/webhooks/paddle.js`

Paddle's server-to-server callback — not called by the client, bypasses
the JSON/CORS guard. Reads the **raw** body and verifies
`Paddle-Signature: ts=…;h1=…` as `HMAC_SHA256(PADDLE_WEBHOOK_SECRET,
ts + ':' + rawBody)` before parsing anything; rejects (401) on bad
signature or a `ts` more than ~5s old (replay guard). On
`transaction.completed`: maps the Paddle price id → plan
(`resolvePlanByPriceId`), calls `recordPurchase()` (idempotent on
`(provider, provider_payment_id)`) then `grantEntitlement()` +
fires `payment_succeeded`/`entitlement_granted` into `analytics_events`.
On `transaction.refunded`/`adjustment.created`: calls
`revokeEntitlement()` and fires `refund_completed`. Always returns 200
once the signature is valid, even if no matching plan/email is found.

## `POST /api/access/verify` — `api/access/verify.js`

Requires `email` and `code`. Calls the `redeem_access_code` Postgres RPC
(atomic — kills the old read-then-write race), which checks
`active`/email-match/expiry/`max_uses`/`locked_until` in one statement. On
success, calls `grantEntitlement({ source: 'manual' })` + `issueSession()`
and returns `{ ok: true, plan, token, expires_at }` — a code redemption is
just one *entitlement source* among several (Paddle webhook, Gumroad
license, admin grant), not a separate access mechanism.

If the local code lookup fails (no `access_codes` match), the same `code`
value is retried as a **Gumroad license key** via
`verifyGumroadLicense()` (`api/_lib/gumroad.js`) before giving up — this
is the interim unlock path while Paddle is down. It calls Gumroad's
`POST /v2/licenses/verify` for each plan with a `GUMROAD_PRODUCT_*` env
set, rejects a refunded/disputed/chargebacked purchase or an email
mismatch, and fails closed (`null`) on any network/JSON error. A match
grants with `source: 'manual'`, `granted_by: 'gumroad_license'`, and
reference `gumroad:<plan>:<email>` (mirrors the `code:<code>:<email>`
reference so re-login is idempotent). `register_failed_code` (locks the
code for 15 minutes after 5 failures) and the 401 only fire when **both**
the local code and the Gumroad check fail — a real license key never
counts toward the lockout.

## `POST /api/access/session` — `api/access/session.js`

The gate every Pro-lab entry re-checks. Requires `token`. Verifies the
HMAC envelope (rejects a forged token with zero DB cost), then looks up
the hash in `access_sessions` (must be unrevoked and unexpired). Returns
`{ ok: true, plan, email }` or 401 `{ ok: false, error }`.

## `POST /api/access/founding-count` — `api/access/[action].js`

Returns `{ ok: true, claimed, limit: 100, source: "active_entitlements" }`
for the public founding counter. `claimed` is the number of distinct emails
with an active `founding_access` entitlement; emails never leave the server.
If storage is unavailable, the frontend hides the number rather than showing
an estimate.

## `POST /api/admin/grant` — `api/admin/grant.js`

Manual/Wise fulfilment path. Requires `Authorization: Bearer
<ADMIN_API_TOKEN>` (constant-time compare; missing/wrong token → 401, and
no `ADMIN_API_TOKEN` configured ⇒ always 401). Body: `{ email, plan,
source: 'wise'|'manual', reference, expires_at? }` — `reference` makes the
grant idempotent (same `(source, reference)` returns the existing
entitlement instead of duplicating it). Calls `grantEntitlement()` +
`issueSession()`, returns `{ ok: true, plan, token, expires_at }` (201) —
hand the token to the buyer.

## `POST /api/admin/revoke` — `api/admin/revoke.js`

Same bearer-token auth as `admin/grant`. Body: `{ entitlement_id }` or `{
email }` (looks up the caller's active entitlement). Sets
`entitlements.active = false` and revokes every linked `access_sessions`
row. Returns `{ ok: true, entitlement_id }` or 404 if nothing matched.

## `POST /api/scenarios/next` — `api/scenarios/next.js`

Source: `public.gh600_scenarios_v2` (the 300-scenario premium bank — see
`docs/engineering/data-model.md`). Requires `{ token, session_id }` (+
optional `mock_id`, one of `MOCK_1`–`MOCK_6`/`DRILL`); 401 if the session
doesn't verify. Resolves the caller's content tier and allowed mocks from
`api/_lib/plans.js` (`contentTiers`/`allowedMocks`) — a plan requesting a
`mock_id` outside its tier gets `403 { ok: false, error }` (e.g. a
`founding_access` token asking for `MOCK_5`). Queries with
`plan_required in.(<tiers>)` and `review_status = not.eq.rejected`,
excluding scenario ids this `session_id` already attempted. Returns one
row via `toClientScenario()` (`api/_lib/scenario-map.js`) — **answer key
fields never included** — or `{ ok: true, done: true }` once the mock/tier
is exhausted. Minimal disclosure by construction: the client never
receives more than the single scenario in front of it.

## `POST /api/scenarios/answer` — `api/scenarios/answer.js`

Requires `{ token, session_id, scenario_id, selected_index }` (+ optional
`duration_ms`, `attempt_id`). Re-checks that the scenario's
`plan_required` is within the caller's `contentTiers()` (403 otherwise —
defense in depth against a stale/forged `scenario_id`). Grades
server-side via `gradingFields()` (maps `correct_option_index` and
remaps `wrong_answer_explanations` letter keys → numeric option indices),
inserts a `scenario_attempts` row (`scenario_id`/`scenario_version` are
`text`), and returns `{ ok: true, correct, correct_index, explanation,
decision_principle }` for *that scenario only* (`decision_principle` is
always `null` for v2 rows — folded into `explanation` instead).

## `POST /api/issue-report` — `api/issue-report.js`

Requires `email` and a `message` of at least 5 characters (400 otherwise).
Inserts into `issue_reports` with optional `path`, `session_id`,
`metadata`. Returns `{ ok: true, id }` (201).

## Adding a new endpoint

1. New file under `api/` (or a subdirectory — path becomes the route).
2. Import `handleError`/`readJson`/`json` from `_lib/http.js`; validate
   with `requireEmail`/`text`/`safeMetadata` as needed — don't hand-roll
   validation.
3. Use `insert`/`select`/`update` from `_lib/supabase.js` — never call the
   Supabase REST API directly from a handler.
4. Add a test in `tests/api.test.js` following the existing pattern (stub
   `globalThis.fetch`, assert on the inserted body and response).
5. If it's a new revenue-funnel step, add the analytics event to `app.js`
   and to the README's "Analytics events" list.

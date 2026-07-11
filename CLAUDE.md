# GH600 Lab — Operating Rules

Solo-founder revenue product, not a demo. Every change either protects the
revenue funnel (diagnostic → email → checkout → Pro lab) or it's out of scope
for a quick pass.

This file is the operating system: architecture guardrails, non-negotiable
rules, and a map to deeper docs. Deep knowledge lives in `docs/` — load it on
demand using the **Retrieval map** at the bottom. Do not add reference
material, history, or process specs here; put them in `docs/` and link.

## Architecture (source of truth)

Static frontend (`index.html`, `app.js`, `styles.css`) + serverless API
(`api/*.js`, Vercel Edge Functions) + Supabase (Postgres, service-role only,
no public RLS policies) + Paddle (Merchant of Record hosted checkout,
automated via webhook) and Wise (payouts + manual admin-confirmed grant)
for payments. A confirmed payment (either provider) always produces the
same server-issued, revocable entitlement + session token
(`api/_lib/entitlements.js`); the Pro lab is gated by that token, never by
a client-side flag, and its 18 scenarios are served/graded server-side
(`api/scenarios/*.js`) — the answer key never ships in `app.js`.

- `app.js` — all client logic: quiz engine (`domains`/`questions` data +
  render/score), analytics (`trackEvent`), lead capture, checkout intent,
  Pro-lab access gate.
- `api/_lib/` — shared server helpers: `http.js` (response/validation
  helpers), `supabase.js` (REST wrapper using the service-role key),
  `plans.js` (the **only** source of plan pricing).
- `api/*.js` — one file per endpoint, each a plain `POST(request)` Vercel
  Edge Function. No framework, no router.
- Config files are the *only* place external identifiers live:
  `access-config.js` (local demo access codes), `backend-config.js` (API
  base + enabled flag), `checkout-config.js` (fallback checkout URLs).

Full map & request/response flow: `docs/architecture/system-map.md`
Data model (Supabase tables): `docs/engineering/data-model.md`
API contracts: `docs/engineering/api-contracts.md`

## Rules

1. **Pricing lives in `api/_lib/plans.js` only.** The client never decides
   price; `checkout-intent.js` ignores any `amount` the browser sends.
   Never hardcode a dollar amount anywhere else.
2. **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Never reference it, log
   it, or let it reach `index.html`, `app.js`, or any `*-config.js` file.
   `tests/static.test.js` enforces this — don't weaken that test.
3. **All writes go through `api/*` + the service-role key.** Supabase tables
   have RLS enabled with zero public policies (`supabase/schema.sql`). Don't
   add a public policy as a shortcut — route through a new API function
   instead.
4. **Analytics events are enumerated in the README and fired via
   `trackEvent()` in `app.js`.** Adding a new funnel step means adding the
   event name in both places — untracked steps make the funnel unmeasurable.
5. **Local fallback vs. production must not silently diverge.** `app.js`
   checks `backend.enabled` (from `backend-config.js`) to fall back to
   `localStorage` + `access-config.js` DEMO codes when there's no API (e.g.
   `file://` preview). Never let the fallback path leak into a
   Supabase-backed deploy — it's for local preview only.
6. **No test-bank inflation without demand.** Don't add new quiz
   questions/domains speculatively — see `docs/business/launch-plan.md` kill
   criteria before expanding content.
7. **Entitlements are the source of truth; never grant Pro access from the
   client.** A client-set `localStorage` flag must never unlock the Pro lab —
   every entry re-verifies a server-issued session token via
   `/api/access/session`. Granting/revoking access always goes through
   `api/_lib/entitlements.js` (`grantEntitlement`/`revokeEntitlement`), not a
   direct table write.
8. **Webhook signature verification is mandatory.** `api/webhooks/paddle.js`
   must verify the raw-body HMAC before parsing or acting on a payload — never
   trust an unverified webhook body, even to read a field.
9. **Admin endpoints require `ADMIN_API_TOKEN`.** `api/admin/*.js` must reject
   (401) if the token is missing, wrong, or unconfigured — never add an admin
   action that's reachable without it.

## Before you code

- **Verify, don't assume.** Check the actual `api/*.js` file or
  `supabase/schema.sql` before describing behavior — don't guess at a
  response shape.
- **Changing a revenue-flow step?** State every surface touched: `app.js`
  (client), the `api/*.js` endpoint, the Supabase table, and the README
  section describing that flow. Silent partial updates break the funnel.
- **Adding a plan or price?** Update `api/_lib/plans.js`,
  `supabase/schema.sql` if a new table/column is needed, `.env.example`,
  and the pricing section of `GH600-Lab-Launch-Plan.md`.
- **Touching the quiz content?** Read `docs/engineering/data-model.md` for
  the `domains`/`questions` shape in `app.js` before editing — it's
  hand-authored data, not a database table.

## Retrieval map — read the doc BEFORE the work

| About to… | Read first |
|---|---|
| Understand the app end-to-end (frontend, API, DB, config) | `docs/architecture/system-map.md` |
| Add/change an API endpoint or its request/response shape | `docs/engineering/api-contracts.md` |
| Touch a Supabase table or write a migration | `docs/engineering/data-model.md` |
| Run, test, or deploy locally / to Vercel | `docs/engineering/commands.md` |
| Change pricing, plans, or the revenue funnel | `GH600-Lab-Launch-Plan.md` (root) + `docs/business/revenue-flow.md` |
| Decide whether a feature is worth building right now | `GH600-Lab-Launch-Plan.md` — kill criteria & path-to-$5K sections |
| Touch access codes, the Pro gate, or checkout | `docs/history/known-issues.md` — known gaps before you "fix" them |
| Find anything else | `docs/README.md` |

---
*Companion files:* `AGENTS.md` is a symlink to this file (single source for
all agent tools).

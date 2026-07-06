# Revenue flow & analytics

Funnel (also stated in root `README.md`):

```
landing → diagnostic → email-gated report → plan form → server-owned price
→ (Paddle hosted checkout | Wise invoice) → webhook | admin grant
→ server-issued entitlement + session token → Pro lab (server-graded)
```

## Analytics events (`app.js` → `trackEvent()`, plus server-fired events)

Client events are pushed to `window.dataLayer`, dispatched as a
`gh600lab:analytics` custom DOM event, kept in `localStorage` (last 100),
and POSTed to `/api/event` → `analytics_events` table. Server-fired events
(webhook/scenario endpoints) insert into `analytics_events` directly.

| Event | Fired when | Where |
|---|---|---|
| `landing_viewed` | Page load | `app.js`, bottom of file, unconditional |
| `diagnostic_started` | Free diagnostic begins | `app.js` `startQuiz()` |
| `diagnostic_completed` | Free diagnostic finishes | `app.js` `finishQuiz()` |
| `email_captured` | Email submitted (report gate or checkout) | `app.js` `renderReportGate()` / access form submit handler |
| `pricing_clicked` | Any pricing CTA clicked | `app.js` pricing button listeners |
| `founding_access_clicked` | Founding-access CTA specifically | `app.js` pricing/hero listeners, `renderDetailedReport()` unlock button |
| `checkout_started` | Checkout form submitted | `app.js` access form submit handler |
| `checkout_redirected` | Redirected to a checkout link | `app.js` access form submit handler |
| `payment_succeeded` | Paddle transaction confirmed | `api/webhooks/paddle.js` (server) |
| `entitlement_granted` | Any entitlement granted (Paddle, Wise, manual code) | `api/webhooks/paddle.js` (server) |
| `refund_completed` | Paddle refund/chargeback processed | `api/webhooks/paddle.js` (server) |
| `pro_gate_attempted` | Email+code submitted to Pro gate | `app.js` `#pro-gate-form` submit |
| `pro_gate_unlocked` | Pro gate accepted (entitlement verified) | `app.js` `#pro-gate-form` submit (success path) |
| `mock_selected` | User picks a mock exam from the mock picker | `app.js` mock picker button click |
| `paid_scenario_started` | A Pro-lab scenario is fetched (within a mock run) | `app.js` `renderNextProScenario()` |
| `paid_scenario_completed` | A Pro-lab scenario is graded | `app.js` `checkProAnswer()` |
| `mock_run_completed` | A 40-question mock exam finishes (completed or timer expires) | `app.js` `finishProLab()` |
| `pro_lab_exited` | User exits Pro lab mid-run | `app.js` exit button or nav away |
| `issue_reported` | Issue form submitted | `app.js` `#issue-form` submit |

Adding a funnel step requires adding its event both here/README and in
`app.js` (or the relevant server endpoint) — see `CLAUDE.md` rule 4.

## Where price is decided

Never in `app.js` or any `*-config.js` file. `api/_lib/plans.js` is the
single source of plan id/label/amount/currency/provider/env-var-name;
every plan change starts there. See `docs/engineering/api-contracts.md` →
`/api/checkout-intent`.

## Business strategy

Positioning, pricing tiers, launch sequencing, and kill criteria are
maintained in the root `GH600-Lab-Launch-Plan.md`, not duplicated here.
Read it before changing pricing, adding content, or deciding whether a
feature is worth building given current traction.

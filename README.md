# GH600 Lab

An interactive, scenario-based MVP for the GitHub Certified: Agentic AI Developer (GH-600) exam.

## Run locally

From this folder:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

The `file://` and static-server preview keep a minimal local fallback (no wildcard/demo code ships by default — see `access-config.js`). Production uses the `/api` functions and never exposes Supabase credentials, the entitlement signing secret, the admin token, or paid access codes in the browser.

## Deploy the paid-ready MVP

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Create a Paddle account, get sandbox/live API keys, and create hosted checkout links + prices for Founding Access ($29) and Pro ($49). Team ($149) and Cram ($99) route through Wise + manual admin grant, not Paddle.
3. In the Paddle dashboard, register the webhook URL `https://<your-domain>/api/webhooks/paddle` for `transaction.completed`, `transaction.refunded`, and `adjustment.created`, and copy the webhook secret.
4. Generate `ENTITLEMENT_SIGNING_SECRET` and `ADMIN_API_TOKEN` (e.g. `openssl rand -hex 32`) — treat both as production secrets.
5. Import this folder as a Vercel project (the project root must be `gh600-lab`).
6. Add every variable from `.env.example` in Vercel Project Settings → Environment Variables.
7. Deploy, take one diagnostic, submit an email, and verify rows appear in `leads`, `diagnostic_attempts`, and `analytics_events`.
8. Click Founding Access and confirm the server redirects to the Paddle checkout link; complete a sandbox purchase and confirm an `entitlements` row appears and the Pro lab unlocks with a session token (not `localStorage["gh600lab-pro-access"]`).
9. Run `node scripts/seed-scenarios-v2.js` once (with `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set) to load the 300-scenario premium bank into `gh600_scenarios_v2` (six mock exams + drills — see `docs/history/schema-migrations.md`; the older `scripts/seed-scenarios.js` is deprecated).

The service-role key, `ENTITLEMENT_SIGNING_SECRET`, `ADMIN_API_TOKEN`, and `PADDLE_WEBHOOK_SECRET`/`PADDLE_API_KEY` are server-only. Do not put any of them in `backend-config.js`, `checkout-config.js`, `access-config.js`, or any other public file.

For a local full-stack preview, install the Vercel CLI and run `vercel dev`. A plain static server intentionally has no backend.

### Token rotation checklist

If any server secret is suspected exposed (e.g. found in a committed file, a shared screenshot, or a support ticket): rotate `SUPABASE_SERVICE_ROLE_KEY` and the Supabase access token in the Supabase dashboard, rotate `ADMIN_API_TOKEN` and `ENTITLEMENT_SIGNING_SECRET` (note: rotating the signing secret invalidates every outstanding session token — buyers will need to re-enter their email/code), and rotate `PADDLE_WEBHOOK_SECRET`/`PADDLE_API_KEY` in the Paddle dashboard. Update the values in Vercel immediately after rotating.

## Issue a manual access code

After confirming payment, insert a code in the Supabase SQL Editor:

```sql
insert into public.access_codes (email, code, plan, max_uses)
values ('buyer@example.com', 'GH600-A7K9-P2', 'founding_access', 25);
```

Send that email/code pair to the buyer. The Pro gate redeems it atomically server-side (`redeem_access_code` RPC), checks expiry/use-limit/lockout, and mints a revocable session token. Generate a unique high-entropy code per buyer; never use a wildcard email match in production.

For a confirmed Wise transfer (Team Pack, Cram Call), call `admin/grant` directly instead:

```bash
curl -X POST https://<your-domain>/api/admin/grant \
  -H "authorization: Bearer $ADMIN_API_TOKEN" -H "content-type: application/json" \
  -d '{"email":"buyer@example.com","plan":"team","source":"wise","reference":"wise-transfer-id"}'
```

## Revenue flow

`landing → diagnostic → email-gated report → plan form → server-owned price → (Paddle hosted checkout | Wise invoice) → webhook | admin grant → server-issued session token → Pro lab (server-graded)`

## What works

- Responsive marketing site
- 12-question free diagnostic (hand-authored, inline lead magnet)
- Three content tiers on the 300-scenario premium bank: **Free** (12 diagnostic, inline) ·
  **Founder $29** (120 questions / mock exams 1–3) · **Pro $49** (all 300 / mock exams 1–6 +
  60 targeted drills) · **Team $149** uses the Pro content set
- Mock-exam picker in the Pro area — a run is one 40-question mock (or the drill set), not an
  uncapped stream
- Answer explanations and blueprint mapping
- Timed quiz flow and readiness report
- Email gate before the detailed readiness report
- Supabase lead, diagnostic, event, payment-intent, purchase, entitlement, session, access-code, and issue-report storage
- Founding/Pro checkout routing through a Paddle hosted checkout link, confirmed by a signature-verified webhook
- Team/Cram routed through Wise + an admin-token-gated manual grant endpoint
- Server-issued, revocable session tokens gate the Pro lab — no client-trusted flags
- Paid scenarios served and graded server-side, one scenario at a time, tier-gated per plan (no answer key in page source, no cross-tier leakage)
- Local analytics events and `dataLayer` hooks, plus server-fired payment/entitlement/refund events
- Local fallback plus server persistence for progress, leads, issue reports, and analytics
- Free, $29 Founding, $49 Pro, $149 Team, and $99 cram-call packaging

## Before charging customers

1. Set the Supabase, Paddle, and admin/signing-secret variables in Vercel and run the end-to-end checks above, including a Paddle sandbox purchase.
2. Remove or rotate any test access codes created in Supabase.
3. The 300-scenario premium bank ships as `needs_sme_review` (structurally validated, not yet editorially approved) — a deliberate, accepted risk. Have a GH-600 subject-matter expert review it and flip a bad row's `review_status` to `'rejected'` to pull it from delivery immediately (no deploy needed).
4. Add privacy, terms, refund, and contact pages (still open — see `docs/history/known-issues.md`).
5. Add rate limiting / bot controls beyond the per-code lockout already in place (still open).

## Analytics events

- `landing_viewed`
- `diagnostic_started`
- `diagnostic_completed`
- `email_captured`
- `pricing_clicked`
- `founding_access_clicked`
- `checkout_started`
- `checkout_redirected`
- `payment_succeeded` (server)
- `entitlement_granted` (server)
- `refund_completed` (server)
- `pro_gate_attempted`
- `pro_gate_unlocked`
- `paid_scenario_started`
- `paid_scenario_completed`
- `pro_lab_completed`
- `issue_reported`

Events are pushed to `window.dataLayer`, emitted as `gh600lab:analytics` custom events, and retained locally for MVP inspection. Server-fired events insert into `analytics_events` directly from the webhook/scenario endpoints.

GH600 Lab is an independent, unofficial practice product and is not affiliated with GitHub, Microsoft, Pearson VUE, or the official GH-600 exam. All scenarios are original and based on public objectives and documentation. No recalled or unauthorized exam content is included.

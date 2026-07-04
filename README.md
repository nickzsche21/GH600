# GH600 Lab

An interactive, scenario-based MVP for the GitHub Certified: Agentic AI Developer (GH-600) exam.

## Run locally

From this folder:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

The `file://` and static-server preview keep a local fallback, including `DEMO-ACCESS`. Production uses the `/api` functions and never exposes Supabase credentials or paid access codes in the browser.

## Deploy the paid-ready MVP

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Create hosted Razorpay Payment Links for the offers you want to sell.
3. Import this folder as a Vercel project (the project root must be `gh600-lab`).
4. Add the variables from `.env.example` in Vercel Project Settings → Environment Variables.
5. Deploy, take one diagnostic, submit an email, and verify rows appear in `leads`, `diagnostic_attempts`, and `analytics_events`.
6. Click Founding Access and confirm the server redirects to the $29 link.

The service-role key is server-only. Do not put it in `backend-config.js`, `checkout-config.js`, or any other public file.

For a local full-stack preview, install the Vercel CLI and run `vercel dev`. A plain static server intentionally has no backend.

## Issue a manual access code

After confirming payment, insert a code in the Supabase SQL Editor:

```sql
insert into public.access_codes (email, code, plan, max_uses)
values ('buyer@example.com', 'GH600-A7K9-P2', 'founding_access', 25);
```

Send that email/code pair to the buyer. The Pro gate verifies it server-side, checks expiry/use limits, and records use. Generate a unique high-entropy code per buyer; never use `DEMO-ACCESS` in production.

## Revenue flow

`landing → diagnostic → email-gated report → plan form → server-owned price → Razorpay Payment Link → manual code → Pro lab`

## What works

- Responsive marketing site
- 12-question diagnostic assembled from 18 original scenarios
- Six guaranteed artifact labs covering YAML, JSON, logs and agent configuration
- All six official exam domains represented
- Answer explanations and blueprint mapping
- Timed quiz flow and readiness report
- Email gate before the detailed readiness report
- Supabase lead, diagnostic, event, payment-intent, access-code, and issue-report storage
- Founding checkout routing through server-configured Razorpay Payment Links
- Email + access-code Pro gate verified server-side in production
- Full 18-question paid lab
- Local analytics events and `dataLayer` hooks
- Local fallback plus server persistence for progress, leads, issue reports, and analytics
- Free, $29 Founding, $149 Team, and $99 cram-call packaging

## Before charging customers

1. Set the Supabase and Razorpay variables in Vercel and run the end-to-end checks above.
2. Remove or rotate any test access codes created in Supabase.
3. Expand to a reviewed question bank and timed mock exams only after paid validation.
4. Have a GH-600 subject-matter expert review every question.
5. Add privacy, terms, refund, and contact pages.

## Analytics events

- `diagnostic_started`
- `diagnostic_completed`
- `email_captured`
- `pricing_clicked`
- `founding_access_clicked`
- `pro_gate_attempted`
- `pro_gate_unlocked`
- `checkout_redirected`
- `issue_reported`

Events are pushed to `window.dataLayer`, emitted as `gh600lab:analytics` custom events, and retained locally for MVP inspection.

GH600 Lab is an independent, unofficial practice product and is not affiliated with GitHub, Microsoft, Pearson VUE, or the official GH-600 exam. All scenarios are original and based on public objectives and documentation. No recalled or unauthorized exam content is included.

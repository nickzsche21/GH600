# GH600 Lab

An interactive, scenario-based MVP for the GitHub Certified: Agentic AI Developer (GH-600) exam.

## Run locally

From this folder:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

To collect payment, paste hosted checkout links into `checkout-config.js`. If a link is blank, the same form continues to capture founding-access interest locally for demo/validation.

## What works

- Responsive marketing site
- 12-question diagnostic assembled from 18 original scenarios
- Six guaranteed artifact labs covering YAML, JSON, logs and agent configuration
- All six official exam domains represented
- Answer explanations and blueprint mapping
- Timed quiz flow and readiness report
- Email gate before the detailed readiness report
- Founding checkout routing through configurable hosted payment links
- Email + access-code Pro gate with a local MVP allowlist
- Full 18-question paid lab
- Local analytics events and `dataLayer` hooks
- Progress, leads, issue reports, and analytics saved in `localStorage`
- Free, $29 Founding, $149 Team, and $99 cram-call packaging

## Before charging customers

1. Replace local-only lead capture with a database/email provider.
2. Connect Founding ($29), Team ($149), and cram-call ($99) URLs in `checkout-config.js`. For India, do not assume Stripe access; Razorpay, Lemon Squeezy, Paddle, or manual UPI plus access codes may be faster.
3. Replace the `DEMO-ACCESS` entry in `access-config.js` with manually issued codes, then move access validation server-side after the first cohort.
4. Expand to 180+ reviewed questions and three timed mock exams.
5. Have a GH-600 subject-matter expert review every question.
6. Add privacy, terms, refund, and contact pages.

## Analytics events

- `diagnostic_started`
- `diagnostic_completed`
- `email_captured`
- `pricing_clicked`
- `founding_access_clicked`
- `pro_gate_attempted`

Events are pushed to `window.dataLayer`, emitted as `gh600lab:analytics` custom events, and retained locally for MVP inspection.

GH600 Lab is an independent, unofficial practice product and is not affiliated with GitHub, Microsoft, Pearson VUE, or the official GH-600 exam. All scenarios are original and based on public objectives and documentation. No recalled or unauthorized exam content is included.

# GH600 Lab — CTO / Claude Handoff

**Prepared:** 2026-07-05  
**Repository:** https://github.com/nickzsche21/GH600  
**Implementation branch:** `codex/paid-ready-mvp`  
**Latest implementation commit:** `6302462`  
**Compare / merge:** https://github.com/nickzsche21/GH600/compare/main...codex/paid-ready-mvp?expand=1

## 1. Executive summary

GH600 Lab is a premium, scenario-based preparation product for the GitHub Certified: Agentic AI Developer (GH-600) exam.

The repository started as a polished static frontend. The implementation branch adds a lean revenue backend using Vercel Functions, Supabase, hosted Razorpay Payment Links, and manual paid-access codes.

The current build is suitable for validating the first 10–20 paid customers. It is **not yet a fully automated or securely gated SaaS**. The most important technical gap is that paid questions and answers still live in public browser JavaScript. The current Pro gate controls UI access, not content secrecy.

### Immediate objective

Do not build a giant platform first. Reach this milestone:

> A stranger completes the diagnostic, submits an email, pays, receives access, completes the Pro lab, and appears correctly in Supabase analytics.

### Business objective

Validate at least 10 real purchases at the $29 founding price before investing in a large scenario bank or complex account system.

---

## 2. Current product offer

### Free

- 12-question diagnostic
- Coverage across all six GH-600 domains
- Readiness percentage
- Domain-level strengths and weaknesses
- Three-day study-plan preview

### Founding Access — $29 lifetime

- 18 live original scenarios
- Six artifact labs
- Detailed readiness report
- Full 18-question Pro run
- Future reviewed scenario drops

### Team Pack — $149

- 10 intended learner seats
- Team interest capture
- Manager readiness snapshot is marketed but not yet implemented
- CSV export is marketed but not yet implemented

### Urgent Cram Call — $99

- Manual 60-minute session
- Form captures preferred time, exam date, and weakest area

### Important product honesty

The current $29 value is borderline with only 18 scenarios. Keep the **founding access** framing and promise only releases the team can actually deliver. The stronger paid product should reach:

- 60+ reviewed scenarios
- Three timed mock exams
- Objective-level weak-area tracking
- Recommended official documentation
- Reviewed explanations for every distractor

---

## 3. Why customers may pay

Customers are not buying a question count. They are buying reduced uncertainty before a new exam.

Primary purchase triggers:

- Official preparation is still limited while the exam is new/beta.
- Candidates do not know which GH-600 domain is actually weak.
- Artifact-based scenarios feel closer to real engineering judgment than flashcards.
- A failed exam attempt costs more money and time than the product.
- Consultants and early adopters may value being certified before the market becomes crowded.
- Teams may want a quick readiness benchmark before paying for exams or training.

The core promise should remain:

> Discover exactly where you will lose points, then practise those failures before the exam.

---

## 4. Repository state

### `main`

At the time of this handoff, `main` still contains the earlier static build unless the implementation branch has been merged after this document was written.

### `codex/paid-ready-mvp`

Contains:

- Existing premium landing page
- Diagnostic and readiness report
- Supabase schema
- Six Vercel serverless endpoints
- Server-owned payment-plan pricing
- Razorpay Payment Link redirects
- Server-side production access-code verification
- Team and cram-call lead fields
- Environment and Vercel configuration
- Automated tests
- Updated deployment documentation

### Validation already completed

- 10 automated tests passing
- All JavaScript files syntax-checked
- Static asset references verified
- Endpoint modules imported successfully
- Browser assets checked for accidental server-key exposure
- Git diff whitespace validation passed

Run validation again with:

```bash
node --test tests/*.test.js
```

---

## 5. Current architecture

```text
Browser
  ├─ Static HTML/CSS/JavaScript
  ├─ Free diagnostic
  ├─ Email-gated readiness report
  └─ Pricing / Pro access dialogs
          │
          ▼
Vercel Functions (/api)
  ├─ lead capture
  ├─ analytics events
  ├─ diagnostic completion
  ├─ checkout intent
  ├─ access-code verification
  └─ issue reports
          │
          ▼
Supabase REST API
  ├─ leads
  ├─ analytics_events
  ├─ diagnostic_attempts
  ├─ payment_intents
  ├─ access_codes
  └─ issue_reports

Checkout intent → Razorpay hosted Payment Link
Successful payment → currently requires manual access-code issuance
```

### Technology choices

- Frontend: static HTML, CSS, vanilla JavaScript
- Hosting: Vercel
- Backend: Vercel Node.js Functions
- Database: Supabase Postgres through its generated REST API
- Payment launch path: Razorpay hosted Payment Links
- Authentication at MVP stage: email + manually issued access code
- Automated tests: Node built-in test runner

### Why there is no Next.js or Supabase SSR package

This repository is not a Next.js application and does not use Supabase Auth sessions yet. Do not install `@supabase/ssr`, create Next.js middleware, or paste Next.js `page.tsx` examples into this codebase unless the team deliberately chooses a framework migration.

The current functions call Supabase's REST API directly, so no runtime npm dependencies are required.

---

## 6. Existing API contract

### `POST /api/lead`

Stores email capture and purchase interest.

Important fields:

```json
{
  "email": "buyer@example.com",
  "source": "diagnostic_report",
  "plan_interest": "founder",
  "current_score": 62,
  "path": "/?utm_source=reddit",
  "utm_source": "reddit",
  "utm_medium": "organic",
  "utm_campaign": "launch",
  "metadata": {}
}
```

### `POST /api/event`

Stores product analytics.

```json
{
  "session_id": "uuid",
  "email": "buyer@example.com",
  "event_name": "diagnostic_completed",
  "metadata": { "score": 62 }
}
```

### `POST /api/diagnostic/complete`

Creates a diagnostic attempt. If `attempt_id` is included, updates the anonymous attempt after email capture.

### `POST /api/checkout-intent`

Accepts email and a plan identifier. Pricing is resolved on the server so the browser cannot submit a fake price.

Supported aliases:

- `founder` / `founding_access` → $29
- `team` / `team_pack` → $149
- `cram` / `cram_call` → $99

Returns a configured Razorpay redirect URL or a manual-follow-up response.

### `POST /api/access/verify`

Checks:

- Normalized email
- Active code
- Expiration
- Maximum uses

It then increments the usage count and returns the plan.

### `POST /api/issue-report`

Stores customer-reported question, explanation, or interface problems.

---

## 7. Supabase setup

### Known project URL

```env
SUPABASE_URL=https://munhjhogbaqjvfgzsnck.supabase.co
```

### Required server credential

Use one of these in Vercel only:

```env
SUPABASE_SECRET_KEY=sb_secret_...
```

or the legacy fallback:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

Never commit, paste into browser code, or include either elevated key in screenshots or documentation.

The previously supplied `sb_publishable_...` key is not required by the current backend. It is safe for browser usage only when Row Level Security policies intentionally allow that browser operation.

### Database creation

Open Supabase SQL Editor and run:

```text
supabase/schema.sql
```

The schema enables Row Level Security and intentionally creates no public data policies. Production writes go through server functions using the server secret.

### Required tables

- `leads`
- `analytics_events`
- `diagnostic_attempts`
- `payment_intents`
- `access_codes`
- `issue_reports`

### Manual code issuance

For the first buyers:

```sql
insert into public.access_codes (email, code, plan, max_uses)
values ('buyer@example.com', 'GH600-A7K9-P2', 'founding_access', 25);
```

Use a unique, unpredictable code for every buyer. Never use `DEMO-ACCESS` in production.

---

## 8. Vercel environment variables

Required for database storage:

```env
SUPABASE_URL=https://munhjhogbaqjvfgzsnck.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Required for $29 checkout:

```env
RAZORPAY_FOUNDING_URL=https://rzp.io/rzp/...
```

Optional at launch:

```env
RAZORPAY_TEAM_URL=
RAZORPAY_CRAM_URL=
```

If the optional URLs are blank, those forms still capture leads for manual follow-up.

After changing environment variables, redeploy the Vercel project.

---

## 9. Payment decision

### Use Razorpay first

Reasons:

- Founder is operating from India.
- Stripe onboarding for new Indian accounts is currently invite-only.
- Razorpay supports UPI, cards, net banking, and hosted Payment Links.
- The existing backend is already configured around hosted payment URLs.
- Payment Links minimise engineering work before demand is validated.

### Recommended launch links

Create a Standard Payment Link for:

- Founding Access — $29 or an equivalent INR price such as ₹2,499
- Team Pack — $149 or manually quoted
- Cram Call — $99 or manually scheduled

If targeting international candidates, activate international payments and test a real foreign-issued card before launch. Do not assume domestic activation automatically enables every international payment method.

### Stripe later

Consider Stripe only when:

- The company has an approved active Stripe account
- International sales dominate
- Subscription billing becomes important
- The team needs a more complete global billing stack

---

## 10. Critical security and product gaps

These are the most important facts for the CTO.

### P0 — paid content is publicly bundled

All current questions, correct-answer indexes, and explanations live in `app.js`. Anyone can inspect source code and extract them.

The Pro gate is adequate only for validation and honest early adopters. It is not a secure paid-content boundary.

**Production fix:**

1. Move paid scenarios and answers into Supabase.
2. Create a server endpoint that verifies entitlement.
3. Return only the current scenario, not the entire answer bank.
4. Submit answers to the server and return the explanation after grading.
5. Never send future questions or answer keys in the initial browser bundle.

### P0 — payment does not automatically grant access

Payment Links redirect customers, but there is no verified webhook or fulfilment automation yet.

**Production fix:**

1. Add a Razorpay webhook endpoint.
2. Verify Razorpay webhook signatures with a server-only secret.
3. Store provider payment IDs and enforce idempotency.
4. Mark payment intents as paid.
5. Generate an access code or entitlement.
6. Send transactional access email.

Never trust a browser redirect or query parameter as proof of payment.

### P0 — no rate limiting

Public endpoints can be spammed.

Add:

- Per-IP and per-session rate limits
- Request-size limits
- Bot protection on lead and issue forms
- Structured server logs without secrets

### P0 — production demo code

`access-config.js` contains a local-only `DEMO-ACCESS` fallback. Hosted production currently ignores it because backend mode is enabled, but remove the file or exclude the demo code before a serious public launch to avoid confusion.

### P1 — no real customer account

Access codes are acceptable for the first cohort. For a full product, add:

- Supabase Auth magic-link login
- `profiles` table
- `entitlements` or `purchases` table
- Server-authorized paid routes
- Progress synchronization across devices
- Passwordless account recovery

### P1 — marketed team features are incomplete

Do not actively sell the Team Pack as automated software until these exist:

- Seat invitations
- Team ownership
- Per-learner progress
- Manager dashboard
- CSV export

Until then, sell it as a manually delivered cohort package.

### P1 — privacy and legal operations

Before meaningful paid traffic, add:

- Privacy policy
- Terms
- Refund policy
- Support/contact email
- Data deletion request process
- Cookie/analytics disclosure if required
- Invoice and tax handling appropriate to the business entity

---

## 11. Recommended production data model additions

Do not add all of these before validation. These support the full product phase.

### `scenarios`

- `id`
- `domain_id`
- `objective`
- `difficulty`
- `prompt`
- `artifact_type`
- `artifact_content`
- `options`
- `correct_answer`
- `explanation`
- `official_doc_urls`
- `review_status`
- `version`
- `published_at`

### `purchases`

- `id`
- `user_id` / email
- `provider`
- `provider_payment_id`
- `provider_order_id`
- `plan`
- `amount`
- `currency`
- `status`
- `paid_at`
- unique provider payment constraint

### `entitlements`

- `id`
- `user_id`
- `plan`
- `active`
- `starts_at`
- `expires_at`
- `source_purchase_id`

### `scenario_attempts`

- `user_id`
- `scenario_id`
- `selected_answer`
- `correct`
- `duration_seconds`
- `attempted_at`

### `teams`, `team_members`

Only after team demand is proven.

---

## 12. Analytics already emitted

- `landing_viewed`
- `diagnostic_started`
- `diagnostic_completed`
- `email_captured`
- `pricing_clicked`
- `founding_access_clicked`
- `checkout_redirected`
- `pro_gate_attempted`
- `pro_gate_unlocked`
- `issue_reported`

### Funnel dashboard to build

Track:

```text
landing_viewed
  → diagnostic_started
  → diagnostic_completed
  → email_captured
  → founding_access_clicked
  → checkout_redirected
  → payment_succeeded
  → first_paid_scenario_completed
```

### Validation metrics

Initial decision metrics:

- Landing → diagnostic start
- Diagnostic completion rate
- Completion → email capture
- Email capture → checkout click
- Checkout click → paid
- Refund rate
- Paid user → first Pro scenario
- Pro lab completion

Business validation target:

- First 10 stranger purchases
- At least three qualitative buyer interviews
- Evidence of which message/channel created each purchase

If qualified traffic completes the diagnostic but does not purchase, fix positioning, trust, price, or paid value before building more infrastructure.

---

## 13. Required content work

Technology cannot compensate for weak or inaccurate exam preparation.

### Content quality pipeline

Every scenario should have:

- Public GH-600 objective mapping
- Original scenario and artifacts
- One defensibly best answer
- Explanation of why it is best
- Explanation of why each distractor fails
- Official documentation references
- Difficulty rating
- Reviewer name/status
- Version and last review date

### Release target

Before raising the price to $49:

- 60+ reviewed scenarios
- At least 10 scenarios in the highest-weighted/highest-demand area
- Three timed mixed-domain mocks
- No duplicated question logic
- No claims of containing real or recalled exam questions
- At least one qualified subject-matter reviewer

### Trust assets

- Show one complete free scenario
- Publish the content-review process
- Add real founder identity/contact
- Add early-user testimonials only after permission
- Show anonymized readiness improvement only when backed by real data

---

## 14. Execution roadmap

### P0 — first real payment

1. Merge `codex/paid-ready-mvp` into `main`.
2. Import the GitHub repository into Vercel.
3. Run `supabase/schema.sql`.
4. Add Supabase server environment variables in Vercel.
5. Create the Razorpay Founding Access Payment Link.
6. Add `RAZORPAY_FOUNDING_URL` in Vercel.
7. Add support email, Privacy, Terms, and Refund pages.
8. Deploy.
9. Test lead, diagnostic, payment, code issuance, and Pro access with a real low-value/test transaction.
10. Launch to a small qualified audience.

### P1 — automate fulfilment and protect paid content

1. Add Razorpay webhook verification.
2. Add `purchases` and `entitlements`.
3. Generate and email access automatically.
4. Move paid scenarios out of `app.js`.
5. Add authenticated scenario/grading endpoints.
6. Add rate limiting and abuse protection.
7. Add production error monitoring.
8. Add admin views for payments, access, issues, and refunds.

### P2 — full product

1. Supabase Auth magic-link accounts.
2. Cross-device progress.
3. 60+ reviewed scenarios and three mock exams.
4. Objective-level recommendations and official-doc links.
5. Team seats and manager dashboard after demand is proven.
6. Automated email sequences.
7. SEO content and public study guide.

---

## 15. Definition of done

### Launch-ready MVP

- [ ] Branch merged into `main`
- [ ] Public HTTPS Vercel URL
- [ ] Supabase schema applied
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_SECRET_KEY` configured server-side
- [ ] Founding Razorpay link configured
- [ ] Free diagnostic works on mobile and desktop
- [ ] Lead appears in Supabase
- [ ] Diagnostic appears in Supabase
- [ ] Payment can be completed
- [ ] Buyer receives a valid access code
- [ ] Hosted Pro gate verifies against Supabase
- [ ] Issue report appears in Supabase
- [ ] Privacy, terms, refund, and support pages published
- [ ] No real server secrets in GitHub or browser assets

### Secure automated product

- [ ] Webhook signature verification
- [ ] Idempotent payment fulfilment
- [ ] Paid scenarios absent from public bundles
- [ ] Server-side answer grading
- [ ] Automated access email
- [ ] Rate limiting
- [ ] Monitoring and alerts
- [ ] Refund/revocation process
- [ ] Data deletion process

---

## 16. Inputs the CTO needs from the founder

The founder should provide or decide:

1. Explicit permission to merge/push the implementation to `main`.
2. Vercel account/project access or ownership.
3. Confirmation that `supabase/schema.sql` was executed successfully.
4. Confirmation that the Supabase server secret is present in Vercel.
5. Razorpay Founding Access Payment Link.
6. Razorpay webhook secret when fulfilment automation starts.
7. Support email.
8. Business/legal name shown at checkout and in policies.
9. Refund policy approval.
10. Domain name, if available.
11. Final launch price and currency strategy.
12. Who owns scenario accuracy and review sign-off.
13. Launch channels: Reddit, LinkedIn, X, GitHub communities, partner audiences, or direct outreach.

Do not send server secrets through chat or commit them to GitHub. Add them directly to the relevant deployment environment.

---

## 17. Suggested ownership

### Founder

- Positioning
- Pricing
- Customer interviews
- Distribution
- Support
- Refund decisions
- Content-source coordination

### CTO

- Deployment
- Database ownership
- Payment and webhook security
- Authentication and entitlement architecture
- Monitoring
- Backup/recovery
- Privacy/security implementation

### Subject-matter reviewer

- Scenario correctness
- Objective mapping
- Explanation quality
- Documentation references
- Version review after exam changes

---

## 18. Ready-to-paste Claude prompt

```text
You are acting as the CTO for GH600 Lab.

Repository: https://github.com/nickzsche21/GH600
Implementation branch: codex/paid-ready-mvp

First read CTO-HANDOFF.md, README.md, supabase/schema.sql, app.js, and every file under api/.

Do not migrate frameworks merely for preference. The current product is a static frontend with Vercel Functions and Supabase REST. Preserve the premium visual design.

Goal: deliver a production-ready paid certification-prep product in stages.

Phase 1 — launch readiness:
1. Audit the implementation branch against main.
2. Verify the Supabase schema and all environment-variable names.
3. Deploy to Vercel and run a complete diagnostic/email/payment/access test.
4. Add Privacy, Terms, Refund, and Support pages.
5. Fix any blocker that prevents the first real payment.

Phase 2 — secure paid fulfilment:
1. Implement Razorpay webhook signature verification and idempotent payment storage.
2. Add purchases and entitlements.
3. Generate and send access automatically.
4. Move paid scenarios and answer keys out of public JavaScript.
5. Add server-authorized scenario retrieval and server-side grading.
6. Add rate limits, monitoring, and safe structured errors.

Phase 3 — full product:
1. Add passwordless accounts and cross-device progress.
2. Support a reviewed 60+ scenario bank and three timed mocks.
3. Add objective-level recommendations and official documentation links.
4. Implement team features only after team demand is validated.

Constraints:
- Never expose Supabase secret/service-role keys.
- Never trust checkout redirects as proof of payment.
- Never ship real, recalled, or unauthorized exam content.
- Do not claim unfinished team features are automated.
- Keep server-owned plan pricing.
- Keep a documented local demo path, but remove public production demo credentials.
- Add tests for every payment, entitlement, and security-critical change.

Before changing code, produce:
1. A concise architecture audit.
2. A list of blockers ranked P0/P1/P2.
3. The exact files and migrations you will change.
4. Any credentials or business decisions required from the founder.

Then implement P0 items first, run tests, and document deployment and rollback.
```

---

## 19. Final recommendation

The right next step is not more landing-page polish.

The correct sequence is:

```text
merge → deploy → connect Supabase → connect Razorpay → test one purchase
→ recruit 10 buyers → learn why they paid → secure/automate the proven flow
→ expand reviewed content → add accounts and team features
```

The product can make money if it earns trust, saves serious candidates time, and reaches qualified GH-600 candidates. The software is now close enough to test that hypothesis. Distribution and content quality are the constraints; the frontend is not.

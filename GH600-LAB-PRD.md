# GH600 Lab — Product Requirements Document

**Document status:** Implementation and launch verification baseline  
**Version:** 1.0  
**Prepared:** 2026-07-05  
**Product owner:** Founder, GH600 Lab  
**Technical owner:** CTO  
**Content owner:** GH-600 subject-matter reviewer  
**Repository:** https://github.com/nickzsche21/GH600  
**Implementation branch:** `codex/paid-ready-mvp`  

---

## 1. Purpose of this document

This PRD is the product source of truth for GH600 Lab.

It defines:

- The customer problem and business hypothesis
- The target users and jobs to be done
- The product promise and boundaries
- The complete customer journey
- The exact launch requirements
- Functional and non-functional requirements
- Content quality standards
- Payment, access, analytics, legal, and support requirements
- Verification and acceptance criteria
- What is implemented, partial, missing, or unverified
- The roadmap from paid MVP to secure full product

This document should be used by the founder, CTO, designers, subject-matter reviewers, Claude, and any contractors working on the product.

When implementation and this PRD disagree, the team must explicitly decide whether to change the implementation or revise this PRD. Do not silently redefine product behavior in code.

---

## 2. Executive summary

GH600 Lab is an independent practice and readiness product for the GitHub Certified: Agentic AI Developer exam, GH-600.

The product is designed around applied engineering judgment rather than memorization. Learners inspect realistic artifacts—such as MCP configurations, GitHub Actions workflows, agent policies, logs, memory records, and orchestration files—then choose the safest or most effective action.

The free product diagnoses readiness across all six published GH-600 domains. The paid product provides deeper scenario practice, explanations, progress tracking, and timed mocks.

The immediate business objective is not $5,000 MRR. It is to prove that at least 10 strangers will pay for the product and complete paid scenarios.

The immediate technical objective is to complete one trustworthy end-to-end path:

```text
qualified visitor
→ free diagnostic
→ email-gated readiness report
→ paid checkout
→ verified payment
→ granted entitlement
→ paid scenario completed
→ measurable customer outcome
```

---

## 3. Product vision

### Vision statement

Make new technical certifications easier to navigate by turning public exam objectives into realistic, diagnostic, hands-on practice.

### Initial wedge

GH-600 is the initial wedge because it is new, technically complex, and focused on engineering decisions that are poorly served by vocabulary-only study materials.

### Long-term product direction

If GH600 Lab validates demand, the product may expand into a broader certification-readiness platform for agentic AI and GitHub certifications.

Expansion is not part of the launch scope. The team must prove the GH-600 use case first.

---

## 4. Product principles

1. **Readiness over question volume.** The product should tell learners what to do next, not merely show a score.
2. **Judgment over memorization.** Questions should require decisions under realistic constraints.
3. **Original content only.** No real, recalled, leaked, or unauthorized exam material.
4. **Public-objective alignment.** Every scenario must map to a published objective or supporting official documentation.
5. **Evidence over hype.** Do not claim guaranteed passing, complete coverage, or score improvement without evidence.
6. **Security proportional to value.** Paid content and payment fulfilment must become genuinely protected before meaningful scale.
7. **Validate before expanding.** Do not build complex team or subscription features before customers pay for the core product.
8. **Fast feedback.** Every issue report and incorrect-content signal must be traceable and reviewable.

---

## 5. Market and timing hypothesis

### Hypothesis

Candidates will pay for focused preparation when:

- The exam is new or changing
- Official training is limited or hard to translate into practice
- The candidate has a deadline or career incentive
- The product quickly identifies weak areas
- Practice feels more realistic than generic quiz banks
- The price is materially lower than the perceived cost of failing or wasting study time

### Current timing advantage

At the time of this PRD, Microsoft describes the GitHub Certified: Agentic AI Developer certification as beta. The product team must re-check official status, skills measured, duration, and domain weights before every major release.

Official references:

- Certification: https://learn.microsoft.com/en-us/credentials/certifications/agentic-ai-developer/
- Study guide: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600
- Course: https://learn.microsoft.com/en-us/training/courses/gh-600t00

### Major business risk

The market may be too small to support recurring revenue. Certification preparation is usually a one-time purchase. GH600 Lab should initially optimize for launch revenue, customer evidence, and repeatable acquisition—not claim MRR before a recurring product exists.

---

## 6. Problem statement

Prospective GH-600 candidates face four problems:

1. They cannot easily translate a broad skills outline into realistic decisions.
2. They do not know which domains or objectives are weak.
3. Generic study material may teach terminology without testing applied judgment.
4. They lack a trusted, time-efficient plan for the days immediately before the exam.

Existing free documentation explains concepts, but a candidate still needs to answer:

> Am I ready, where will I lose points, and what should I study next?

GH600 Lab exists to answer that question.

---

## 7. Target users

### Persona A — early certification candidate

**Profile:** Developer, DevOps engineer, platform engineer, or AI engineer planning GH-600.  
**Motivation:** Career differentiation and early credential advantage.  
**Pain:** Limited confidence about exam depth and applied expectations.  
**Willingness to pay:** Moderate when an exam date is scheduled or planned.

### Persona B — consultant or partner engineer

**Profile:** Consultant implementing GitHub, Copilot, or agentic AI workflows.  
**Motivation:** Credibility with clients and partners.  
**Pain:** Needs fast targeted preparation around tools, architecture, evaluation, and governance.  
**Willingness to pay:** Higher because certification may support revenue or client trust.

### Persona C — urgent candidate

**Profile:** Candidate sitting the exam within days.  
**Motivation:** Avoid an unsuccessful attempt.  
**Pain:** Cannot determine what to prioritize.  
**Willingness to pay:** High for a focused diagnostic, cram plan, or personal session.

### Persona D — team or training lead

**Profile:** Manager, cohort organizer, consulting firm, or internal enablement lead.  
**Motivation:** Understand team readiness and reduce wasted training/exam spend.  
**Pain:** No consolidated readiness view.  
**Willingness to pay:** Potentially high, but requires credible team features and content quality.

### Excluded initial personas

- People with no intention to pursue GH-600
- General AI learners seeking a complete beginner course
- Candidates seeking exam dumps or recalled questions
- Large enterprises requiring procurement, SSO, or contractual SLAs at launch

---

## 8. Jobs to be done

### Primary job

> When I am preparing for GH-600, help me discover my weak areas and practise realistic decisions so I can use my remaining study time effectively.

### Supporting jobs

- Help me understand how published objectives appear in production-like situations.
- Show why tempting answers are unsafe or incomplete.
- Give me a short study plan based on my performance.
- Let me rehearse under time pressure.
- Help me explain readiness to a manager or training lead.

### Emotional jobs

- Reduce exam uncertainty
- Replace vague anxiety with an actionable plan
- Build confidence based on evidence rather than motivational copy

---

## 9. Value proposition

### Core proposition

> Diagnose where you will lose points, then practise those failures with original artifact-based GH-600 scenarios.

### Supporting proposition

- Mapped to all six published GH-600 domains
- Realistic artifacts and production constraints
- Domain-level readiness, not just a score
- Original public-document-based content
- No dumps or memorization traps

### What the product must not promise

- Guaranteed passing
- Exact simulation of unreleased or confidential exam items
- Official endorsement
- Complete coverage without a verified coverage matrix
- Score improvement without evidence
- Automated team features that are not implemented

---

## 10. Official blueprint coverage

The product currently uses the following six-domain structure. The content owner must verify names and weights against the official study guide before each release.

| Domain | Working product label | Weight used by product |
|---|---|---:|
| 1 | Architecture & SDLC | 15–20% |
| 2 | Tool Use & Environment | 20–25% |
| 3 | Memory, State & Execution | 10–15% |
| 4 | Evaluation & Tuning | 15–20% |
| 5 | Multi-Agent Coordination | 15–20% |
| 6 | Guardrails & Accountability | 10–15% |

### Coverage requirement

Every published scenario must have:

- Exactly one primary domain
- A published objective mapping
- A difficulty rating
- A content version
- A review status
- Official documentation references

---

## 11. Business model and pricing

### Free diagnostic

**Price:** $0  
**Purpose:** Demonstrate value, diagnose readiness, capture qualified leads.

Includes:

- 12 scenarios
- Two scenarios per domain
- Domain readiness map
- Answer explanations
- Email-gated detailed report

### Founding Access

**Launch price:** $29 lifetime  
**Limit:** First 100 customers or a clear launch deadline  
**Purpose:** Validate willingness to pay.

Includes:

- Current 18 scenarios
- Future reviewed founding-window scenario drops
- Full readiness reporting
- Paid mock access as released

The landing page must state exactly what is available today versus promised later.

### Standard individual price

**Target price after validation:** $49 one-time

Do not raise the price until paid value includes at least:

- 60 reviewed scenarios
- Three timed mock exams
- Reliable saved progress
- Objective-level recommendations

### Team Pack

**Current marketed price:** $149 for 10 seats

Until team software exists, this must be sold as a manually delivered cohort package. Do not represent manager dashboards, CSV export, or automated seats as complete when they are not.

### Cram Call

**Price:** $99 for 60 minutes  
**Purpose:** High-intent service revenue and direct customer learning.

### Revenue math

At $29, approximately 173 purchases are required for $5,000 gross revenue. This is not recurring revenue.

A possible $5,000 launch mix:

- 100 founding purchases × $29 = $2,900
- 10 cram calls × $99 = $990
- 8 team packs × $149 = $1,192
- Total = $5,082 gross

This is a target scenario, not a forecast.

---

## 12. Product scope by phase

### Phase 0 — paid validation MVP

Must support:

- Premium public landing page
- Free 12-question diagnostic
- Domain-level readiness report
- Email capture
- Server-side lead and diagnostic storage
- Hosted payment redirect
- Manual payment confirmation
- Manual access-code issuance
- Server-side access-code verification
- 18-question Pro run
- Issue reporting
- Basic analytics
- Legal and support pages

### Phase 1 — secure automated paid product

Must add:

- Verified Razorpay webhooks
- Idempotent payment fulfilment
- Purchases and entitlements
- Automated transactional access email
- Paid content removed from public JavaScript
- Server-authorized scenario delivery
- Server-side grading
- Rate limiting and bot controls
- Monitoring and error alerts
- Refund and entitlement revocation workflow

### Phase 2 — complete individual learning product

Must add:

- Passwordless customer accounts
- Cross-device progress
- 60+ reviewed scenarios
- Three timed mock exams
- Objective-level performance
- Official-document recommendations
- Question bookmarking and review
- Versioned content updates
- Personal readiness history

### Phase 3 — team product

Only after paid team demand is proven:

- Team ownership
- Seat invitations
- Learner membership
- Manager readiness dashboard
- Cohort assignments
- CSV export
- Consolidated invoicing
- Role-based access

### Explicitly out of scope for launch

- Native mobile applications
- Social network/community
- AI-generated unreviewed questions
- Multi-certification marketplace
- Enterprise SSO
- Recurring subscription billing
- Full learning-management system

---

## 13. End-to-end customer journeys

### Journey A — free diagnostic

1. Visitor lands on the public page.
2. Visitor understands the product within five seconds.
3. Visitor starts the 12-question diagnostic without payment.
4. Questions cover all six domains.
5. Visitor selects and submits one answer per scenario.
6. Product displays correctness and an explanation.
7. Product computes readiness and domain scores.
8. Product shows a high-level result.
9. Product requests email before displaying the detailed report.
10. Lead and diagnostic are stored.
11. Detailed report appears.
12. Paid offer is shown contextually.

### Journey B — founding purchase, launch MVP

1. Visitor selects Founding Access.
2. Visitor provides email.
3. Server records a payment intent with the server-owned price.
4. Visitor is redirected to Razorpay.
5. Visitor completes payment.
6. Founder/administrator verifies payment.
7. Founder creates a unique access code tied to the buyer email.
8. Founder emails the code.
9. Buyer enters email and code in Pro access.
10. Server verifies code status, expiry, and use limit.
11. Buyer enters the Pro lab.

### Journey C — founding purchase, automated target

1. Steps 1–5 are the same as above.
2. Razorpay sends a webhook.
3. Server verifies the webhook signature.
4. Server records the payment idempotently.
5. Server grants an entitlement.
6. Transactional email sends sign-in/access instructions.
7. Customer enters the paid product.
8. First paid scenario completion is recorded.

### Journey D — team inquiry

1. Visitor selects Team Pack.
2. Visitor provides email, company/cohort, team size, and needs.
3. Lead is stored with team metadata.
4. Founder follows up manually.
5. No automated team feature is promised until built.

### Journey E — cram call

1. Visitor selects Cram Call.
2. Visitor provides email, preferred time, exam date, and weak area.
3. Lead is stored.
4. Founder confirms availability and payment.
5. Session is scheduled manually.

---

## 14. Functional requirements

Priority definitions:

- **P0:** Required before accepting real paid traffic
- **P1:** Required for a secure, automated individual product
- **P2:** Important after validation
- **P3:** Future expansion

### 14.1 Landing page

#### FR-LAND-001 — immediate comprehension — P0

The hero must communicate:

- Product is for GH-600
- Product uses hands-on scenarios
- Product diagnoses readiness
- Product is independent and unofficial

**Acceptance criteria:** A first-time visitor can identify audience, outcome, and primary action without scrolling.

#### FR-LAND-002 — primary calls to action — P0

Display:

- Take free 12-question diagnostic
- Get Founding Access — $29

#### FR-LAND-003 — trust language — P0

Top-level language should emphasize original public-document-based practice without leading with alarming legal language.

Full disclaimer must appear in footer, pricing, and checkout context.

#### FR-LAND-004 — product preview — P0

Show at least one realistic scenario preview including:

- Artifact
- Constraint/question
- Options
- Correct-answer explanation
- Domain/objective mapping

#### FR-LAND-005 — readiness-report preview — P0

Show example strengths, weaknesses, and three-day plan.

#### FR-LAND-006 — responsive behavior — P0

All content and dialogs must work at 360px mobile width, tablet, and desktop.

### 14.2 Diagnostic engine

#### FR-DIAG-001 — balanced diagnostic — P0

The diagnostic must include exactly 12 scenarios with exactly two from each domain.

#### FR-DIAG-002 — artifact representation — P0

At least one scenario per domain should include a relevant artifact when content quality permits.

#### FR-DIAG-003 — single answer — P0

Each launch diagnostic scenario allows one selected answer.

#### FR-DIAG-004 — answer feedback — P0

After submission, show:

- Whether selection was correct
- Correct option
- Explanation
- Decision principle or trade-off

#### FR-DIAG-005 — timing — P0

Display a diagnostic timer. Time expiration must result in a recoverable report rather than data loss.

#### FR-DIAG-006 — attempt persistence — P0

Store anonymous attempt data by session, then associate it with email after report capture.

#### FR-DIAG-007 — retake — P0

Allow retake with a reshuffled balanced set.

#### FR-DIAG-008 — accessible controls — P1

Questions must support keyboard operation, clear focus, and screen-reader labels.

### 14.3 Readiness report

#### FR-REP-001 — overall readiness — P0

Compute percentage as correct answers divided by total answered/assigned questions according to a documented rule.

#### FR-REP-002 — domain scores — P0

Show score for all six domains.

#### FR-REP-003 — strongest and weakest domains — P0

Identify tied strongest/weakest domains correctly.

#### FR-REP-004 — email gate — P0

Show a useful high-level score before email capture. Require email only for the detailed report.

#### FR-REP-005 — study plan — P0

Generate a three-day plan based on the weakest area. Launch may use a deterministic template.

#### FR-REP-006 — official recommendations — P1

Recommend reviewed official documentation tied to weak objectives.

#### FR-REP-007 — historical comparison — P2

Signed-in users can compare attempts over time.

### 14.4 Lead capture

#### FR-LEAD-001 — email validation — P0

Validate email in browser and server.

#### FR-LEAD-002 — attribution — P0

Capture source, page path, plan interest, score, and UTM values where available.

#### FR-LEAD-003 — deduplication strategy — P1

Define whether multiple events for one email become multiple lead records or update a canonical contact.

#### FR-LEAD-004 — consent language — P0

If promotional email will be sent, disclose it and capture appropriate consent.

### 14.5 Checkout and pricing

#### FR-PAY-001 — server-owned price — P0

The server must resolve plan, amount, and currency. Never trust a browser-submitted amount.

#### FR-PAY-002 — hosted checkout — P0

Redirect founding customers to a configured Razorpay Standard Payment Link.

#### FR-PAY-003 — missing-link fallback — P0

If checkout is not configured, preserve the lead and show a truthful manual-follow-up message.

#### FR-PAY-004 — payment proof — P1

Only a verified provider webhook or server-side provider lookup can mark payment paid.

#### FR-PAY-005 — webhook signature — P1

Reject invalid signatures. Store failed verification attempts without sensitive data.

#### FR-PAY-006 — idempotency — P1

Duplicate webhook deliveries must never create duplicate purchases or entitlements.

#### FR-PAY-007 — currency display — P0

Checkout currency and landing-page currency must match, or conversion must be clearly explained.

#### FR-PAY-008 — refund state — P1

Refund or chargeback must revoke or flag entitlement according to policy.

### 14.6 Paid access

#### FR-ACC-001 — manual code verification — P0

Verify email, active status, expiration, and use limit server-side.

#### FR-ACC-002 — no hosted demo bypass — P0

Production must not accept `DEMO-ACCESS` or any client-side allowlist.

#### FR-ACC-003 — entitlement model — P1

Represent paid access as a server-side entitlement associated with a purchase/user.

#### FR-ACC-004 — account login — P2

Use passwordless magic-link authentication unless user research requires passwords.

#### FR-ACC-005 — recovery — P1

Support must be able to restore valid customer access without exposing secrets.

#### FR-ACC-006 — revocation — P1

Administrator can revoke access after refund, fraud, or misuse.

### 14.7 Scenario delivery and grading

#### FR-SCN-001 — protected paid scenarios — P1

Paid scenario prompts, options, correct answers, and explanations must not all ship in public browser JavaScript.

#### FR-SCN-002 — authorized retrieval — P1

Server returns a paid scenario only to an entitled user/session.

#### FR-SCN-003 — server grading — P1

Submit selected option to server. Server returns correctness and explanation.

#### FR-SCN-004 — minimal disclosure — P1

Do not return future scenarios or entire answer banks in one response.

#### FR-SCN-005 — progress storage — P1

Store scenario, selection, correctness, duration, attempt, and timestamp.

#### FR-SCN-006 — content versioning — P1

Attempts must reference the version shown to the learner.

#### FR-SCN-007 — issue association — P1

Issue report should optionally include scenario id and version automatically.

### 14.8 Pro lab and mocks

#### FR-PRO-001 — paid mixed run — P0

Founding users can complete the current 18-scenario Pro run.

#### FR-PRO-002 — three timed mocks — P2

Provide three independently assembled timed mocks after content bank reaches sufficient size.

#### FR-PRO-003 — review mode — P2

After completion, allow review of incorrect answers and explanations.

#### FR-PRO-004 — resume — P2

Allow signed-in users to resume an interrupted paid attempt.

### 14.9 Team inquiries and product

#### FR-TEAM-001 — inquiry capture — P0

Capture company, expected team size, email, and message.

#### FR-TEAM-002 — manual fulfilment disclosure — P0

State that the launch team offer is manually coordinated if automated seats are unavailable.

#### FR-TEAM-003 — team accounts — P3

Support owner, manager, and learner roles.

#### FR-TEAM-004 — readiness aggregation — P3

Managers see aggregated results without exposing unnecessary personal information.

### 14.10 Cram call

#### FR-CRAM-001 — request capture — P0

Capture email, preferred time, exam date, and weak area.

#### FR-CRAM-002 — availability — P0

Do not collect payment for an unavailable time unless scheduling/refund behavior is explicit.

### 14.11 Issue reporting

#### FR-ISS-001 — report capture — P0

Store email, message, path, session, and relevant scenario context.

#### FR-ISS-002 — internal status — P1

Add triage status: new, investigating, fixed, rejected.

#### FR-ISS-003 — content correction — P1

When a scenario changes, record version and reason.

### 14.12 Administration

#### FR-ADM-001 — payment view — P1

Authorized administrator can view payment and fulfilment states.

#### FR-ADM-002 — access management — P1

Administrator can grant, resend, revoke, and audit entitlement.

#### FR-ADM-003 — issue queue — P1

Administrator can triage content and UI reports.

#### FR-ADM-004 — content publishing — P2

Content reviewer can draft, review, approve, publish, and retire scenarios.

---

## 15. Content requirements

### 15.1 Scenario schema

Every scenario must contain:

- Stable scenario id
- Title/internal name
- Primary domain
- Official objective
- Difficulty
- Scenario prompt
- Optional artifact type and content
- Answer options
- Correct-answer index
- Correct-answer explanation
- Explanation for each distractor
- Decision principle
- Official source links
- Author
- Reviewer
- Review status
- Version
- Created and updated timestamps
- Published/retired status

### 15.2 Quality standard

A scenario is publishable only when:

- One answer is clearly best under stated constraints
- Distractors are plausible but defensibly inferior
- No hidden assumption is required
- Explanation teaches a transferable principle
- Artifact syntax is valid where intended
- Terminology matches current official documentation
- Scenario is original
- Reviewer has approved it

### 15.3 Content review states

```text
draft → technical review → editorial review → approved → published
                                         ↘ rejected
published → revision required → updated version
published → retired
```

### 15.4 Content launch targets

#### Validation launch

- 18 reviewed scenarios
- Two per domain in free diagnostic availability
- At least one artifact scenario per domain

#### Standard $49 product

- 60+ reviewed scenarios
- Three timed mocks
- Coverage matrix with no high-weight objective ignored

### 15.5 Prohibited content

- Recalled exam questions
- Purchased or copied dumps
- Confidential beta details
- Verbatim copyrighted training content beyond lawful short references
- Unreviewed AI-generated questions presented as authoritative

---

## 16. Readiness scoring requirements

### Launch scoring

```text
overall readiness = correct answers / assigned questions × 100
domain score = correct answers in domain / assigned domain questions × 100
```

### Limitations

A 12-question diagnostic has low statistical reliability. The interface must call it a readiness signal, not an exact probability of passing.

### Future scoring

After sufficient real data:

- Weight by domain blueprint
- Account for difficulty
- Show confidence intervals or low-sample warnings
- Calibrate against voluntary self-reported exam outcomes

Do not implement pseudo-scientific scoring without data.

---

## 17. Data model

### Existing launch tables

#### `leads`

Stores email, source, plan interest, score, path, attribution, and metadata.

#### `analytics_events`

Stores session, optional email, event, metadata, and timestamp.

#### `diagnostic_attempts`

Stores session, email, score, domain rankings, answers, and completion state.

#### `payment_intents`

Stores email, plan, server-owned amount, currency, provider link, status, and metadata.

#### `access_codes`

Stores email, unique code, plan, active state, expiration, use limit, and uses.

#### `issue_reports`

Stores email, report, page path, session, and metadata.

### Required Phase 1 tables

#### `purchases`

- id
- customer/user id or normalized email
- provider
- provider payment id
- provider order/link id
- plan
- amount
- currency
- status
- raw event reference or safe normalized metadata
- paid/refunded timestamps
- unique provider payment constraint

#### `entitlements`

- id
- user/email
- plan
- active
- source purchase
- start/expiration
- revocation reason

#### `scenarios`

Use the content schema defined above.

#### `scenario_attempts`

- user/session
- scenario id/version
- selected answer
- correct
- duration
- attempt id
- timestamp

### Phase 2 tables

- profiles
- mock_attempts
- bookmarks
- study_recommendations

### Phase 3 tables

- teams
- team_members
- team_invitations
- cohort_assignments

---

## 18. API requirements

### Existing endpoints

- `POST /api/lead`
- `POST /api/event`
- `POST /api/diagnostic/complete`
- `POST /api/checkout-intent`
- `POST /api/access/verify`
- `POST /api/issue-report`

### Phase 1 required endpoints

- `POST /api/webhooks/razorpay`
- `GET /api/entitlement`
- `GET /api/scenarios/next`
- `POST /api/scenarios/answer`
- `POST /api/access/resend`
- authenticated progress endpoints

### API standards

Every endpoint must:

- Validate method and content type
- Validate and normalize inputs
- Enforce body-size limits
- Return structured JSON errors
- Avoid leaking internal errors or secrets
- Set no-store for sensitive responses
- Log request correlation id
- Rate-limit abuse-sensitive operations
- Test success and failure behavior

### Payment webhook standards

- Read raw body as required for signature verification
- Verify signature before parsing trusted fields
- Reject invalid signature
- Enforce idempotency by provider event/payment id
- Store safe normalized payment state
- Never grant access from a browser callback alone

---

## 19. Analytics requirements

### Existing events

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

### Required additions

- `checkout_started`
- `payment_succeeded`
- `payment_failed`
- `entitlement_granted`
- `paid_scenario_started`
- `paid_scenario_completed`
- `pro_lab_completed`
- `refund_requested`
- `refund_completed`

### Required funnel

```text
landing_viewed
→ diagnostic_started
→ diagnostic_completed
→ email_captured
→ founding_access_clicked
→ checkout_started
→ payment_succeeded
→ entitlement_granted
→ paid_scenario_completed
```

### KPI definitions

- Diagnostic start rate = diagnostic starters / qualified landing visitors
- Diagnostic completion rate = completions / starters
- Email capture rate = captured emails / diagnostic completions
- Checkout intent rate = checkout starts / captured emails
- Purchase conversion = successful payments / checkout starts
- Activation = users completing one paid scenario / paid users
- Paid completion = users completing Pro lab / activated users
- Refund rate = completed refunds / successful payments

### Validation thresholds

These are directional, not guarantees:

- 10 stranger purchases before major product expansion
- At least three buyer interviews
- At least 30 diagnostic completions before judging report usefulness
- Investigate positioning/value if qualified completions consistently produce almost no checkout activity

---

## 20. Non-functional requirements

### 20.1 Security

- Supabase secret/service-role keys exist only in server environments
- Paid answers are absent from public production bundles by Phase 1
- Payment webhook signatures are verified
- Entitlements are server-authorized
- RLS enabled on all Supabase tables
- No public table policy without explicit review
- Access and admin actions are auditable
- Logs redact secrets, codes, and sensitive payment data
- Dependencies and deployment settings receive regular security review

### 20.2 Privacy

- Collect minimum required personal data
- Explain why email is collected
- Define retention periods
- Support deletion requests
- Avoid storing payment card data
- Restrict administrator data access
- Publish Privacy Policy before meaningful traffic

### 20.3 Performance

- Landing content visible within 2.5 seconds on typical mobile broadband
- Primary interactions respond within 100ms where local
- API median response target under 500ms excluding provider latency
- Avoid large paid-content bundles
- Images and fonts optimized

### 20.4 Reliability

- Payment webhooks retry safely
- Duplicate events do not duplicate entitlement
- Diagnostic remains usable if analytics storage fails
- Lead/checkout errors display actionable retry messages
- Deployment rollback is documented

### 20.5 Accessibility

- Keyboard-operable dialogs and quiz
- Visible focus indicators
- Sufficient contrast
- Semantic labels
- Screen-reader status for answer feedback
- Reduced-motion support
- No color-only correctness indication

### 20.6 Compatibility

Support current versions of:

- Chrome
- Edge
- Safari
- Firefox
- Mobile Safari
- Chrome on Android

### 20.7 Maintainability

- Plan pricing defined once on server
- Environment variables documented
- Tests cover business-critical rules
- Content separated from application logic by Phase 1
- Migrations versioned
- No framework migration without explicit benefit

---

## 21. Design and copy requirements

### Visual direction

- Premium technical lab, not cheap course marketplace
- Dark/acid-green visual system may remain
- Strong artifact and terminal metaphors
- High information clarity
- Minimal distracting animation

### Copy hierarchy

1. Outcome
2. Mechanism
3. Proof/product preview
4. Free diagnostic
5. Paid value
6. Trust/legal context

### Approved trust banner direction

> Original GH-600 practice lab. Public-doc based scenarios. No dumps. No memorization traps.

### Full disclaimer

> GH600 Lab is an independent, unofficial practice product and is not affiliated with GitHub, Microsoft, Pearson VUE, or the official GH-600 exam. All scenarios are original and based on public objectives and documentation. No recalled or unauthorized exam content is included.

### Copy restrictions

- No fake scarcity
- No fake testimonials
- No fabricated learner counts
- No guaranteed pass language
- No claim that unofficial content is official
- Clearly separate live features from roadmap promises

---

## 22. Legal and customer operations requirements

Required before paid launch:

- Privacy Policy
- Terms of Service
- Refund Policy
- Support email
- Business identity at checkout
- Contact method
- Disclaimer
- Consent language for marketing email

### Proposed founder refund rule

Current draft:

> Request a refund within seven days if fewer than 25% of paid scenarios have been completed.

Legal/business owner must approve this and confirm it is operationally measurable before publication.

### Support workflow

Support must handle:

- Payment succeeded but access missing
- Access code invalid
- Email mismatch
- Refund request
- Incorrect question/report
- Data deletion request
- Team inquiry
- Cram-call scheduling

Define response-time expectation without promising an SLA the founder cannot meet.

---

## 23. Payment provider requirement

### Launch provider

Razorpay is the recommended launch provider for an India-based founder because it provides hosted Payment Links and local payment methods. Stripe may be reconsidered later if the business receives access and international needs justify it.

### Launch implementation

- Razorpay Standard Payment Link
- Fixed server-owned price
- Founding link stored as Vercel environment variable
- Manual access for validation cohort

### Automated implementation

- Razorpay webhook
- Server-side signature verification
- Idempotent payment recording
- Entitlement grant
- Transactional access email
- Refund/revocation handling

### Required payment verification tests

- Successful payment
- Failed payment
- Abandoned checkout
- Duplicate webhook
- Invalid signature
- Refunded payment
- Email mismatch
- International payment if offered

---

## 24. Email requirements

### Launch manual email

Must include:

- Purchase confirmation
- Access instructions
- Unique code or magic link
- Product URL
- Support email
- Refund-policy link

### Automated transactional email

Use a reputable provider such as Resend, Postmark, or equivalent.

Required templates:

- Access granted
- Access resent
- Payment received
- Refund completed
- Issue response
- Optional diagnostic report link

Marketing email must be separated from transactional email consent and behavior.

---

## 25. Current implementation verification matrix

Status meanings:

- **Verified:** Implemented and locally tested
- **Partial:** Some behavior exists; production requirement incomplete
- **Missing:** Not implemented
- **Unverified:** Claimed/configured externally but not proven end to end

| Capability | Status | Notes / next verification |
|---|---|---|
| Premium landing page | Verified | Existing static frontend |
| Soft trust banner | Verified | Full disclaimer lower on page |
| 12-question diagnostic | Verified | Balanced across six domains |
| 18 total live scenarios | Verified | Still client-bundled |
| Artifact scenarios | Verified | Six current artifact labs |
| Domain readiness report | Verified | Deterministic scoring |
| Email gate | Verified | Local fallback and API call |
| Lead API | Verified | Automated tests pass |
| Analytics API | Verified | Automated tests pass |
| Diagnostic API | Verified | Automated tests pass |
| Checkout-intent API | Verified | Server owns pricing |
| Issue-report API | Verified | Automated wiring check |
| Access-code API | Verified | Validates email/expiry/use |
| Supabase project exists | Claimed | Founder reports connection |
| Supabase schema applied | Unverified | Check all six tables in dashboard |
| Supabase server secret in Vercel | Unverified | Publishable key alone is insufficient |
| Vercel deployment | Unverified | Public HTTPS URL required |
| Razorpay Founding link | Missing | Founder must create/provide |
| Real checkout test | Missing | Test after deployment |
| Payment webhook | Missing | Required Phase 1 |
| Automatic entitlement | Missing | Manual code only |
| Transactional email | Missing | Manual email only |
| Secure paid content | Missing | All questions/answers in `app.js` |
| Rate limiting | Missing | Required before meaningful traffic |
| Production monitoring | Missing | Add after deployment |
| Privacy page | Missing | P0 |
| Terms page | Missing | P0 |
| Refund page | Missing | P0 |
| Support email | Unverified | Founder decision needed |
| 60+ reviewed scenarios | Missing | Content roadmap |
| Three timed mocks | Missing | Content roadmap |
| Passwordless accounts | Missing | Phase 2 |
| Cross-device progress | Missing | Phase 2 |
| Team dashboard | Missing | Do not sell as automated |
| CSV team export | Missing | Do not sell as implemented |

---

## 26. P0 launch requirements

The product is not approved for real paid traffic until all required P0 items below are checked.

### Repository and deployment

- [ ] Implementation branch reviewed
- [ ] Implementation merged to `main`
- [ ] Production Vercel project connected to repository
- [ ] Public HTTPS URL works
- [ ] Production deploy is based on intended commit
- [ ] Rollback procedure documented

### Supabase

- [ ] `supabase/schema.sql` executed
- [ ] All expected tables exist
- [ ] RLS enabled
- [ ] No unintended public policies
- [ ] `SUPABASE_URL` configured in Vercel
- [ ] `SUPABASE_SECRET_KEY` configured in Vercel
- [ ] Secret absent from GitHub and browser assets
- [ ] Lead write proven in production
- [ ] Diagnostic write proven in production
- [ ] Issue write proven in production

### Payment

- [ ] Razorpay account activated
- [ ] Founding Payment Link created
- [ ] Amount/currency matches page
- [ ] `RAZORPAY_FOUNDING_URL` configured
- [ ] Successful payment tested
- [ ] Failed/abandoned payment behavior tested
- [ ] Manual payment-verification procedure documented
- [ ] Manual unique-code procedure documented
- [ ] Buyer access email template ready

### Product

- [ ] Mobile landing verified
- [ ] Diagnostic completion verified
- [ ] Email report verified
- [ ] Pro code verification verified on hosted site
- [ ] `DEMO-ACCESS` cannot unlock hosted production
- [ ] Every live scenario reviewed
- [ ] Claims match available content
- [ ] Team features accurately described as manual if incomplete

### Legal/support

- [ ] Support email published
- [ ] Privacy Policy published
- [ ] Terms published
- [ ] Refund Policy published
- [ ] Full independent-product disclaimer published
- [ ] Founder/business identity available at checkout

### Analytics

- [ ] Production events appear in Supabase
- [ ] Funnel can be reconstructed by session/email
- [ ] No sensitive secrets or payment data in event metadata

---

## 27. QA plan

### 27.1 Landing QA

- Hero and both CTAs render
- Navigation works
- Scenario preview readable
- Pricing readable
- Footer links work
- No horizontal scrolling at 360px
- Dialogs fit mobile viewport

### 27.2 Diagnostic QA

- Exactly 12 questions
- Every domain represented twice
- Answer cannot submit before selection
- Correct and incorrect styling accessible
- Explanation matches correct answer
- Timer behavior tested
- Close/reopen behavior understood
- Retake works
- Report scores match answers

### 27.3 Data QA

- Anonymous diagnostic stored once
- Email association updates intended attempt
- Lead metadata correct
- UTM attribution correct
- API rejects invalid email
- API rejects invalid JSON/content type
- Storage outage does not destroy local diagnostic experience

### 27.4 Checkout QA

- Founder price cannot be changed from browser payload
- Founder button redirects to expected Razorpay host
- Missing link produces truthful fallback
- Team/cram forms store metadata
- No fake success before payment

### 27.5 Access QA

- Correct email/code unlocks
- Wrong email fails
- Wrong code fails
- Inactive code fails
- Expired code fails
- Max-use code fails after limit
- Use count increments
- Hosted app ignores local demo allowlist

### 27.6 Security QA

- Search repository for secret patterns
- Inspect browser source for paid answer keys before Phase 1 release
- Verify RLS
- Test endpoint rate limits when implemented
- Verify webhook invalid-signature rejection
- Test duplicate webhook idempotency
- Confirm logs redact secrets

### 27.7 Legal QA

- Disclaimer consistent across landing, checkout, and policies
- Refund behavior matches policy
- Support address receives mail
- Marketing consent behavior matches copy

---

## 28. Launch plan

### Stage 1 — internal verification

- Founder and CTO complete full funnel
- Content reviewer checks all 18 scenarios
- One test/manual payment
- One access grant
- One refund simulation

### Stage 2 — private beta

- Recruit 5–10 qualified candidates
- Observe diagnostic completion
- Conduct interviews
- Fix confusing questions and checkout failures
- Ask for testimonial permission only after genuine use

### Stage 3 — paid founding launch

- Publish value-first GH-600 study content
- Link free diagnostic as secondary CTA
- Clearly disclose founding content availability
- Limit support load
- Track source of every purchase

### Stage 4 — decision

Continue investment when evidence shows:

- Real purchases from non-friends
- Paid users complete scenarios
- Customers describe a clear value reason
- Content trust remains high
- Acquisition channel can be repeated

Pause or reposition when:

- Qualified candidates complete diagnostic but show no purchase intent
- Buyers request refunds because content is too small or inaccurate
- Exam demand is materially lower than expected
- Acquisition cost exceeds realistic order value

---

## 29. Distribution requirements

### Launch channels

- LinkedIn posts demonstrating one technical GH-600 concept
- Reddit value-first study checklist posts where rules permit
- X/Twitter artifact scenario threads
- GitHub/Copilot communities where promotion is allowed
- Direct outreach to consultants and certification candidates
- Partner/trainer outreach

### Content-led launch format

Every promotional post should provide standalone value before linking the product.

Example structure:

1. Explain one misunderstood GH-600 concept.
2. Show a small original artifact/problem.
3. Explain the decision principle.
4. Offer the free diagnostic for deeper readiness testing.

### Prohibited distribution

- Spam
- Fake scarcity
- Fake learner counts
- Purchased fake testimonials
- Claiming official affiliation
- Selling in communities that prohibit promotion

---

## 30. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Market too small | Revenue ceiling | Validate 10 purchases before expansion |
| Exam changes | Content becomes stale | Version objectives and review before releases |
| Content error | Trust damage | SME review and issue workflow |
| Paid content exposed | Piracy/value loss | Server-delivered scenarios in Phase 1 |
| Fake payment/access | Revenue loss | Verified webhooks and entitlements |
| Spam endpoints | Cost/noise | Rate limits and bot controls |
| Misleading team claims | Refund/trust risk | Manual-offer disclosure |
| Payment onboarding delay | Launch delay | Start with hosted Razorpay link/manual fulfilment |
| International payment failure | Lost customers | Activate/test international payments or use alternative provider |
| Legal/privacy gaps | Compliance/trust risk | Publish policies and minimize data |
| Founder support overload | Poor experience | Limit founding cohort and document support process |
| Overbuilding | Delayed validation | Enforce phase gates |

---

## 31. Dependencies

### External

- Microsoft/GitHub public GH-600 objectives and documentation
- Supabase project
- Vercel account/project
- Razorpay account and Payment Link
- Transactional email provider in Phase 1
- Domain/DNS if custom domain used
- Qualified content reviewer

### Founder decisions

- Direct merge/release approval
- Support email
- Business identity
- Final currency and price
- Refund policy
- Launch date
- Founding limit/deadline
- Content delivery commitment
- Distribution ownership

---

## 32. Team ownership

### Founder / product owner

- Customer interviews
- Pricing and offer
- Distribution
- Support process
- Refund decisions
- Final product claims
- Launch decision

### CTO

- Architecture
- Deployment
- Database security
- Payment verification
- Access/entitlement security
- Monitoring
- Incident response
- Technical acceptance

### Content lead / SME

- Blueprint mapping
- Scenario correctness
- Explanation quality
- Official references
- Content release approval
- Change review

### Designer/front-end owner

- Responsive behavior
- Accessibility
- Conversion clarity
- Consistent product UI

---

## 33. Open decisions

The team must resolve these before or immediately after launch:

1. Is launch price displayed as USD $29, INR ₹2,499, or localized?
2. Is international Razorpay payment activation complete?
3. What exact date or customer count ends Founding Access?
4. What future content is guaranteed to founders?
5. Who signs off each scenario?
6. What support email is public?
7. What business/legal name appears at checkout?
8. Is the proposed refund rule approved and measurable?
9. Will diagnostic users receive marketing email, and how is consent captured?
10. Will paid MVP use manual codes until 20 buyers, or automate sooner?
11. Which transactional email provider will be used?
12. What event defines an activated paid customer?

---

## 34. Definition of success

### Product validation success

- At least 10 purchases from people who are not friends/team
- Majority of paid buyers begin paid practice
- At least three buyers can clearly explain why they paid
- Low content-error rate
- Refund requests do not indicate fundamental value mismatch

### Technical launch success

- Complete diagnostic-to-access flow works on production
- No server secrets exposed
- Payment and access states are traceable
- Customer can recover from common failures
- Founder can support customers without direct database improvisation

### Content success

- Scenarios are defensible and original
- Weak-area feedback feels specific and useful
- Users report that artifact scenarios improve decision understanding

---

## 35. Final release gate

The founder, CTO, and content owner must each approve their domain.

### Founder approval

- [ ] Offer and pricing accurate
- [ ] Support ready
- [ ] Refund policy ready
- [ ] Launch audience identified

### CTO approval

- [ ] Production deployment verified
- [ ] Database and secrets verified
- [ ] Payment path verified
- [ ] Access path verified
- [ ] Monitoring and rollback adequate for launch stage

### Content approval

- [ ] All live questions reviewed
- [ ] Blueprint mappings verified
- [ ] Explanations defensible
- [ ] No unauthorized content

### Go / no-go rule

Do not accept public paid traffic when any of these is true:

- Checkout destination is unverified
- Payment cannot be reliably confirmed
- Buyer access procedure is undefined
- Supabase secret is exposed
- Live content has not been reviewed
- Refund/support channel is unavailable
- Landing page promises features that cannot be delivered

---

## 36. Implementation instruction for Claude

```text
Treat GH600-LAB-PRD.md as the product source of truth.

Before implementing:
1. Compare every P0 requirement with the current codex/paid-ready-mvp branch.
2. Update the implementation verification matrix with evidence.
3. List blockers ranked P0/P1/P2.
4. Identify required founder decisions and external credentials.
5. Produce a small implementation plan with exact files and migrations.

Implementation sequence:
1. Complete and verify P0 launch requirements.
2. Deploy and test one end-to-end purchase manually.
3. Implement verified webhook fulfilment and entitlements.
4. Move paid scenarios and grading server-side.
5. Add account/progress features only after the paid flow is reliable.
6. Add team software only after team demand is validated.

Rules:
- Do not migrate to Next.js merely because Supabase examples use Next.js.
- Never expose Supabase secret/service-role keys.
- Never trust browser payment callbacks as payment proof.
- Never ship paid answer banks in public JavaScript after Phase 1.
- Preserve server-owned pricing.
- Preserve the premium visual direction.
- Do not claim unfinished features.
- Add tests for every business-critical rule.
- Update this PRD when an approved product decision changes behavior.

At handoff provide:
- Files changed
- Migrations
- Environment variables
- Test evidence
- Deployment evidence
- Known limitations
- Rollback instructions
- Updated verification matrix
```

---

## 37. Immediate next actions

Execute in this order:

1. Review and approve this PRD.
2. Merge `codex/paid-ready-mvp` into `main`.
3. Verify the Supabase schema and server secret in Vercel.
4. Create the Razorpay Founding Access link.
5. Add support email and legal pages.
6. Deploy production.
7. Complete one test/manual purchase and access grant.
8. Recruit the first 5–10 qualified testers.
9. Fix product and content issues found by real use.
10. Launch the founding offer.
11. Build webhook automation and secure paid scenario delivery.
12. Expand content only with an enforced review pipeline.

The product is ready to be verified and launched as a manual paid MVP once P0 is complete. It is not yet a secure, automated, full-fledged SaaS until the Phase 1 requirements are implemented.

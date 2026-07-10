# Known issues / intentional MVP shortcuts

Read this before "fixing" one of these — some are deliberate tradeoffs for
a pre-revenue MVP, not oversights.

## Resolved: `DEMO-ACCESS` / wildcard code, localStorage gate, non-atomic `uses`, diagnostic ownership

As of the Paddle/Wise + entitlement-core pass:
- `access-config.js` no longer ships a wildcard (`email: "*"`) or
  `DEMO-ACCESS` code — the array is empty by default;
  `tests/static.test.js` asserts neither string is reachable.
- `backend-config.js` sets `enabled: true` unconditionally on any `https:`
  host (only falls back on `file:`), so the local-preview path can't
  silently activate in a real deploy.
- The Pro-lab gate now requires a server-issued, HMAC-enveloped,
  revocable session token (`gh600lab-session-token`, verified via
  `/api/access/session`) — setting the old
  `localStorage["gh600lab-pro-access"] = "granted"` flag in devtools no
  longer does anything.
- `access_codes.uses` increments via the atomic `redeem_access_code`
  Postgres RPC (single `UPDATE ... RETURNING`), closing the old
  read-then-write race on `max_uses`. Repeated failures lock the code for
  15 minutes (`register_failed_code`).
- `api/diagnostic/complete.js`'s update-by-`attempt_id` now requires the
  caller's `session_id` to match the stored row (404 otherwise).

See `docs/architecture/system-map.md` and `docs/engineering/api-contracts.md`
for the current mechanism.

## Blank checkout URLs (`checkout-config.js`, Paddle/Wise env vars)

`window.GH600_CHECKOUT` is empty by default and only used as a fallback
when `/api/checkout-intent` doesn't return a `redirect_url` (i.e. the
matching `PADDLE_CHECKOUT_*`/legacy `RAZORPAY_*_URL` env var isn't set in
Vercel). Team/Cram never have a card redirect by design — their public CTAs
open a prefilled email to the founder, followed by manual payment and
Wise/`admin/grant`. Until Paddle links are configured, Founding-Access
checkout falls back to "Request saved — I'll follow up personally"
(manual follow-up). This is expected pre-launch behavior, not a bug.

## Single hand-authored free-diagnostic bank; paid bank now server-side

The free 12-question diagnostic still lives inline in `app.js`
(`questions` array, intentionally public — it's the lead magnet). The
paid 18-scenario Pro lab has been migrated into the `scenarios` table
(`scripts/seed-scenarios.js`) and is served one question at a time via
`/api/scenarios/next`/`answer`, so the answer key is no longer readable
from page source. No CMS, versioning, or review-status tracking yet for
either bank, though `GH600-Lab-Launch-Plan.md` ("Quality moat") calls for
objective IDs, source links, review status, and last-verified dates per
scenario. Don't build that tooling speculatively — the launch plan's kill
criteria gate whether either bank is worth expanding at all (`CLAUDE.md`
rule 6).

## Deferred hardening (tracked, not yet done)

Founder-approved deferrals from the Paddle/Wise pass — see the plan's
"Deferred to a follow-up pass" section: automated transactional email,
rate limiting / bot controls. Privacy, Terms, and Refund routes are now implemented; support is available through the published email and issue form.
beyond per-code lockout, CORS allowlist + security headers, PostgREST
filter URL-encoding, and monitoring/error alerts. Per the PRD's go/no-go
gate, public paid traffic should not open until these land.

## No CI

Tests (`npm test`) and syntax check (`npm run check`) exist but run only
locally/manually — there's no GitHub Actions or Vercel build-check wiring
them in yet. If you add one, keep it proportional to the project's size.

## Code review — paid-lab pass (2026-07-06) — all 10 findings fixed 2026-07-06/07

High-effort review of the working-tree changes (Paddle/Wise payments,
entitlements, revocable sessions, server-graded scenarios). Findings are
ranked by severity and verified against the current files. Several landed on
the revenue flow (payment → entitlement → Pro lab) and contradicted the
"Resolved" section above — those were **reopened**, then fixed per
`docs/plans/code-review-fixes-2026-07-06.md`. Status per finding below;
kept for history (each finding is what the review found *before* the fix).

### Revenue-critical (fix before any paid traffic)

1. **Paddle buyer never gets access** — `api/webhooks/paddle.js:64`.
   `transaction.completed` reads the email from `data.custom_data.email`,
   but checkout sends buyers to a static hosted Paddle link (`app.js:508`
   → `providers.js` → `plans.js`) with no `custom_data` attached. `email`
   is always `""`, the `if (plan && email)` guard (line 65) is false, and
   `recordPurchase`/`grantEntitlement` never run. Every real payment
   records nothing. Pull the email from Paddle's `customer`/`data` payload,
   not `custom_data`.

2. **Re-login permanently locks out paying customers** —
   `api/access/verify.js:15` + `api/_lib/entitlements.js:69`.
   `grantEntitlement` is called with `source:'manual'` and no
   `source_purchase_id`/`reference`, so the dedup branches are skipped and
   a new entitlement inserts on every login while `redeem_access_code`
   burns a `use`. Sessions expire at 30 days (`SESSION_TTL_MS`) with **no
   end-user renewal endpoint** (only `admin/grant`). A single-use-code
   customer who clears storage or returns after 30 days hits
   `uses < max_uses` = false and is locked out of content they paid for.
   This reopens the "atomic `uses`" resolution above — atomicity was fixed,
   idempotency was not. Make redemption idempotent for an already-entitled
   email, or reissue a session from the existing active entitlement.

3. **A partial refund / credit / tax adjustment revokes Pro** —
   `api/webhooks/paddle.js:85`. `REFUND_EVENTS` includes
   `adjustment.created` and the handler calls `revokeEntitlement`
   unconditionally, with no check of the adjustment's action or amount.
   Paddle emits `adjustment.created` for partial refunds, credits, and tax
   adjustments — a $1 credit strips a paying customer's access. Gate on
   `data.action === 'refund'` + full-amount before revoking.

4. **Access code with a plan alias yields an empty lab** —
   `api/access/verify.js:17`. The raw `access_codes.plan` value is passed
   to `grantEntitlement`/session without `resolvePlan` normalization, and
   `access_codes.plan` has no CHECK constraint. A code seeded with
   `plan:'founder'` (an alias) stores `entitlement.plan='founder'`, then
   `contentTiers('founder')`/`allowedMocks('founder')` fall through to `[]`.
   Normalize with `resolvePlan(redeemed.plan).id` before granting.

### Pro-lab correctness

5. **Expired session / empty feed shows "lab complete, score 0"** —
   `app.js:329`. `renderNextProScenario` treats any non-`ok` or `done:true`
   response from `/scenarios/next` as "finished" and calls `finishProLab()`.
   A token that expires mid-lab (401) or an empty feed for the tier both
   surface a bogus completion report instead of re-gating. Distinguish
   `done` from `401`/error.

6. **Stored HTML/script injection in scenario rendering** — `app.js:350`.
   `${artifact.code}`, `${prompt}`, and each option `${answer}` (all DB
   content from `/scenarios/next`) are interpolated into `innerHTML`
   unescaped. Authored content with `</code>` or `<img onerror=…>` mis-
   renders or executes script. The diagnostic path (`app.js:218`) shares
   the flaw. Escape via `textContent`/an HTML-escape helper.

7. **Access-code lockout is griefable / self-inflicted** —
   `supabase/schema.sql:213`. `register_failed_code` keys the
   5-strikes→15-min lock on the `code` alone (not code+email) and
   `redeem_access_code` never resets `failed_attempts` on success. Five
   wrong-*email* attempts against a valid code lock it for everyone for 15
   minutes, and the correct email is then rejected by the `locked_until`
   guard. This qualifies the "15-minute lock" note above as a footgun for
   shared codes. Key the lockout on attempt identity; reset on success.

8. **Per-mock length cap is cosmetic** — `app.js:392`. At
   `proAttemptCount >= mockLength` the button label flips to "View
   readiness report" but line 393 still wires `onclick` to
   `renderNextProScenario()`, never `finishProLab()`. A mock whose bank has
   more unattempted rows than `MOCK_LENGTHS[currentMockId]` serves extra
   questions past the intended end. Wire the terminal button to
   `finishProLab()`.

### Lower severity

9. **5-second webhook replay window** — `api/webhooks/paddle.js:32`
   (plausible). `REPLAY_TOLERANCE_MS = 5000` rejects any signed timestamp
   >5s old; clock skew or an Edge cold start can exceed it. Paddle re-signs
   retries so it's not permanently fatal, but 5s is tight — Paddle's own
   guidance uses ~5 minutes.

10. **Paddle email stored without trim/cap** — `api/webhooks/paddle.js:64`.
    Email is lowercased inline instead of via `normalizeEmail()`
    (`http.js:43`), skipping trim + 254-char cap. Latent until #1 is fixed
    and an email actually flows through, then a whitespaced address won't
    match `lower(email)` lookups.

### Cleanup (quality, not bugs)

- **Latent PostgREST filter breakage** — `api/scenarios/next.js:34`
  interpolates attempted ids unquoted into `not.in.(…)`. Current
  `GH600-V2-###` ids are safe; any id with a comma/reserved char would 400
  or re-serve. (Already listed under "Deferred hardening" as PostgREST
  filter URL-encoding.)
- **Duplicated security-critical crypto** — `sha256Hex` (`admin.js:3` +
  `entitlements.js:40`), `timingSafeEqual` (`admin.js:8` + `paddle.js:14`),
  and the HMAC import/sign dance (`entitlements.js:25` + `paddle.js:22`) are
  copy-pasted 2–3×. Extract an `api/_lib/crypto.js` so a hardening fix
  can't miss a copy.
- **Dead code** — `providers.js` has an unreachable `manual` registry entry
  and `|| providers.manual` fallback; `quizMode` (`app.js:157`) is assigned
  three times and never read; the `backend-config.js:5` ternary
  `protocol === "https:" ? true : protocol !== "file:"` is a no-op.
- **Pro-lab is a wholesale fork of the quiz engine** —
  `startProLab`/`renderNextProScenario`/`finishProLab` duplicate
  `startQuiz`/`renderQuestion`/`finishQuiz` (~100 lines) and have already
  drifted; the #6 XSS exists in both copies because of it. A shared engine
  over a `{next, grade}` source adapter would single-source rendering,
  scoring, and the escaping fix.

Refuted during review: the concern that `scripts/seed-scenarios.js` seeds a
table the API never reads — `scripts/seed-scenarios-v2.js` is the correct
current seeder and writes to `gh600_scenarios_v2`. The legacy
`seed-scenarios.js` remains a footgun only if run manually.

### Fix status (2026-07-06/07) — all 10 findings resolved

Per `docs/plans/code-review-fixes-2026-07-06.md`, verified via `npm test`
(54 tests) plus manual Paddle-sandbox/`vercel dev` checks:

1. **Paddle buyer email** — `api/webhooks/paddle.js` `resolvePaddleEmail()`
   now falls back to `GET /customers/:id` on the Paddle API when
   `custom_data.email` is absent; unresolved payments log a
   `payment_unresolved` analytics event instead of silently dropping.
2. **Re-login lockout** — `api/access/verify.js` computes a per-buyer
   `reference = code:CODE:email`; `findActiveEntitlement()`
   (`api/_lib/entitlements.js`) reissues a session from an existing active
   entitlement without calling `redeemAccessCode` again (no `use` burned).
3. **Partial refund revokes Pro** — `isFullRefund()` in
   `api/webhooks/paddle.js` requires `data.action === 'refund'` **and** the
   refunded total to match the purchase amount before revoking;
   `transaction.refunded` still always revokes.
4. **Plan alias yields empty lab** — `verify.js` calls `resolvePlan()` on
   the redeemed code's plan before granting (422 if unresolvable), so
   `contentTiers`/`allowedMocks` never silently fall through to `[]`.
5. **Bogus "complete, score 0"** — `app.js` `renderNextProScenario` now
   branches `response.done` (real completion) from an error/expired
   response (`expireProLab()` re-opens the Pro gate with a message instead).
6. **Stored XSS** — `escapeHtml()` wraps every DB/authored string
   interpolated into `innerHTML` in both `renderQuestion` (diagnostic) and
   `renderNextProScenario` (Pro).
7. **Griefable lockout** — the 5-strikes/15-min lock moved from
   `access_codes` (whole-code) to a new `access_code_attempts` table keyed
   on `(code, email)`; `redeem_access_code` clears the caller's row on
   success. See `supabase/migrations/20260706185145_fix_access_code_lockout_identity.sql`.
8. **Cosmetic mock cap** — `checkProAnswer`'s terminal button now wires
   `onclick` to `finishProLab` (not `renderNextProScenario`) once
   `proAttemptCount >= mockLength`.
9. **5s replay window** — widened to Paddle's own guidance,
   `REPLAY_TOLERANCE_MS = 5 * 60 * 1000`.
10. **Email normalization** — folded into fix #1 (`resolvePaddleEmail`
    returns `normalizeEmail()`'s output on both the `custom_data` and
    customer-API paths).

Cleanup also done: PostgREST `not.in.()` list values are quoted
(`api/scenarios/next.js`); `sha256Hex`/`timingSafeEqualHex`/HMAC helpers
consolidated into `api/_lib/crypto.js`; the unreachable `providers.js`
`manual` registry entry, the write-only `quizMode` variable, and the no-op
`backend-config.js` ternary were removed. The Pro-lab-is-a-fork-of-the-quiz-engine
observation (cleanup item, not a finding) was left as-is per the plan's own
guidance — it's an optional larger refactor, not required this pass, and
both copies now share the same escaping fix.

# GH600 — Fix Plan for the 2026-07-06 Paid-Lab Code Review

## Context

The high-effort review in `docs/history/known-issues.md` ("Code review — paid-lab pass,
2026-07-06") found 10 ranked findings + cleanup across the Paddle/Wise payment →
entitlement → Pro-lab flow. Several **reopen** items the same doc lists as "Resolved"
(idempotency, code lockout). I re-verified every finding against the current files — all
confirmed. This plan fixes them in severity order.

**Severity gate (`CLAUDE.md` + PRD go/no-go):** findings 1–4 mean **no real payment
currently grants access** and some **lock out or wrongly revoke paying customers** — these
block any paid traffic. Fix Phase 1 before Paddle goes live.

**Surfaces:** `api/webhooks/paddle.js`, `api/access/verify.js`, `api/_lib/entitlements.js`,
`api/_lib/plans.js`, `supabase/schema.sql` (RPCs), `app.js` (Pro lab + diagnostic render),
`api/scenarios/next.js`, plus a new `api/_lib/crypto.js`; tests + docs.

---

## Phase 1 — Revenue-critical (fix before any paid traffic)

### 1. Paddle buyer never gets access — `api/webhooks/paddle.js:64`
`transaction.completed` reads `data.custom_data.email`, but checkout is a **static hosted
Paddle link** (`providers.js:6` returns only `{redirectUrl}` — no `custom_data` can be
attached), so `email` is always `""`, the `if (plan && email)` guard fails, and nothing is
recorded. **Fix:** resolve the buyer email server-side from the Paddle **customer**:
- Add `resolvePaddleEmail(data)` — prefer `data.custom_data?.email`; else fetch
  `GET https://api.paddle.com/customers/${data.customer_id}` (sandbox host
  `api.sandbox.paddle.com` when `PADDLE_ENV=sandbox`) with `Authorization: Bearer
  ${PADDLE_API_KEY}`, read `.data.email`.
- Normalize the result with `normalizeEmail()` (folds in **finding #10** — currently
  lowercased inline, skipping trim + 254-cap).
- Keep the `plan && email` guard; if email still can't be resolved, log an analytics
  `payment_unresolved` event so it's visible rather than silently dropped.
- *(Longer-term option, not this pass: create the checkout server-side via the Paddle API
  with `custom_data.email` + prefilled customer, so the webhook needs no lookup. The API
  lookup above is the minimal fix that keeps the hosted-link flow.)*

### 2. Re-login permanently locks out paying customers — `verify.js:15` + `entitlements.js:69`
`grantEntitlement` is called with no `source_purchase_id`/`reference`, so **both** dedup
branches are skipped: every login inserts a new entitlement **and** `redeem_access_code`
burns a `use`. A single-use-code buyer who clears storage or returns after the 30-day
`SESSION_TTL_MS` hits `uses < max_uses = false` and is locked out. **Fix (idempotent
redemption + session reissue):**
- Add `findActiveEntitlement({ email, reference })` to `entitlements.js` (select
  `entitlements` where `active=true` and `metadata->>reference = reference`).
- In `verify.js`, compute `reference = \`code:${code}:${email}\`` (per-buyer, so shared
  `max_uses>1` codes still create one entitlement *per email*). **Before** redeeming, if
  `findActiveEntitlement` returns a row → `issueSession(existing)` and return **without**
  calling `redeemAccessCode` (no `use` burned — this is the re-login path).
- Only if no active entitlement: `redeemAccessCode` → `grantEntitlement({ ..., reference })`
  (now the reference-dedup branch is armed for future logins) → `issueSession`.
- This makes redemption idempotent per email and gives returning customers a fresh session
  without consuming a use. (A fuller magic-link "resend access" endpoint stays deferred.)

### 3. Partial refund / credit / tax adjustment revokes Pro — `paddle.js:85`
`REFUND_EVENTS` includes `adjustment.created` and revokes **unconditionally**. Paddle emits
`adjustment.created` for partial refunds, credits, and tax tweaks — a $1 credit strips
access. **Fix:** only revoke when the adjustment is a **full refund**:
- For `adjustment.created`, require `data.action === 'refund'` **and** the refunded total
  equals the purchase total (compare `data.totals`/`amount` against the stored
  `purchases.amount`); otherwise ignore (optionally log `partial_refund`).
- `transaction.refunded` stays a full revoke. Keep the existing purchase→entitlement lookup.

### 4. Access code with a plan alias yields an empty lab — `verify.js:17`
Raw `access_codes.plan` (no CHECK constraint) is passed to `grantEntitlement`, so a code
seeded `plan:'founder'` stores `entitlement.plan='founder'`, and
`contentTiers('founder')`/`allowedMocks('founder')` fall through to `[]` (both switch on
`founding_access`/`pro`/`team_pack`). **Fix:** normalize before granting —
`const plan = resolvePlan(redeemed.plan); if (!plan) throw new HttpError(422, "Unknown plan
on access code");` then grant/return `plan.id`. (Optionally add a CHECK/trigger on
`access_codes.plan` later.)

## Phase 2 — Pro-lab correctness

### 5. Expired session mid-lab shows bogus "complete, score 0" — `app.js:329`
`renderNextProScenario` treats **any** non-`ok` or `done` response as finished.
`apiRequest` returns `{ok:false}` on a 401 (expired token) and `{ok:true,done:true}` on an
empty feed — different meanings. **Fix:** branch them:
`if (response?.done) return finishProLab();` else `if (!response?.ok || !response.scenario)`
→ show "Your session expired — please re-enter" and reopen the Pro gate
(`proGateDialog`), **not** a fake report. (Cheap extra: have `apiRequest` surface
`response.status` so 401 is unambiguous.)

### 6. Stored HTML/script injection in scenario rendering — `app.js:350` (+ diagnostic `:218`)
DB content (`artifact.code`, `prompt`, each option, `objective`) is interpolated into
`innerHTML` unescaped in **both** the Pro (`renderNextProScenario`) and diagnostic
(`renderQuestion`) paths — authored `</code>` or `<img onerror=…>` mis-renders/executes.
**Fix:** add an `escapeHtml(str)` helper and wrap every interpolated dynamic string in both
render templates (prompt, options, artifact name/code, objective, domain fields). Prefer
escaping over `textContent` to keep the template structure. (Phase 4's shared engine would
prevent this class of bug recurring in two copies.)

### 7. Access-code lockout is griefable / self-inflicted — `schema.sql` RPCs
`register_failed_code` keys the 5-strikes→15-min lock on the **code alone**, and
`redeem_access_code` never resets `failed_attempts` on success. Five wrong-*email* attempts
lock a valid shared code for everyone, and the correct email is then blocked. **Fix:**
- `redeem_access_code`: add `failed_attempts = 0` (and `locked_until = null`) to the
  successful `UPDATE ... SET` — removes the self-inflicted lock after a good redeem.
- Move the lock off the bare code: add an `access_code_attempts(code, email, ip, at)` log
  (or key `register_failed_code` on `(code, email)`), and lock only that identity. Keeps a
  brute-force guard without letting one bad actor freeze a shared code. (If we keep it
  simple for MVP: reset-on-success alone already kills the *self-inflicted* case; identity
  keying closes the *griefing* case.)

### 8. Per-mock length cap is cosmetic — `app.js:392`
At `proAttemptCount >= mockLength` the label flips to "View readiness report" but line 393
still wires `action.onclick = renderNextProScenario`, so a mock with more unattempted rows
than `MOCK_LENGTHS[currentMockId]` serves extra questions. **Fix:** wire the terminal
button to `finishProLab` when `proAttemptCount >= mockLength`, else `renderNextProScenario`.

## Phase 3 — Lower severity + shared hardening

### 9. Webhook replay window too tight — `paddle.js:6`
`REPLAY_TOLERANCE_MS = 5000` rejects signatures >5s old; clock skew / Edge cold start can
exceed it. **Fix:** widen to Paddle's guidance (~5 min): `REPLAY_TOLERANCE_MS = 300000`.

### Latent PostgREST filter breakage — `api/scenarios/next.js:34`
`not.in.(${attemptedIds.join(",")})` interpolates ids unquoted; current `GH600-V2-###` ids
are safe but a comma/reserved char would 400 or re-serve. **Fix:** quote each id
(`not.in.("id1","id2")`) and/or `encodeURIComponent`. Do this as part of the broader
PostgREST filter-encoding item already tracked under "Deferred hardening."

### Extract `api/_lib/crypto.js` (security-critical dedup)
`sha256Hex` (`admin.js:3`, `entitlements.js:40`), `timingSafeEqual` (`admin.js:8`,
`paddle.js:14`), and the HMAC sign/import dance (`entitlements.js:25`, `paddle.js:22`) are
copy-pasted 2–3×, so a hardening fix can miss a copy. **Fix:** create `api/_lib/crypto.js`
exporting `sha256Hex`, `timingSafeEqualHex`, `hmacSignBase64Url`, `hmacVerifyBase64Url`,
`hmacHex`; import everywhere. Pure refactor — behavior-preserving, covered by existing
webhook/entitlement tests.

## Phase 4 — Cleanup (quality, optional this pass)

- **Dead code:** remove `providers.js` unreachable `manual` entry + `|| providers.manual`
  fallback (or keep the fallback and drop the entry — pick one); delete the write-only
  `quizMode` (`app.js:157`); simplify the no-op `backend-config.js:5` ternary.
- **Pro-lab engine fork:** `startProLab`/`renderNextProScenario`/`finishProLab` duplicate
  `startQuiz`/`renderQuestion`/`finishQuiz` (~100 lines) and have already drifted (the #6
  XSS lives in both). A shared engine over a `{ next, grade }` source adapter single-sources
  rendering, scoring, and the escape fix. Larger refactor — do only if we're touching this
  area anyway; otherwise leave a TODO and ensure #6 is fixed in **both** copies.

---

## Tests

- `tests/webhook.test.js`: email resolved from `customer_id` (mock the Paddle API fetch);
  `adjustment.created` with `action!=='refund'` or partial amount does **not** revoke;
  full refund does; widened replay tolerance still rejects a truly stale ts.
- `tests/entitlements.test.js` / new `tests/access-verify.test.js`: re-login with the same
  code issues a session **without** burning a use and without a second entitlement; alias
  plan (`founder`) normalizes to `founding_access` and yields non-empty
  `contentTiers`/`allowedMocks`.
- `tests/*` schema/RPC: `redeem_access_code` resets `failed_attempts`; lock no longer
  blocks the correct email after wrong-email attempts.
- `tests/static.test.js`: add an assertion that render templates escape dynamic content
  (e.g. a scenario option containing `<img>` renders escaped) — or a small DOM unit test.
- Keep `npm test` green; add `api/_lib/crypto.js` unit coverage via the existing suites.

## Verification (end-to-end, `vercel dev` + Paddle sandbox)

1. **Payment grants access (#1):** complete a Paddle **sandbox** purchase → webhook resolves
   the buyer email, `purchases` + `entitlements` rows appear, buyer reaches the Pro lab.
2. **Re-login (#2):** clear `localStorage`, re-enter the same email+code → back in, `uses`
   unchanged, still one entitlement.
3. **Refund safety (#3):** send a sandbox `adjustment.created` partial credit → access
   retained; a full `transaction.refunded` → access revoked.
4. **Alias plan (#4):** seed a code with `plan:'founder'`, redeem → lab serves MOCK_1–3
   (not empty).
5. **Expired session (#5):** expire/blank the token mid-lab → re-gate prompt, not a 0-score
   report.
6. **XSS (#6):** a scenario option/prompt containing `<img onerror=alert(1)>` renders as
   text, no execution, in both Pro and diagnostic.
7. **Lockout (#7):** 5 wrong-email attempts on a shared code → correct email still redeems.
8. **Mock cap (#8):** a mock with >`mockLength` available rows ends at `mockLength`.
9. `npm test` all green.

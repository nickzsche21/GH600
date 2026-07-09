# GH600 — Gumroad Interim Checkout + License-Key Access (2026-07-09)

## Context

Paddle is stuck in merchant verification, so no automated card payment currently
grants Pro access (the Paddle webhook path in `api/webhooks/paddle.js` can't fire
for real sales). To keep the revenue funnel live in the meantime, we sell through
two existing Gumroad products and grant access from the **license key** Gumroad
issues per sale:

- Founding access — `https://nikhilite46.gumroad.com/l/ewvqwg` → plan `founding_access` ($29)
- Pro access — `https://nikhilite46.gumroad.com/l/fbylmr` → plan `pro` ($49)

Gumroad is Merchant of Record (like Paddle would be), so this is a drop-in for the
"confirmed payment → server-issued entitlement + session token" contract in
`CLAUDE.md`. **Access is never a client flag** — a Gumroad key is verified
server-side, then the *same* `grantEntitlement` / `issueSession` path issues the
revocable session token the Pro lab already gates on (rules #1, #7).

**Why license keys (not "email the buyer a code"):** the codebase has **no
transactional email service** (no Resend/Postmark/SMTP — verified). Gumroad already
generates a unique per-sale key and shows it on the receipt + its own confirmation
email, so we reuse that instead of standing up an email pipeline and a new
silent-failure mode (bounce/spam → paying buyer locked out).

**Source of truth:** Gumroad's license API, verified live at unlock time. We do
**not** pre-store keys in `access_codes`; that table keeps serving our own
manual/demo codes unchanged.

**Surfaces touched:** `api/_lib/plans.js`, `api/_lib/providers.js`,
`api/_lib/gumroad.js` (new), `api/access/verify.js`, `index.html` (Pro gate copy),
`app.js` (two messages), `.env.example`, `tests/*`, plus README analytics/provider
notes. Webhook (`api/webhooks/gumroad.js`) + schema migration are **Phase 3**, not
required to go live.

---

## The buyer flow (target)

1. Site → "Buy founding access — $29" → `/api/checkout-intent` returns the Gumroad
   product URL → browser redirects to Gumroad.
2. Buyer pays on Gumroad. Gumroad shows a **license key** on the receipt page + its
   confirmation email.
3. Buyer returns, opens the existing Pro gate, enters **email + license key**.
4. `/api/access/verify` calls `POST https://api.gumroad.com/v2/licenses/verify`
   (`product_id` + `license_key`). On `success:true` and not refunded/disputed →
   map product → plan → `grantEntitlement` + `issueSession` → return token.
5. Token in `localStorage`; Pro lab opens. Return visits re-verify via
   `/api/access/session` (30-day TTL) — no key re-entry.

---

## Phase 1 — Checkout redirects to Gumroad (env-driven)

Keep pricing in `plans.js` only; the browser never sees a price or a hardcoded URL
(rules #1, and config lives in env, not `*-config.js`).

### 1.1 `api/_lib/plans.js`
- Change `founder.provider` and `pro.provider` from `"paddle"` to `"gumroad"`.
- Add `checkoutEnv: "GUMROAD_CHECKOUT_FOUNDING"` (founder) and
  `"GUMROAD_CHECKOUT_PRO"` (pro), keeping the Paddle env names as an ordered
  fallback so flipping back to Paddle later is a one-line change. Suggested:
  `checkoutUrl(plan)` already tries `checkoutEnv` then `legacyEnv`; extend it to
  read `GUMROAD_CHECKOUT_*` first, then `PADDLE_CHECKOUT_*`, then `legacyEnv`.
- Add a `productEnv` field: `GUMROAD_PRODUCT_FOUNDING` / `GUMROAD_PRODUCT_PRO`,
  used by the license-verify branch to know which product a plan maps to.
- Add `resolvePlanByGumroadProduct(productId)` mirroring `resolvePlanByPriceId`
  (match `process.env[plan.productEnv] === productId`).

### 1.2 `api/_lib/providers.js`
- Add a `gumroad` provider whose `createCheckout(plan)` returns
  `checkoutUrl(plan) ? { redirectUrl } : { manual: true }` (same shape as paddle).
  `/api/checkout-intent` then returns `redirect_url` with no other change.

### 1.3 Result
`app.js` already redirects to `intent.redirect_url` (line ~549), so the founder and
pro buttons now go to Gumroad once the env vars are set. No `checkout-config.js`
edit — production and local stay env-driven, not divergent (rule #5).

---

## Phase 2 — License-key unlock in `/api/access/verify`

Reuse the existing email + code gate. Detection is **fallback-based** so our own
`access_codes` (demo/manual) keep working untouched:

1. `redeemAccessCode(code, email)` as today (local `access_codes`). If it matches →
   unchanged behavior.
2. **If no local match**, try `verifyGumroadLicense(email, code)` before returning
   the 401.

### 2.1 `api/_lib/gumroad.js` (new)
- `verifyGumroadLicense(email, key)`:
  - For each plan with a `productEnv`, call
    `POST https://api.gumroad.com/v2/licenses/verify` with
    `product_id = process.env[productEnv]` and `license_key = key`,
    `increment_uses_count=false` (we don't want to burn the counter on every
    session re-issue).
  - On `success:true`: reject if `purchase.refunded`, `purchase.chargebacked`, or
    `purchase.disputed` is true. Optionally confirm `purchase.email` matches the
    submitted email (Gumroad returns the buyer email) to prevent a leaked key being
    bound to a different address.
  - Return `{ plan: <resolved plan id>, email }` on success, else `null`.
  - `GUMROAD_ACCESS_TOKEN` is **server-only** (same class as
    `SUPABASE_SERVICE_ROLE_KEY`) — never reaches `app.js`/`*-config.js`
    (rule #2). Send it as the `access_token` param / bearer per Gumroad's API.
- Network/JSON errors → return `null` (fail closed), never throw past the handler.

### 2.2 `api/access/verify.js`
- After a failed local redeem, call `verifyGumroadLicense`. On success:
  - `reference = \`gumroad:${plan}:${email}\`` (per-buyer, mirrors the existing
    `code:...:email` reference so re-login is idempotent via
    `findActiveEntitlement` — no duplicate entitlements).
  - `grantEntitlement({ email, plan, source: "manual", granted_by:
    \`gumroad_license\`, reference })` — `source:"manual"` avoids a schema change
    in Phase 1/2 (the `entitlements.source` CHECK allows `paddle|wise|manual`).
    Switch to `source:"gumroad"` only in Phase 3 with the migration.
  - `issueSession` → return `{ ok:true, plan, token, expires_at }` exactly like the
    code path.
- Only call `registerFailedCode` / return 401 when **both** local and Gumroad fail,
  so a real license key never counts toward the code lockout.

---

## Phase 3 — UI copy (buyer-facing wording)

Copy only — no layout/CSS change. The `id="pro-code"` field and form logic stay; it
just carries a license key now.

### `index.html` (Pro gate dialog, lines ~294–302)
- L296 `<p>` — "Use the email from checkout and the **license key** on your Gumroad
  receipt."
- L299 `<label>` — text "**License key**"; placeholder
  `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`.
- L302 `#pro-gate-message` — "Your license key is on your Gumroad receipt and
  confirmation email."

### `app.js`
- L~609 error — "That email/**license key** pair isn't active — check the key from
  your Gumroad receipt."
- L~452 expired-session — "…re-enter your email and **license key**."

---

## Phase 4 — Config, tests, docs (ship gate)

- **`.env.example`** — add `GUMROAD_ACCESS_TOKEN`, `GUMROAD_PRODUCT_FOUNDING`,
  `GUMROAD_PRODUCT_PRO`, `GUMROAD_CHECKOUT_FOUNDING`, `GUMROAD_CHECKOUT_PRO` with
  comments (access token server-only).
- **Get the product ids once:** `GET https://api.gumroad.com/v2/products?access_token=…`
  → copy the `id` of `ewvqwg` and `fbylmr` into the env vars above.
- **`tests/static.test.js`** — do **not** weaken; confirm `GUMROAD_ACCESS_TOKEN`
  never appears in `index.html`/`app.js`/`*-config.js` (add an assertion mirroring
  the service-role-key guard).
- **New unit test** — `verifyGumroadLicense` maps product→plan, rejects
  refunded/disputed, fails closed on network error (mock `fetch`).
- **Docs** — note the Gumroad provider in `docs/engineering/api-contracts.md`
  (`/api/access/verify` now has a Gumroad branch) and
  `docs/business/revenue-flow.md` (payment step provider = Gumroad interim). No new
  `trackEvent` name is required (existing `checkout_redirected` /
  `pro_gate_unlocked` cover it) — if a `provider:"gumroad"` value is added to an
  event, list it in the README per rule #4.

---

## Phase 5 (optional, later) — Gumroad sale webhook

Not needed to go live; adds purchase records + automatic refund revocation.

- **Schema migration** — add `'gumroad'` to the `purchases.provider` and
  `entitlements.source` CHECK constraints (`supabase/schema.sql`).
- **`api/webhooks/gumroad.js`** — Gumroad Ping is **unsigned**, so satisfy rule #8
  by verifying each sale **server-side against the Gumroad API** (`seller_id` +
  `sale_id`) before acting, and require a secret token in the Ping URL query string.
  On verified sale → `recordPurchase` + `grantEntitlement(source:"gumroad",
  source_purchase_id)`. On refund/dispute/chargeback Ping → `revokeEntitlement`.
- Switch the Phase 2 grant `source` from `"manual"` to `"gumroad"` once the
  migration is applied.

---

## Rollback / flip back to Paddle

When Paddle clears verification: set `founder`/`pro` `provider` back to `"paddle"`
(or just unset `GUMROAD_CHECKOUT_*` so `checkoutUrl` falls through to
`PADDLE_CHECKOUT_*`). The Gumroad license branch in `/api/access/verify` can stay —
it's inert without `GUMROAD_PRODUCT_*` set, and lets any Gumroad buyers keep their
access. No data migration needed.

## Go / no-go checklist

- [ ] `GUMROAD_*` env vars set in Vercel (access token server-only).
- [ ] Founder + Pro buttons redirect to the correct Gumroad products.
- [ ] Live test: buy through Gumroad → paste key → Pro lab unlocks → token
      re-verifies on refresh.
- [ ] Refunded key is rejected at unlock.
- [ ] Existing demo/`access_codes` still redeem (no regression).
- [ ] `tests/static.test.js` green (no `GUMROAD_ACCESS_TOKEN` leak).

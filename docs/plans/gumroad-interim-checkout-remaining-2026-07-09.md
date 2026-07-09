# GH600 — Gumroad Interim Checkout: what's left (2026-07-09)

Companion to `gumroad-interim-checkout-2026-07-09.md`. Phases 1–4 (code) are
**done** — provider wiring, license-key unlock branch, Pro-gate copy, tests,
docs. Everything below is either **manual setup only you can do** (Gumroad/
Vercel dashboard access) or **optional Phase 5** (not required to go live).

## 1. Manual setup — required before this can process a real sale

- [ ] **Get the Gumroad access token.** Gumroad account → Settings →
  Advanced → Applications → generate an access token (or use an existing
  one with `view_sales`/`edit_products` scope, since license verification
  needs product read access).
- [ ] **Get the two product IDs.**
  ```bash
  curl "https://api.gumroad.com/v2/products?access_token=YOUR_TOKEN"
  ```
  Find the entries for `ewvqwg` (Founding Access) and `fbylmr` (Pro) and
  copy their `id` field — that's the `product_id` the license-verify API
  expects, not the URL slug.
- [ ] **Set five env vars in Vercel** (Project Settings → Environment
  Variables, Production + Preview as needed):
  - `GUMROAD_ACCESS_TOKEN` (server-only — same sensitivity class as
    `SUPABASE_SERVICE_ROLE_KEY`)
  - `GUMROAD_PRODUCT_FOUNDING`, `GUMROAD_PRODUCT_PRO` (the ids from above)
  - `GUMROAD_CHECKOUT_FOUNDING=https://nikhilite46.gumroad.com/l/ewvqwg`
  - `GUMROAD_CHECKOUT_PRO=https://nikhilite46.gumroad.com/l/fbylmr`
- [ ] **Redeploy** so the new env vars take effect.
- [ ] **Confirm license keys are enabled** on both Gumroad products
  (Gumroad product settings → "Generate a unique license key per sale" —
  off by default on older products).

## 2. Live verification — do this once env vars are set

- [ ] Click **Founding Access** on the live site → confirm it redirects to
  `https://nikhilite46.gumroad.com/l/ewvqwg` (not the old Paddle link).
- [ ] Click **Pro** → confirm it redirects to
  `https://nikhilite46.gumroad.com/l/fbylmr`.
- [ ] Make one real (or Gumroad test-mode) purchase of each product, grab
  the license key from the Gumroad receipt/email.
- [ ] Open the Pro gate on the site, enter that email + license key →
  confirm the Pro lab unlocks and a session token is stored (not the old
  `localStorage["gh600lab-pro-access"]` flag).
- [ ] Refresh the page → confirm the session re-verifies via
  `/api/access/session` without re-entering the key.
- [ ] In Supabase, confirm one `entitlements` row was created per buyer
  (`source: 'manual'`, `granted_by: 'gumroad_license'`) — not duplicated on
  a second login with the same key.
- [ ] Refund one of the two test purchases in Gumroad, then confirm the
  *same* license key is rejected at `/api/access/verify` on a fresh
  attempt (no entitlement — but note the earlier session token isn't
  revoked automatically; see Phase 5 below).
- [ ] Confirm an existing demo/manual `access_codes` entry (if any are
  still active) still redeems normally — no regression on that path.
- [ ] Run `npm test` once more against the live env config if you change
  anything (`tests/static.test.js` must stay green — no `GUMROAD_ACCESS_TOKEN`
  leak into `index.html`/`app.js`/`*-config.js`).

## 3. Phase 5 (optional, later) — not required to go live

Deferred because Gumroad Ping (their webhook) is unsigned and would need
its own verification dance, and the interim goal was "sell today," not a
fully automated pipeline. Do this once Gumroad is proven out and you want
purchase records + automatic refund revocation instead of relying on the
manual refund-check step above:

- [ ] **Schema migration** — add `'gumroad'` to the `purchases.provider`
  and `entitlements.source` CHECK constraints in `supabase/schema.sql`.
- [ ] **`api/webhooks/gumroad.js`** (new) — verify each Gumroad Ping
  server-side against the Gumroad API (`seller_id` + `sale_id`) before
  acting, since the payload itself isn't signed; require a secret token in
  the Ping URL's query string as a second gate.
  - On a verified sale: `recordPurchase()` + `grantEntitlement({ source:
    'gumroad', source_purchase_id })`.
  - On refund/dispute/chargeback Ping: `revokeEntitlement()` — this is
    what removes the manual refund-check step in section 2 above.
- [ ] Register the Ping URL in each Gumroad product's settings.
- [ ] Switch the Phase 2 grant `source` from `"manual"` to `"gumroad"` once
  the migration lands (currently `"manual"` deliberately, to avoid needing
  this migration just to go live).

## Rollback reminder

Once Paddle clears merchant verification, flip back is a one-line env
change: unset `GUMROAD_CHECKOUT_FOUNDING`/`GUMROAD_CHECKOUT_PRO` in Vercel
(or set `founder`/`pro` `.provider` back to `"paddle"` in `plans.js` if you
want the code default to change too). The Gumroad license-verify branch in
`/api/access/verify` stays live either way — inert without
`GUMROAD_PRODUCT_*` set, and it lets any existing Gumroad buyers keep
redeeming their key. No data migration needed either direction.

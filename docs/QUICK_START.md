# Quick Start Guide — GH600 Lab

## I want to...

### Understand the codebase
1. **Big picture:** Read `docs/architecture/system-map.md` (components, flow)
2. **Database:** Read `docs/engineering/data-model.md` (11 tables, schema)
3. **API endpoints:** Read `docs/engineering/api-contracts.md` (12 functions)
4. **What's built:** Read `docs/history/IMPLEMENTATION_STATUS.md` (complete snapshot)

### Run it locally
```bash
python -m http.server 4173
# Open http://127.0.0.1:4173
# Free diagnostic works offline; Pro lab falls back to localStorage
```

For full stack (with API + Supabase):
```bash
npm install -g vercel
vercel dev
# Opens http://127.0.0.1:3000
```

### Deploy to production
1. Create Supabase project + import `supabase/schema.sql`
2. Create Paddle account (sandbox + live keys)
3. Generate secrets: `openssl rand -hex 32` (signing secret) + `openssl rand -hex 16` (admin token)
4. Import to Vercel, add all `.env.example` vars
5. Seed premium bank: `node scripts/seed-scenarios-v2.js`
6. See full checklist in `README.md` → "Deploy the paid-ready MVP"

### Fix a bug
1. Check `docs/history/known-issues.md` (is it an intentional gap?)
2. Check `docs/plans/code-review-fixes-2026-07-06.md` (is it a known finding?)
3. Add a test case in `tests/` (static, api, entitlements, webhook)
4. Verify: `npm test` + `vercel dev` → test the fix end-to-end

### Add a new endpoint
1. Create `api/new-endpoint.js` with `POST(request)` function
2. Import helpers: `readJson`, `json`, `handleError` from `api/_lib/http.js`
3. Validate input, make DB calls via `api/_lib/supabase.js`
4. Return `{ ok: true, ... }` or `HttpError(status, message)`
5. Add a test case in `tests/api.test.js`
6. Document in `docs/engineering/api-contracts.md`
7. If it touches the revenue funnel, add an analytics event and update `README.md`

### Add pricing, a plan, or a feature
1. **Pricing:** update `api/_lib/plans.js`, `.env.example`, `README.md`, `GH600-Lab-Launch-Plan.md`
2. **Plan:** same as pricing + create Paddle product/price + add `contentTiers()` and `allowedMocks()` mappings
3. **Feature in free flow:** edit `index.html`, `app.js`, `styles.css`, add API endpoint if needed
4. **Feature in paid flow:** same + update `supabase/schema.sql` if needed + `docs/engineering/data-model.md`
5. Per `CLAUDE.md`: "state every surface touched"

### Understand the free diagnostic
- Questions live in `app.js` → `questions` array (hand-authored, public, lead magnet)
- Domains are `app.js` → `domains` (6 fixed exam domains)
- Flow: 2 questions per domain (12 total) → scored → email gate → readiness report
- No database until email is captured (`api/lead.js`) or score is submitted (`api/diagnostic/complete.js`)
- Client-side fallback works offline

### Understand the Pro lab (paid, server-graded)
- Content: `supabase` → `gh600_scenarios_v2` table (300 questions, 6 mocks + drills)
- Tier gating: Free/Founder/Pro control which rows are served (`contentTiers()` in `api/_lib/plans.js`)
- Delivery: `/api/scenarios/next` returns one scenario per call (no answer key)
- Grading: `/api/scenarios/answer` grades server-side, returns explanation
- Session: server-issued token, revocable, HMAC-verified on every call
- Mock picker: `app.js` UI lets buyer choose which 40-question mock to run
- Answer key: never sent to client, never in `localStorage`, only in `supabase/schema.sql`

### Understand payments
- Free: no payment
- Founding Access ($29): Paddle hosted checkout → webhook → entitlement
- Pro ($49): same as Founding Access
- Team ($149) / Cram ($99): Wise invoice → admin `POST /api/admin/grant` → entitlement
- Entitlements: source-agnostic (`paddle`, `wise`, `manual`, from access codes)
- Sessions: tied to entitlements, revocable, hash-only stored (raw token never persisted)

### Understand security
- **Client-side secrets never.** Rule in `CLAUDE.md` + enforced by `tests/static.test.js`
- **Pricing server-side only.** Client-sent `amount` is ignored in `api/checkout-intent.js`
- **Answer keys server-side only.** Pro scenarios never sent in full; grading server-side in `/api/scenarios/answer`
- **Session tokens opaque.** HMAC-enveloped, hash-only stored, verified on every call
- **Webhooks signature-verified.** Paddle `Paddle-Signature` HMAC-SHA256 + timestamp replay guard
- **Admin endpoints bearer-token auth.** `Authorization: Bearer <ADMIN_API_TOKEN>`
- **RLS on all tables.** No public policies; all writes via Vercel Edge Functions with service-role key

### Understand the code-review findings
- Status: 10 findings identified, 4 revenue-blocking, 6 quality improvements
- Details: `docs/plans/code-review-fixes-2026-07-06.md`
- Severity 1 (must fix before live): email resolution, idempotency, refund handling, plan normalization
- Severity 2 (Pro lab quality): session expiry, XSS, performance, UI sync
- Severity 3 (operational): privacy pages, rate limiting, content review

### Run tests
```bash
npm test
# Runs: plans.test.js, static.test.js, api.test.js, entitlements.test.js, webhook.test.js
```

### Check the git status
- `git diff main` → all local changes
- `git status --short` → untracked files, modified files
- Untracked expected: `AGENTS.md`, `CLAUDE.md`, `docs/`, `api/_lib/entitlements.js`, `api/scenarios/`, `api/webhooks/`, `api/access/session.js`, `api/admin/`, `scripts/`

---

## Key Files to Know

| File | What it does | When to edit |
|------|---|---|
| `app.js` | All client logic (quiz, analytics, Pro gate) | Quiz flow, UI, analytics events, Pro modal |
| `api/_lib/plans.js` | Pricing + plan definitions | Adding/changing a plan or price |
| `api/_lib/entitlements.js` | Grant/revoke/session logic | Entitlement mechanics |
| `supabase/schema.sql` | Database schema + RLS | Adding a table/column, changing schema |
| `docs/engineering/data-model.md` | Table documentation | Adding a table, clarifying schema |
| `docs/engineering/api-contracts.md` | API endpoint specs | Adding/changing an endpoint |
| `CLAUDE.md` | Operating rules (read this!) | Architecture decisions, safety rules |
| `GH600-Lab-Launch-Plan.md` | Strategy, pricing, PRD | Pricing decisions, feature scope |

---

## Common Patterns

### Calling the API from `app.js`
```javascript
const response = await apiRequest('/api/endpoint', { body });
if (!response.ok) {
  console.error(response.error);
  return;
}
// use response.data
```

### Adding a DB query in an API endpoint
```javascript
// api/my-endpoint.js
const { select } = require('./_lib/supabase');

const rows = await select('my_table', { email: userEmail });
```

### Creating an entitlement
```javascript
// api/_lib/entitlements.js
const entitlement = await grantEntitlement({
  email, plan, source: 'paddle', source_purchase_id: purchaseId
});
const token = await issueSession(entitlement);
```

### Verifying a session token
```javascript
// api/access/session.js
const session = verifySession(token); // throws if invalid
return json({ ok: true, plan: session.plan, email: session.email });
```

---

## Glossary

- **Entitlement:** An access record (email + plan + validity) derived from a purchase or code
- **Session token:** An HMAC-enveloped, revocable token issued per entitlement, verified on every Pro entry
- **Content tier:** A filter on which `gh600_scenarios_v2` rows a buyer can access (based on their plan)
- **Mock:** A 40-question exam module (MOCK_1–6 in the premium bank; Founder gets 3, Pro gets all 6 + drills)
- **Scenario:** A single multiple-choice question with explanation (300 total in v2)
- **Webhook:** Paddle's server→your-server callback confirming a payment
- **Service-role key:** Supabase's private key for backend writes (never exposed to client)
- **RLS:** Row-Level Security (Supabase's per-table authorization layer)

---

## Troubleshooting

| Problem | Diagnosis | Fix |
|---|---|---|
| Free diagnostic won't load | Check `backend.enabled` in browser console | Ensure `backend-config.js` loads before `app.js` |
| Pro lab says "access denied" | Session token invalid or expired | Re-enter email/code to get new token |
| Webhook not firing | Check Paddle webhook URL + events configured | Register webhook in Paddle dashboard for `transaction.completed`, `transaction.refunded`, `adjustment.created` |
| Entitlement not created after payment | Email resolution failed or purchase duplicated | Check `api/webhooks/paddle.js:resolvePaddleEmail()` + verify `(provider, provider_payment_id)` unique constraint |
| Tests failing | New code doesn't match contract | Check `api-contracts.md` + add test case in `tests/` |
| Secrets exposed | Found in commit history, screenshot, etc. | See `README.md` → "Token rotation checklist" |

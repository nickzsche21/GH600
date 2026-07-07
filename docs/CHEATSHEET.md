# GH600 Lab — Developer Cheatsheet

**Last updated:** 2026-07-07  
**Status:** 🚀 LIVE at https://gh600.com (production deployed, paid tiers active)

---

## Command Reference

### Run locally
```bash
# Static server (free diagnostic, no API)
python -m http.server 4173
# Open http://127.0.0.1:4173

# Full stack (API + Supabase)
npm install -g vercel
vercel dev
# Open http://127.0.0.1:3000
```

### Database
```bash
# Link to Supabase project
supabase link --project-ref <ref>

# Push migrations
supabase db push

# Pull schema from remote
supabase db pull  # (requires Docker)
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api.test.js

# Run with coverage
npm test -- --coverage
```

### Deployment
```bash
# Deploy to Vercel (requires auth)
vercel deploy --prod
```

### Secrets
```bash
# Generate signing secret (32 bytes)
openssl rand -hex 32

# Generate admin token (16 bytes)
openssl rand -hex 16
```

---

## File Locations

| What | Where |
|------|-------|
| Free quiz questions | `app.js` → `questions` array (line ~10) |
| Free quiz domains | `app.js` → `domains` array (line ~1) |
| Plans & pricing | `api/_lib/plans.js` |
| Entitlement logic | `api/_lib/entitlements.js` |
| Scenario mapping | `api/_lib/scenario-map.js` |
| Crypto helpers | `api/_lib/crypto.js` (HMAC, SHA256, timing-safe equal) |
| Supabase schema | `supabase/schema.sql` |
| Migrations | `supabase/migrations/*.sql` |
| Premium bank seed | `scripts/seed-scenarios-v2.js` |
| Premium bank data | `scripts/data/gh600-scenarios-v2.json` |
| Tests | `tests/*.test.js` |
| API endpoints | `api/*.js` (and subdirs) |

---

## The Three Tiers

| Tier | Plan ID | Price | Content | Mocks | Source |
|------|---------|-------|---------|-------|--------|
| Free | — | — | 12 diagnostic | — | `app.js` inline |
| Founder | `founding_access` | $29 | 120 questions | MOCK_1–3 | `gh600_scenarios_v2` |
| Pro | `pro` | $49 | 300 questions | MOCK_1–6 + drills | `gh600_scenarios_v2` |
| Team | `team_pack` | $149 | 300 (Pro content) | MOCK_1–6 + drills | `gh600_scenarios_v2` |
| Cram | `cram` | $99 | 300 (Pro content) | MOCK_1–6 + drills | `gh600_scenarios_v2` |

---

## API Endpoints Quick Reference

### Analytics
- `POST /api/event` — track user action

### Lead capture
- `POST /api/lead` — capture email at report gate

### Free diagnostic
- `POST /api/diagnostic/complete` — submit quiz results

### Payments
- `POST /api/checkout-intent` — get Paddle redirect or Wise follow-up
- `POST /api/webhooks/paddle` — confirm payment (webhook, signature-verified)
- `POST /api/admin/grant` — grant access (Wise manual grant)
- `POST /api/admin/revoke` — revoke access

### Access codes
- `POST /api/access/verify` — redeem a code → entitlement + session token
- `POST /api/access/session` — verify session token

### Paid scenarios
- `POST /api/scenarios/next?mock_id=MOCK_N` — get next scenario (tier-gated)
- `POST /api/scenarios/answer` — grade scenario (server-side)

### Feedback
- `POST /api/issue-report` — submit issue/bug report

---

## Database Tables Quick Reference

### Lead funnel
- `leads` — email captures
- `diagnostic_attempts` — free quiz results
- `analytics_events` — all user actions + payment events

### Payments
- `payment_intents` — checkout attempts
- `purchases` — confirmed payments (webhook idempotency key: `(provider, provider_payment_id)`)

### Access control
- `access_codes` — manual unlock codes (atomic RPC: `redeem_access_code`)
- `access_code_attempts` — per-(code, email) failure tracking (5-strikes/15-min lockout per buyer)
- `entitlements` — access grants (idempotent via `source_purchase_id` or `(source, metadata->>reference)`)
- `access_sessions` — revocable session tokens (hash-only stored, HMAC-verified)

### Content & feedback
- `gh600_scenarios_v2` — 300-scenario premium bank (tier gated, kill-switch via `review_status='rejected'`)
- `scenario_attempts` — Pro lab attempt log
- `issue_reports` — user-submitted issues

---

## Key Code Patterns

### Check if backend is enabled (client-side fallback)
```javascript
// app.js
if (!backend.enabled) {
  // Use localStorage + access-config.js demo codes
} else {
  // Use API
}
```

### Call the API (client-side)
```javascript
// app.js
const response = await apiRequest('/api/endpoint', { body });
if (!response.ok) {
  console.error(response.error);
  return;
}
// Use response
```

### Query the database (server-side)
```javascript
// api/my-endpoint.js
const { select } = require('./_lib/supabase');
const rows = await select('table_name', { column: value });
```

### Grant an entitlement (server-side)
```javascript
// api/_lib/entitlements.js
const entitlement = await grantEntitlement({
  email: 'user@example.com',
  plan: 'pro',
  source: 'paddle',
  source_purchase_id: purchaseId
});
```

### Issue a session token (server-side)
```javascript
// api/_lib/entitlements.js
const token = await issueSession(entitlement);
// token is HMAC-enveloped, return to client
```

### Verify a session token (server-side)
```javascript
// api/access/session.js
const session = verifySession(token);
// Throws if invalid; session = { email, plan, ... }
```

### Map v2 scenario to client contract (server-side)
```javascript
// api/_lib/scenario-map.js
const clientScenario = toClientScenario(v2Row);
// Strips answer key, remaps columns
```

### Grade a scenario (server-side)
```javascript
// api/scenarios/answer.js
const fields = gradingFields(v2Row);
const isCorrect = fields.correct_index === selected_index;
```

---

## Security Checklist

- ❌ Never put secrets in `app.js`, `*-config.js`, or committed files
- ❌ Never ignore webhook signatures (`Paddle-Signature`)
- ❌ Never trust client-sent `amount` (pricing is server-side)
- ❌ Never send scenario answer keys to the client
- ❌ Never store raw session tokens (hash-only)
- ✅ Always use service-role key for API → Supabase
- ✅ Always verify session tokens before serving paid content
- ✅ Always check entitlement on every Pro entry (`/api/access/session`)
- ✅ Always validate email before granting access
- ✅ Always use bearer-token auth for admin endpoints

---

## Common Git Workflows

### Check what changed
```bash
git status
git diff main
git diff main -- api/
```

### Stage and commit (with co-author)
```bash
git add api/my-endpoint.js tests/api.test.js
git commit -m "Add new endpoint

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Push to remote
```bash
git push origin main
```

---

## Useful SQL Queries

### Check leads captured
```sql
SELECT COUNT(*) FROM public.leads;
SELECT email, created_at FROM public.leads ORDER BY created_at DESC LIMIT 10;
```

### Check payments received
```sql
SELECT email, plan, amount, status FROM public.purchases ORDER BY created_at DESC;
```

### Check active entitlements
```sql
SELECT email, plan, active FROM public.entitlements WHERE active = true;
```

### Check access codes redeemed
```sql
SELECT code, email, uses, max_uses, active FROM public.access_codes;
```

### Check scenario attempts (Pro lab)
```sql
SELECT email, scenario_id, correct, created_at FROM public.scenario_attempts ORDER BY created_at DESC LIMIT 50;
```

### Manually revoke an entitlement
```sql
UPDATE public.entitlements SET active = false WHERE email = 'user@example.com';
```

### Pull a bad scenario from delivery
```sql
UPDATE public.gh600_scenarios_v2 SET review_status = 'rejected' WHERE id = 'GH600-V2-XYZ';
```

### Lock out a code after 5 failures
```sql
UPDATE public.access_codes SET locked_until = now() + interval '15 min' WHERE code = 'GH600-ABC-123';
```

---

## Troubleshooting

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Free diagnostic won't load | `backend.enabled` is false but no API | Check browser console; ensure `backend-config.js` loads |
| Pro lab says "access denied" | Session token invalid or expired | Have user re-enter email/code to get new token |
| Webhook not firing | Paddle webhook not configured | Register webhook in Paddle dashboard for `transaction.completed`, `transaction.refunded`, `adjustment.created` |
| Payment not recorded | Email resolution failed or hook error | Check Supabase logs; verify Paddle customer email exists |
| Scenario not grading | Server mapping failed or plan mismatch | Check `api/_lib/scenario-map.js`; verify plan tier gating |
| Tests failing | Test contract mismatch | Check `api-contracts.md` for correct shapes |
| Secrets leaked | Found in git history or screenshot | See `README.md` "Token rotation checklist" |

---

## Links

- **Codebase:** This repo
- **Architecture:** `docs/architecture/system-map.md`
- **API reference:** `docs/engineering/api-contracts.md`
- **Database:** `docs/engineering/data-model.md`
- **Implementation status:** `docs/history/IMPLEMENTATION_STATUS.md`
- **Quick start:** `docs/QUICK_START.md`
- **Code-review fixes:** `docs/plans/code-review-fixes-2026-07-06.md`
- **Premium bank plan:** `docs/plans/premium-bank-300.md`
- **Operating rules:** `CLAUDE.md`
- **Launch strategy:** `GH600-Lab-Launch-Plan.md`
- **Deployment:** `README.md` → "Deploy the paid-ready MVP"

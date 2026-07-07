# Production Deployment & Operations — GH600 Lab

**Deployed:** 2026-07-07  
**Status:** 🚀 LIVE at https://gh600.com  
**Paid tiers:** Active (Founder $29, Pro $49, Team/Cram via manual grant)

---

## What's Live

### Frontend (gh600.com)
- ✅ Static marketing site + hero (responsive, no framework)
- ✅ Free 12-question diagnostic (lead magnet)
- ✅ Email capture at report gate
- ✅ Readiness report (domain breakdown)
- ✅ Pricing page (Founder $29, Pro $49, Team $149, Cram $99)
- ✅ Checkout flow (Paddle for Founding/Pro, Wise for Team/Cram)
- ✅ Pro lab access (mock picker, 40-question exams)
- ✅ Analytics tracking (10 events)

### API (Vercel Edge Functions)
- ✅ 12 endpoints (lead, event, diagnostic, checkout, webhooks, access, admin, scenarios, issue report)
- ✅ Session token verification (HMAC-signed, revocable)
- ✅ Tier-gated scenario delivery (Founder: 120 / Pro: 300)
- ✅ Server-side grading (answer key never sent to client)
- ✅ Webhook signature verification (Paddle + replay guard)

### Database (Supabase)
- ✅ 11 tables (leads, analytics, diagnostics, payments, purchases, entitlements, sessions, scenarios, attempts, codes, access attempts)
- ✅ Row-level security (no public policies, service-role only)
- ✅ Atomic RPCs (redeem_access_code, register_failed_code)
- ✅ Idempotent webhook handling ((provider, provider_payment_id) unique key)

### Payments (Paddle + Wise)
- ✅ Paddle hosted checkout (Founding Access $29, Pro $49)
- ✅ Paddle webhook (transaction.completed, transaction.refunded, adjustment.created)
- ✅ Wise manual grants (Team $149, Cram $99)
- ✅ Admin grant endpoint (bearer token auth)
- ✅ Refund → entitlement revocation

### Content (Premium Bank)
- ✅ 300 scenarios (6 mocks × 40 questions + 60 drills)
- ✅ Tier gating (Founder: 120, Pro: 300)
- ✅ Mock-based delivery (not uncapped stream)
- ✅ Answer key security (never sent to browser)
- ✅ Kill-switch (review_status='rejected' pulls rows with one UPDATE, no deploy)

---

## Monitoring & Health Checks

### Daily Checks
```bash
# Check Paddle webhooks received
SELECT COUNT(*) FROM analytics_events 
WHERE event_name LIKE 'payment%' 
AND created_at > now() - interval '24 hours';

# Check purchases recorded
SELECT COUNT(*) FROM public.purchases 
WHERE created_at > now() - interval '24 hours';

# Check entitlements granted
SELECT COUNT(*) FROM public.entitlements 
WHERE created_at > now() - interval '24 hours' 
AND active = true;

# Check refunds processed
SELECT COUNT(*) FROM public.purchases 
WHERE status = 'refunded' 
AND refunded_at > now() - interval '24 hours';

# Check session tokens issued
SELECT COUNT(*) FROM public.access_sessions 
WHERE issued_at > now() - interval '24 hours';

# Check access code redemptions
SELECT COUNT(*) FROM public.analytics_events 
WHERE event_name = 'pro_gate_unlocked' 
AND created_at > now() - interval '24 hours';
```

### Weekly Checks
```bash
# Check for payment failures
SELECT COUNT(*), error FROM public.payment_intents 
WHERE status IN ('failed', 'error') 
AND created_at > now() - interval '7 days'
GROUP BY error;

# Check for refund disputes
SELECT COUNT(*) FROM public.purchases 
WHERE status = 'chargeback' 
AND created_at > now() - interval '7 days';

# Check access code lockouts
SELECT code, COUNT(*) as attempts FROM public.access_code_attempts 
WHERE created_at > now() - interval '7 days'
GROUP BY code 
HAVING COUNT(*) >= 5;

# Check diagnostic-to-checkout funnel
SELECT 
  COUNT(DISTINCT d.session_id) as diagnostics,
  COUNT(DISTINCT l.email) as leads,
  COUNT(DISTINCT pi.email) as checkout_attempts
FROM public.diagnostic_attempts d
LEFT JOIN public.leads l ON d.email = l.email
LEFT JOIN public.payment_intents pi ON l.email = pi.email
WHERE d.created_at > now() - interval '7 days';

# Check Pro lab usage
SELECT 
  COUNT(DISTINCT session_id) as unique_users,
  COUNT(*) as total_attempts,
  AVG(CASE WHEN correct THEN 1 ELSE 0 END) as accuracy
FROM public.scenario_attempts 
WHERE created_at > now() - interval '7 days';
```

### Monthly Review
- [ ] Download analytics events from Supabase
- [ ] Review funnel metrics (diagnostics → leads → checkouts → payments)
- [ ] Review Pro lab usage (active users, average attempts per user, pass rates)
- [ ] Review refund rate & reasons
- [ ] Review access code redemptions & lockouts
- [ ] Review scenario attempts for quality (any with <50% pass rate?)

---

## Incident Response

### Paddle Webhook Failure
**Symptom:** Payment received in Paddle, no entitlement in Supabase

**Steps:**
1. Check `api/webhooks/paddle.js` logs (Vercel deployment view)
2. Run: `SELECT * FROM public.purchases WHERE email = 'buyer@email' ORDER BY created_at DESC;`
3. If missing:
   - Verify email resolution succeeded (check for `payment_unresolved` event)
   - Manually grant with: `POST /api/admin/grant` (bearer token)
4. If duplicate payment:
   - Verify `(provider, provider_payment_id)` unique constraint
   - Check if webhook was re-sent (Paddle sends 3x with backoff)

### Session Token Expired Mid-Lab
**Symptom:** User in Pro lab, token expires, sees "access denied"

**Expected behavior:**
- Session expires after 30 days (`SESSION_TTL_MS`)
- User re-enters email/code to get new token
- Not an incident (working as designed)

**If occurring immediately:**
1. Check token TTL: `SELECT expires_at FROM access_sessions WHERE email = 'user@email' ORDER BY issued_at DESC LIMIT 1;`
2. Verify `ENTITLEMENT_SIGNING_SECRET` hasn't changed (would invalidate all tokens)
3. Check clock skew between servers

### Access Code Lockout
**Symptom:** User locked out after 5 wrong-email attempts, correct email also blocked

**Expected behavior (after fix):**
- Lockout keyed on `(code, email)` pair, not code alone
- Only the wrong-email attempts lock out that email
- Correct email can still redeem

**If not working:**
1. Check migration applied: `supabase/migrations/20260706185145_fix_access_code_lockout_identity.sql`
2. Verify table exists: `SELECT * FROM public.access_code_attempts LIMIT 1;`
3. Manually unlock: `DELETE FROM public.access_code_attempts WHERE code = 'XXX' AND email = 'user@email';`

### Scenarios Not Rendering (XSS or Performance)
**Symptom:** Pro lab stuck loading or shows corrupted question

**Steps:**
1. Check specific scenario: `SELECT id, prompt, artifact FROM public.gh600_scenarios_v2 WHERE id = 'GH600-V2-###';`
2. Look for:
   - Unescaped HTML: `prompt LIKE '%</%'` (SQL keyword search, rough check)
   - Oversized artifacts: `LENGTH(artifact) > 50000` (too large for safe rendering)
3. If problem found:
   - Pull from delivery: `UPDATE public.gh600_scenarios_v2 SET review_status = 'rejected' WHERE id = 'GH600-V2-###';`
   - No deploy needed; takes effect immediately
4. Escalate to SME review if pattern observed

### Rate Limiting Needed
**Symptom:** Spike in failed webhook requests or access-code brute-force attempts

**Current mitigations:**
- Per-code lockout: 5 failed attempts → 15-min lockout per (code, email)
- No global rate limiting yet (open in `docs/history/known-issues.md`)

**Immediate action:**
- Add Vercel rate-limiting middleware (if spike is real traffic attack)
- Or flag in next roadmap phase

---

## Post-Launch Checklist

### Week 1
- [ ] Monitor all health checks above
- [ ] Test Paddle webhook handling (intentional re-send test)
- [ ] Verify refund flow (test chargeback in Paddle sandbox)
- [ ] Verify access code redemption (test re-login scenario)
- [ ] Check for any `payment_unresolved` events (email resolution failures)

### Week 2
- [ ] Review first batch of diagnostics & checkout attempts
- [ ] Calculate free → paid conversion rate
- [ ] Identify top performing/struggling scenarios (by pass rate)
- [ ] Follow up with any Wise (Team/Cram) customers

### Month 1
- [ ] Get SME review started (30-day target for all 300 scenarios)
- [ ] Plan any content updates based on scenario performance
- [ ] Document any operational issues & fixes
- [ ] Consider operationalization work (email, legal pages, rate limiting)

### Ongoing
- [ ] Monitor Supabase usage (storage, compute, API calls)
- [ ] Monitor Vercel deployment (cold starts, latency, errors)
- [ ] Monitor Paddle webhook success rate (aim for 100%)
- [ ] Track revenue (daily orders, refund rate, LTV)
- [ ] Review scenario attempts for quality signals

---

## Runbooks

### Grant Manual Access (Wise Transfer)
```bash
curl -X POST https://gh600.com/api/admin/grant \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "plan": "team",
    "source": "wise",
    "reference": "wise-transfer-id-or-invoice-number",
    "expires_at": "2026-12-31T23:59:59Z"
  }'
```

### Revoke Access
```bash
curl -X POST https://gh600.com/api/admin/revoke \
  -H "authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email": "buyer@example.com"}'
```

### Issue Manual Access Code
```sql
INSERT INTO public.access_codes (email, code, plan, max_uses)
VALUES ('buyer@example.com', 'GH600-UNIQUE-CODE', 'founding_access', 1);
```

### Pull a Bad Scenario from Delivery
```sql
UPDATE public.gh600_scenarios_v2 
SET review_status = 'rejected' 
WHERE id = 'GH600-V2-###'
  AND review_status != 'rejected';
```

### Extend Entitlement Expiration
```sql
UPDATE public.entitlements 
SET expires_at = '2027-12-31T23:59:59Z' 
WHERE email = 'buyer@example.com' 
  AND active = true 
  AND plan = 'pro';
```

---

## Secrets & Credentials

**Never commit or log:**
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase private key
- `ENTITLEMENT_SIGNING_SECRET` — Signs session tokens
- `ADMIN_API_TOKEN` — Admin endpoint auth
- `PADDLE_API_KEY` — Paddle API auth
- `PADDLE_WEBHOOK_SECRET` — Webhook signature verification

**Rotation procedure:**
1. Generate new secret: `openssl rand -hex 32` (or `-hex 16` for tokens)
2. Update in Vercel Project Settings → Environment Variables
3. Deploy with new secret
4. Old tokens/signing secrets will stop working (reset all active sessions if needed)

**If exposed:**
1. Rotate immediately in Vercel
2. Rotate in Paddle dashboard (webhook secret, API key)
3. Rotate in Supabase dashboard (service role key)
4. Re-seed the database if needed (truncate tables if attacker had access)
5. Review logs for any unauthorized access

---

## Performance & Scalability

### Current limits
- Vercel: 10 per second per deployment, 3,000 per minute
- Supabase: shared PostgreSQL (see Plan pricing)
- Paddle: no rate limit (webhook delivery best-effort, 3x retries)

### Monitoring for scale
- If Pro lab hits high concurrency (many users grading simultaneously):
  - Vercel Compute Units usage may spike
  - Supabase connection pool may saturate
  - Scenario queries may slow (add indexes if needed)
- Monitor latency: `POST /api/scenarios/answer` should be <200ms

### Future optimization
- Cache scenario list in CDN (Vercel Caching)
- Connection pooling (PgBouncer) if DB connections become bottleneck
- CDN for static assets (already served by Vercel)

---

## References

- **Live site:** https://gh600.com
- **Vercel dashboard:** https://vercel.com/dashboard
- **Supabase console:** https://supabase.com/dashboard
- **Paddle dashboard:** https://vendors.paddle.com/
- **Architecture:** `docs/architecture/system-map.md`
- **API specs:** `docs/engineering/api-contracts.md`
- **Database:** `docs/engineering/data-model.md`
- **Latest changes:** `docs/LATEST_CHANGES.md`

import { json, normalizeEmail } from "../_lib/http.js";
import { insert, select } from "../_lib/supabase.js";
import { resolvePlanByPriceId } from "../_lib/plans.js";
import { grantEntitlement, recordPurchase, revokeEntitlement } from "../_lib/entitlements.js";
import { hmacHex, timingSafeEqualHex } from "../_lib/crypto.js";

// Paddle's own guidance: reject signatures older than ~5 minutes (not 5
// seconds — clock skew and Edge cold starts can easily exceed a few seconds).
const REPLAY_TOLERANCE_MS = 5 * 60 * 1000;
const REFUND_EVENTS = new Set(["transaction.refunded", "adjustment.created"]);

function parseSignatureHeader(header) {
  const parts = Object.fromEntries(String(header || "").split(";").map(part => part.split("=")));
  return { ts: parts.ts, h1: parts.h1 };
}

async function verifySignature(request, rawBody) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;
  const { ts, h1 } = parseSignatureHeader(request.headers.get("paddle-signature"));
  if (!ts || !h1) return false;
  if (Math.abs(Date.now() - Number(ts) * 1000) > REPLAY_TOLERANCE_MS) return false;
  const expected = await hmacHex(secret, `${ts}:${rawBody}`);
  return timingSafeEqualHex(expected, h1);
}

async function logAnalyticsEvent(eventName, email, metadata) {
  await insert("analytics_events", {
    session_id: "server:webhooks/paddle",
    email: email || null,
    event_name: eventName,
    metadata: metadata || {}
  }).catch(() => {});
}

async function resolvePaddleEmail(data) {
  const direct = data.custom_data?.email;
  if (direct) return normalizeEmail(direct);
  const customerId = data.customer_id;
  const apiKey = process.env.PADDLE_API_KEY;
  if (!customerId || !apiKey) return "";
  const host = process.env.PADDLE_ENV === "sandbox" ? "api.sandbox.paddle.com" : "api.paddle.com";
  try {
    const response = await fetch(`https://${host}/customers/${customerId}`, {
      headers: { authorization: `Bearer ${apiKey}` }
    });
    if (!response.ok) return "";
    const body = await response.json();
    return normalizeEmail(body?.data?.email || "");
  } catch {
    return "";
  }
}

function paddleAmountToUnits(rawValue) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric / 100 : null;
}

// Paddle emits `adjustment.created` for partial refunds, credits, and tax
// adjustments too — only a full refund should ever revoke access.
function isFullRefund(eventType, data, purchase) {
  if (eventType === "transaction.refunded") return true;
  if (eventType === "adjustment.created" && data.action === "refund") {
    const refundedUnits = paddleAmountToUnits(data.totals?.total ?? data.total ?? data.amount);
    if (refundedUnits === null) return false; // amount ambiguous -> don't revoke
    return Math.abs(refundedUnits - purchase.amount) < 0.01;
  }
  return false;
}

export async function POST(request) {
  const rawBody = await request.text();
  const validSignature = await verifySignature(request, rawBody).catch(() => false);
  if (!validSignature) return json({ ok: false, error: "Invalid signature" }, 401);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ ok: true });
  }

  const eventType = event.event_type;
  const data = event.data || {};

  if (eventType === "transaction.completed") {
    const priceId = data.items?.[0]?.price?.id;
    const plan = resolvePlanByPriceId(priceId);
    const email = await resolvePaddleEmail(data);
    if (plan && email) {
      const purchase = await recordPurchase({
        email,
        provider: "paddle",
        provider_payment_id: data.id,
        provider_order_id: data.order_id || null,
        plan: plan.id,
        amount: plan.amount,
        currency: plan.currency,
        metadata: { price_id: priceId }
      });
      const entitlement = await grantEntitlement({
        email,
        plan: plan.id,
        source: "paddle",
        source_purchase_id: purchase.id
      });
      await logAnalyticsEvent("payment_succeeded", email, { plan: plan.id, provider: "paddle" });
      await logAnalyticsEvent("entitlement_granted", email, { plan: plan.id, entitlement_id: entitlement.id });
    } else {
      await logAnalyticsEvent("payment_unresolved", email || null, { price_id: priceId || null, provider_payment_id: data.id || null });
    }
  } else if (REFUND_EVENTS.has(eventType)) {
    const providerPaymentId = data.transaction_id || data.id;
    const purchases = await select("purchases", { provider: "eq.paddle", provider_payment_id: `eq.${providerPaymentId}`, limit: "1" });
    const purchase = purchases[0];
    if (purchase) {
      if (isFullRefund(eventType, data, purchase)) {
        const entitlements = await select("entitlements", { source_purchase_id: `eq.${purchase.id}`, limit: "1" });
        const entitlement = entitlements[0];
        if (entitlement) {
          await revokeEntitlement({ entitlement_id: entitlement.id, reason: eventType });
          await logAnalyticsEvent("refund_completed", purchase.email, { plan: purchase.plan, provider: "paddle" });
        }
      } else {
        await logAnalyticsEvent("partial_refund", purchase.email, { plan: purchase.plan, provider: "paddle", event_type: eventType });
      }
    }
  }

  return json({ ok: true });
}

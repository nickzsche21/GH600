import { json } from "../_lib/http.js";
import { insert, select } from "../_lib/supabase.js";
import { resolvePlanByPriceId } from "../_lib/plans.js";
import { grantEntitlement, recordPurchase, revokeEntitlement } from "../_lib/entitlements.js";

const REPLAY_TOLERANCE_MS = 5000;
const REFUND_EVENTS = new Set(["transaction.refunded", "adjustment.created"]);

function parseSignatureHeader(header) {
  const parts = Object.fromEntries(String(header || "").split(";").map(part => part.split("=")));
  return { ts: parts.ts, h1: parts.h1 };
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(request, rawBody) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;
  const { ts, h1 } = parseSignatureHeader(request.headers.get("paddle-signature"));
  if (!ts || !h1) return false;
  if (Math.abs(Date.now() - Number(ts) * 1000) > REPLAY_TOLERANCE_MS) return false;
  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
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
    const email = (data.custom_data?.email || "").toLowerCase();
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
    }
  } else if (REFUND_EVENTS.has(eventType)) {
    const providerPaymentId = data.transaction_id || data.id;
    const purchases = await select("purchases", { provider: "eq.paddle", provider_payment_id: `eq.${providerPaymentId}`, limit: "1" });
    const purchase = purchases[0];
    if (purchase) {
      const entitlements = await select("entitlements", { source_purchase_id: `eq.${purchase.id}`, limit: "1" });
      const entitlement = entitlements[0];
      if (entitlement) {
        await revokeEntitlement({ entitlement_id: entitlement.id, reason: eventType });
        await logAnalyticsEvent("refund_completed", purchase.email, { plan: purchase.plan, provider: "paddle" });
      }
    }
  }

  return json({ ok: true });
}

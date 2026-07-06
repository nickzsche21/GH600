import { HttpError } from "./http.js";
import { insert, select, update, rpc } from "./supabase.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function signingSecret() {
  const secret = process.env.ENTITLEMENT_SIGNING_SECRET;
  if (!secret) throw new HttpError(503, "Entitlement signing is not configured");
  return secret;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function hmacSign(message, secret) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function hmacVerify(message, signatureB64Url, secret) {
  const key = await importHmacKey(secret);
  const signature = base64UrlToBytes(signatureB64Url);
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(message));
}

async function sha256Hex(message) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomOpaqueId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function recordPurchase({ email, provider, provider_payment_id, provider_order_id, plan, amount, currency, metadata }) {
  const existing = await select("purchases", { provider: `eq.${provider}`, provider_payment_id: `eq.${provider_payment_id}`, limit: "1" });
  if (existing.length) return existing[0];
  const [purchase] = await insert("purchases", {
    email,
    provider,
    provider_payment_id,
    provider_order_id: provider_order_id || null,
    plan,
    amount,
    currency,
    status: "paid",
    metadata: metadata || {}
  });
  return purchase;
}

export async function grantEntitlement({ email, plan, source, source_purchase_id, granted_by, expires_at, reference }) {
  if (source_purchase_id) {
    const existing = await select("entitlements", { source_purchase_id: `eq.${source_purchase_id}`, limit: "1" });
    if (existing.length) return existing[0];
  } else if (reference) {
    const existing = await select("entitlements", { source: `eq.${source}`, "metadata->>reference": `eq.${reference}`, limit: "1" });
    if (existing.length) return existing[0];
  }
  const [entitlement] = await insert("entitlements", {
    email,
    plan,
    active: true,
    source_purchase_id: source_purchase_id || null,
    source,
    granted_by: granted_by || null,
    expires_at: expires_at || null,
    metadata: reference ? { reference } : {}
  });
  return entitlement;
}

export async function revokeEntitlement({ entitlement_id, reason }) {
  const [entitlement] = await update("entitlements", { id: `eq.${entitlement_id}` }, { active: false, revocation_reason: reason || null });
  await update("access_sessions", { entitlement_id: `eq.${entitlement_id}` }, { revoked: true });
  return entitlement;
}

export async function issueSession(entitlement) {
  const secret = signingSecret();
  const sessionId = randomOpaqueId();
  const tokenHash = await sha256Hex(sessionId);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await insert("access_sessions", {
    email: entitlement.email,
    plan: entitlement.plan,
    entitlement_id: entitlement.id,
    token_hash: tokenHash,
    expires_at: expiresAt
  });
  const signature = await hmacSign(sessionId, secret);
  return { token: `${sessionId}.${signature}`, expires_at: expiresAt };
}

export async function verifySession(rawToken) {
  const secret = signingSecret();
  const value = String(rawToken || "");
  const separatorIndex = value.lastIndexOf(".");
  if (separatorIndex < 1) return null;
  const sessionId = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  const validSignature = await hmacVerify(sessionId, signature, secret).catch(() => false);
  if (!validSignature) return null;
  const tokenHash = await sha256Hex(sessionId);
  const rows = await select("access_sessions", { token_hash: `eq.${tokenHash}`, revoked: "eq.false", limit: "1" });
  const session = rows[0];
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) return null;
  await update("access_sessions", { id: `eq.${session.id}` }, { last_seen_at: new Date().toISOString() });
  return { email: session.email, plan: session.plan };
}

export async function redeemAccessCode(code, email) {
  const rows = await rpc("redeem_access_code", { p_code: code, p_email: email });
  return rows[0] || null;
}

export function registerFailedCode(code) {
  return rpc("register_failed_code", { p_code: code });
}

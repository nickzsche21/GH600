import { HttpError } from "./http.js";

async function sha256Hex(message) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function requireAdmin(request) {
  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured) throw new HttpError(401, "Admin access is not configured");
  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(provided, configured)) throw new HttpError(401, "Invalid admin token");
  return `admin:${(await sha256Hex(configured)).slice(0, 12)}`;
}

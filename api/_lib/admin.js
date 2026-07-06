import { HttpError } from "./http.js";
import { sha256Hex, timingSafeEqualHex } from "./crypto.js";

export async function requireAdmin(request) {
  const configured = process.env.ADMIN_API_TOKEN;
  if (!configured) throw new HttpError(401, "Admin access is not configured");
  const header = request.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqualHex(provided, configured)) throw new HttpError(401, "Invalid admin token");
  return `admin:${(await sha256Hex(configured)).slice(0, 12)}`;
}

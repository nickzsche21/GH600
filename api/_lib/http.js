export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function readJson(request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Expected application/json");
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function handleError(error) {
  if (error instanceof HttpError) {
    if (error.status >= 500) console.error(error);
    return json({ ok: false, error: error.message }, error.status);
  }
  console.error(error);
  return json({ ok: false, error: "Server unavailable. Please try again." }, 500);
}

export function text(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function normalizeEmail(value) {
  return text(value, 254).toLowerCase();
}

export function requireEmail(value) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
  return email;
}

export function safeMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const serialized = JSON.stringify(value);
  if (serialized.length <= 10000) return JSON.parse(serialized);
  return { truncated: true, preview: serialized.slice(0, 9000) };
}

import { HttpError } from "./http.js";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, "Backend storage is not configured");
  return { url, key };
}

async function request(table, { method = "GET", query = {}, body, prefer } = {}) {
  const { url, key } = config();
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  Object.entries(query).forEach(([name, value]) => endpoint.searchParams.set(name, value));
  const response = await fetch(endpoint, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase ${method} ${table}: ${response.status} ${detail}`);
    throw new HttpError(502, "Storage request failed");
  }
  if (response.status === 204) return [];
  return response.json();
}

export function insert(table, row) {
  return request(table, { method: "POST", body: row, prefer: "return=representation" });
}

export function select(table, query) {
  return request(table, { query });
}

export function update(table, query, patch) {
  return request(table, { method: "PATCH", query, body: patch, prefer: "return=representation" });
}

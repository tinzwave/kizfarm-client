import { getAuthToken } from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const token = getAuthToken();

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = init.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isUrlEncoded =
    typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  if (body && !isFormData && !isUrlEncoded && !isBlob && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  const contentType = res.headers.get("content-type") || "";
  const payload =
    contentType.includes("application/json") ? await res.json() : await res.text();
  return { res, payload };
}

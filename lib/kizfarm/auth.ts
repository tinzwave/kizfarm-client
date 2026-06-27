"use client";

export type KizfarmUser = {
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  role?: string;
  isAdmin?: boolean;
  type?: string;
};

const TOKEN_KEY = "kizfarm_token";
const USER_KEY = "kizfarm_user";
const ADMIN_TOKEN_KEY = "kizfarm_admin_token";
const ADMIN_USER_KEY = "kizfarm_admin_user";
const PENDING_EMAIL_KEY = "kizfarm_pending_email";

export function parseJwt(token: string | null) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null) {
  const payload = parseJwt(token);
  if (!payload?.exp) return !token;
  return Date.now() >= payload.exp * 1000;
}

export function isAdminUser(value: any) {
  return value?.role === "admin" || value?.isAdmin === true || value?.type === "admin";
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (adminToken && !isTokenExpired(adminToken)) return adminToken;

  const token = localStorage.getItem(TOKEN_KEY);
  const user = getStoredUser();
  if (isAdminUser(user)) return null;
  if (token && !isTokenExpired(token)) return token;
  clearAuth();
  return null;
}

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token || isTokenExpired(token)) {
    clearAdminAuth();
    return null;
  }
  return token;
}

export function getStoredUser(): KizfarmUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserAuth(token: string, user: KizfarmUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  clearAdminAuth();
  window.dispatchEvent(new Event("kizfarm_auth_changed"));
}

export function saveAdminAuth(token: string, admin: KizfarmUser) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ ...admin, role: "admin" }));
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...admin, role: "admin" }));
  window.dispatchEvent(new Event("kizfarm_auth_changed"));
}

export function clearAdminAuth() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  try {
    const localUser = localStorage.getItem(USER_KEY);
    if (localUser && isAdminUser(JSON.parse(localUser))) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearAdminAuth();
  window.dispatchEvent(new Event("kizfarm_auth_changed"));
}

export function setPendingVerificationEmail(email: string) {
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}

export function getPendingVerificationEmail() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PENDING_EMAIL_KEY);
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_EMAIL_KEY);
}

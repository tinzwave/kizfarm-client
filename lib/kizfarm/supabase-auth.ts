"use client";

import { clearVerifiedUserCache, createClient, getVerifiedUser, sessionMsRemaining } from "./supabase-client";

export type KizfarmProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "user" | "admin" | "farmer";
  status: string;
  profile_image: string | null;
  bio?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  account_balance: number;
};

export function isAdminProfile(profile: KizfarmProfile | null | undefined) {
  return profile?.role === "admin";
}

// Where to send someone after login when a protected page bounced them
// there (e.g. the "Complete payment" link in an email). Only same-site
// paths are accepted -- never "//evil.com" or "/\\evil.com" -- so the
// parameter can't be abused as an open redirect to a phishing site.
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/login")) return null;
  return value;
}

export function loginPathWithRedirect() {
  if (typeof window === "undefined") return "/login";
  const here = window.location.pathname + window.location.search;
  return `/login?redirect=${encodeURIComponent(here)}`;
}

export function redirectPathForRole(role: string | undefined | null) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "farmer") return "/farmer/dashboard";
  return "/buyer/dashboard";
}

// Returns the local session, or null once it's past the 1-hour login limit
// (signing it out so every page agrees the person is logged out).
export async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session && sessionMsRemaining(session) <= 0) {
    await signOut();
    return null;
  }
  return session;
}

// The signed-in person's profile. Cached briefly per user so that the home
// page redirect, the layout guard and the page itself don't each refetch it
// one after another on the same navigation (each fetch is a slow round-trip).
const PROFILE_CACHE_MS = 60 * 1000;
let profileCache: { userId: string; at: number; result: Promise<KizfarmProfile | null> } | null = null;

export async function getCurrentProfile(): Promise<KizfarmProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await getVerifiedUser(supabase);
  if (!user) return null;

  if (profileCache && profileCache.userId === user.id && Date.now() - profileCache.at < PROFILE_CACHE_MS) {
    return profileCache.result;
  }

  const entry = {
    userId: user.id,
    at: Date.now(),
    result: (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error || !data) return null;
      return data as KizfarmProfile;
    })(),
  };
  profileCache = entry;
  entry.result.then((p) => {
    if (!p && profileCache === entry) profileCache = null;
  });
  return entry.result;
}

// Call after the person edits their own profile so guards see the change.
export function clearCurrentProfileCache() {
  profileCache = null;
}

export async function signOut() {
  profileCache = null;
  clearVerifiedUserCache();
  const supabase = createClient();
  await supabase.auth.signOut().catch(() => {});
}

// Pending-email passthrough for the signup -> OTP -> login flow (unrelated
// to the auth mechanism itself, just carries the email between pages).
const PENDING_EMAIL_KEY = "kizfarm_pending_email";

export function setPendingVerificationEmail(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_EMAIL_KEY, email);
}

export function getPendingVerificationEmail() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PENDING_EMAIL_KEY);
}

export function clearPendingVerificationEmail() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_EMAIL_KEY);
}

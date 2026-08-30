"use client";

import { createClient } from "./supabase-client";

export type KizfarmProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "user" | "admin" | "farmer";
  status: string;
  profile_image: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  account_balance: number;
};

export function isAdminProfile(profile: KizfarmProfile | null | undefined) {
  return profile?.role === "admin";
}

export function redirectPathForRole(role: string | undefined | null) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "farmer") return "/farmer/dashboard";
  return "/buyer/dashboard";
}

export async function getSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentProfile(): Promise<KizfarmProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as KizfarmProfile;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
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

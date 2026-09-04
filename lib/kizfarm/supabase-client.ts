import { createBrowserClient } from "@supabase/ssr";

// "Remember me" on the login page: checked (the default, matching this
// app's original always-persisted behavior) keeps the session in
// localStorage, so it survives closing the browser; unchecked switches to
// sessionStorage, so the session dies when the tab/browser closes. The
// preference itself always lives in localStorage (it's not sensitive) so
// every later createClient() call -- guards, other pages -- picks the same
// storage the session was actually written to.
const REMEMBER_ME_KEY = "kizfarm_remember_me";

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
  } catch {}
}

export function createClient() {
  const authOptions: { storage?: Storage } = {};
  if (typeof window !== "undefined") {
    try {
      if (localStorage.getItem(REMEMBER_ME_KEY) === "0") {
        authOptions.storage = window.sessionStorage;
      }
    } catch {}
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: authOptions },
  );
}

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

// Every login lasts at most this long, counted from when the person signed
// in (not from their last activity) -- after that they must log in again.
// The same limit is set server-side (Supabase Auth "sessions_timebox"), which
// also covers the mobile app; this client-side check makes the web app act
// on it at the exact moment instead of up to an access-token lifetime later.
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

type SessionLike = { access_token: string } | null | undefined;

function decodeJwtPayload(token: string): any {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// When the person actually signed in (unix seconds). Supabase keeps the
// original sign-in time in the token's `amr` claim across refreshes; `iat`
// would reset on every refresh, so it's only a fallback.
export function sessionSignedInAt(session: SessionLike): number | null {
  if (!session?.access_token) return null;
  const claims = decodeJwtPayload(session.access_token);
  if (!claims) return null;
  const amrTimes = Array.isArray(claims.amr)
    ? claims.amr.map((a: any) => Number(a?.timestamp)).filter((t: number) => t > 0)
    : [];
  if (amrTimes.length) return Math.max(...amrTimes);
  return Number(claims.iat) || null;
}

// Pages where money is moving: checkout, the payment hand-off/return pages
// (order payment starts and returns on track-order) and course checkout.
// Logging someone out on one of these mid-payment would strand the payment
// they just made, so the limit is stretched by a grace period there; it
// applies again as soon as they move on.
const PAYMENT_PATHS = ["/buyer/checkout", "/buyer/payment", "/buyer/track-order", "/learning/checkout"];
const PAYMENT_GRACE_SECONDS = 30 * 60;

export function isPaymentPage(pathname?: string): boolean {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "");
  return PAYMENT_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

// Milliseconds left before this login must end (<= 0 means it already has).
export function sessionMsRemaining(session: SessionLike, pathname?: string): number {
  const signedInAt = sessionSignedInAt(session);
  // A token we can't read is treated as still valid -- the server checks it
  // on every request anyway, and a parsing problem must never lock everyone
  // out of the app.
  if (!signedInAt) return Number.POSITIVE_INFINITY;
  const grace = isPaymentPage(pathname) ? PAYMENT_GRACE_SECONDS : 0;
  return (signedInAt + SESSION_MAX_AGE_SECONDS + grace) * 1000 - Date.now();
}

// A verified getUser() that only goes to the Auth server once per access
// token. Before this, every page and data helper called
// supabase.auth.getUser() on its own -- a full round-trip to the Auth
// server each time (0.5-2s from Nigeria), several in a row per page.
// Row-level security still checks the token on every database request, so
// reusing one verification for the same token loses nothing.
type GetUserResult = Awaited<ReturnType<ReturnType<typeof createBrowserClient>["auth"]["getUser"]>>;
let verifiedUserCache: { token: string; result: Promise<GetUserResult> } | null = null;

export async function getVerifiedUser(supabase: ReturnType<typeof createClient>): Promise<GetUserResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { data: { user: null }, error: null } as unknown as GetUserResult;

  if (sessionMsRemaining(session) <= 0) {
    verifiedUserCache = null;
    // "local": end the login on this device only. The default ("global")
    // would also log the person out of the mobile app and every other device.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return { data: { user: null }, error: null } as unknown as GetUserResult;
  }

  if (verifiedUserCache?.token !== session.access_token) {
    const result = supabase.auth.getUser();
    const entry = { token: session.access_token, result };
    verifiedUserCache = entry;
    // Don't keep a failed check around -- the next call should retry.
    result.then(
      (r) => {
        if (r.error && verifiedUserCache === entry) verifiedUserCache = null;
      },
      () => {
        if (verifiedUserCache === entry) verifiedUserCache = null;
      },
    );
  }
  return verifiedUserCache.result;
}

export function clearVerifiedUserCache() {
  verifiedUserCache = null;
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

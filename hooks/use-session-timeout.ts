"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient, sessionMsRemaining } from "@/lib/kizfarm/supabase-client";
import { signOut } from "@/lib/kizfarm/supabase-auth";

// Logs the person out the moment their 1-hour login is up, even if they're
// just sitting on a page, and sends them to the given login page. The timer
// is re-armed whenever the session changes (sign-in, token refresh).
export function useSessionTimeout(loginPath: string, enabled = true) {
  const router = useRouter();
  // Re-armed on every page change: the limit is longer on payment pages
  // (see sessionMsRemaining) and back to normal once the person leaves.
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const expire = async () => {
      if (cancelled) return;
      await signOut("local");
      if (cancelled) return;
      const here = window.location.pathname + window.location.search;
      const sep = loginPath.includes("?") ? "&" : "?";
      router.replace(`${loginPath}${sep}expired=1&redirect=${encodeURIComponent(here)}`);
    };

    const arm = (session: { access_token: string } | null) => {
      if (timer) clearTimeout(timer);
      if (!session) return;
      const ms = sessionMsRemaining(session, pathname);
      if (ms <= 0) {
        // Deferred: signing out from inside an auth-state callback can
        // deadlock supabase-js's auth lock.
        timer = setTimeout(expire, 0);
        return;
      }
      if (!Number.isFinite(ms)) return;
      // setTimeout can't wait longer than ~24.8 days; an hour is well within.
      timer = setTimeout(expire, ms + 500);
    };

    supabase.auth.getSession().then(({ data: { session } }) => arm(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => arm(session));

    // Timers are paused while a phone sleeps or the tab is in the
    // background -- re-check as soon as the person comes back.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession().then(({ data: { session } }) => arm(session));
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, loginPath, router, pathname]);
}

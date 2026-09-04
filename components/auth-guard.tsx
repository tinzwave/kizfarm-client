"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getSession, signOut } from "@/lib/kizfarm/supabase-auth";

type AuthGuardProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const session = await getSession();
      if (!session) {
        if (!cancelled) setAuthorized(false);
        router.replace("/login");
        return;
      }

      const profile = await getCurrentProfile();
      // getSession() only reads the local token and doesn't confirm it's
      // still valid server-side; getCurrentProfile() does a real check via
      // supabase.auth.getUser(). A null profile here means the session has
      // actually expired (e.g. after a long time away) -- without this
      // check, that case fell through to authorized=true below, leaving
      // the buyer stuck on a blank dashboard instead of being sent to log
      // back in.
      if (!profile) {
        // Clear the dead local session so /login and "/" don't see a
        // truthy getSession() and try to bounce back in here.
        await signOut();
        if (!cancelled) setAuthorized(false);
        router.replace("/login");
        return;
      }

      if (profile.role === "admin") {
        if (!cancelled) setAuthorized(false);
        router.replace("/admin/dashboard");
        return;
      }

      if (profile.status !== "active") {
        await signOut();
        if (!cancelled) setAuthorized(false);
        router.replace("/login");
        return;
      }

      if (!cancelled) setAuthorized(true);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (authorized === null) {
    return (
      fallback ?? (
        <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">
          Loading account...
        </div>
      )
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}

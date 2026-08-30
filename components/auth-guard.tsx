"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getSession } from "@/lib/kizfarm/supabase-auth";

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
      if (profile?.role === "admin") {
        if (!cancelled) setAuthorized(false);
        router.replace("/admin/dashboard");
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

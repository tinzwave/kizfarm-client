"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentProfile, getSession, isAdminProfile } from "@/lib/kizfarm/supabase-auth";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const session = await getSession();
      if (session) {
        const profile = await getCurrentProfile();
        if (isAdminProfile(profile)) {
          if (!cancelled) setAuthorized(true);
          return;
        }
      }
      if (!cancelled) setAuthorized(false);
      router.replace("/admin/login");
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-850"></div>
        Loading admin...
      </div>
    );
  }
  if (!authorized) return null;
  return <>{children}</>;
}

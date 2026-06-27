"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, getStoredUser, isAdminUser, parseJwt } from "@/lib/kizfarm/auth";

type AuthGuardProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthorized(false);
      router.replace("/public/login");
      return;
    }

    const payload = parseJwt(token);
    const user = getStoredUser();
    if (isAdminUser(payload) || isAdminUser(user)) {
      setAuthorized(false);
      router.replace("/admin/dashboard");
      return;
    }

    setAuthorized(true);
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

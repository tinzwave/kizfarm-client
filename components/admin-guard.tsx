"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken, getStoredUser, isAdminUser, parseJwt } from "@/lib/kizfarm/auth";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAdminToken();
    const payload = parseJwt(token);
    const storedUser = getStoredUser();

    if (token && (isAdminUser(payload) || isAdminUser(storedUser))) {
      setAuthorized(true);
      return;
    }
    setAuthorized(false);
    router.replace("/admin/login");
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">
        Loading admin...
      </div>
    );
  }
  if (!authorized) return null;
  return <>{children}</>;
}

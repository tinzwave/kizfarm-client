"use client";

import React, { useEffect, useMemo, useState } from "react";
import FarmerSidebar from "@/components/farmer-sidebar";
import { usePathname, useRouter } from "next/navigation";
import { getSession } from "@/lib/kizfarm/supabase-auth";
import { getFarmerStatus } from "@/lib/kizfarm/supabase-data";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("kizfarm_farmer_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [checkingAccess, setCheckingAccess] = useState(true);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(
          "kizfarm_farmer_sidebar_collapsed",
          next ? "1" : "0",
        );
      } catch {}
      return next;
    });
  };

  const contentPaddingClass = useMemo(() => {
    return collapsed ? "md:pl-[80px]" : "md:pl-[280px]";
  }, [collapsed]);

  useEffect(() => {
    // Client-side guard:
    // - Not logged in -> /login
    // - No farmer registration -> /farmer/become
    // - Farmer not approved -> /farmer/verify
    // - Approved -> allow dashboard routes
    async function checkStatus() {
      setCheckingAccess(true);
      const session = await getSession();
      if (!session) {
        if (pathname !== "/login") router.replace("/login");
        setCheckingAccess(false);
        return;
      }

      const isBecome = pathname === "/farmer/become";
      const isVerify = pathname === "/farmer/verify";
      try {
        const { res, payload: json } = await getFarmerStatus();
        if (!res.ok) {
          if (pathname !== "/login") router.replace("/login");
          setCheckingAccess(false);
          return;
        }
        const farmer = json?.farmer;
        const status = farmer?.status;

        // If user hasn't registered as a farmer yet, keep them on /farmer/become.
        if (!farmer) {
          if (!isBecome) router.replace("/farmer/become");
          setCheckingAccess(false);
          return;
        }

        // If farmer exists but not yet approved, send them to verification flow.
        if (status !== "approved") {
          if (!isVerify) router.replace("/farmer/verify");
          setCheckingAccess(false);
          return;
        }

        // Approved farmer shouldn't be stuck in onboarding routes.
        if (isBecome || isVerify) router.replace("/farmer/dashboard");
        setCheckingAccess(false);
      } catch {
        setCheckingAccess(false);
      }
    }
    checkStatus();
  }, [router, pathname]);

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-zinc-500">
        Loading seller portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
      {pathname !== "/farmer/become" && pathname !== "/farmer/verify" ? (
        <FarmerSidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      ) : null}
      <div
        className={`${pathname !== "/farmer/become" && pathname !== "/farmer/verify" ? contentPaddingClass : ""} pt-16 md:pt-0`}
      >
        <main className="min-h-screen w-full">{children}</main>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/admin-guard";
import AdminShell from "@/components/admin-shell";
import AuthGuard from "@/components/auth-guard";
import BuyerBottomNav from "@/components/buyer-bottom-nav";
import BuyerSidebar from "@/components/buyer-sidebar";
import FarmerSidebar from "@/components/farmer-sidebar";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(false);
  // null while the real role is still loading, so we don't flash the wrong
  // sidebar (used to be guessed from a "?source=buyer"/"returnTo=/buyer/..."
  // URL param, which only held true when a link happened to carry it --
  // e.g. the dashboard's course cards linked to a bare "/learning" and
  // always fell through to the farmer sidebar, even for a buyer).
  const [role, setRole] = useState<string | null | undefined>(undefined);

  const isAdminLearning =
    pathname === "/learning/admin" ||
    pathname === "/learning/add-course" ||
    pathname === "/learning/add-tutor" ||
    pathname === "/learning/subscriptions";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("kizfarm_farmer_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAdminLearning) return;
    let cancelled = false;
    getCurrentProfile().then((profile) => {
      if (!cancelled) setRole(profile?.role ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdminLearning]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(
          "kizfarm_farmer_sidebar_collapsed",
          next ? "1" : "0",
        );
      } catch {}
      return next;
    });
  };

  const contentPaddingClass = useMemo(
    () => (collapsed ? "md:pl-[80px]" : "md:pl-[280px]"),
    [collapsed],
  );

  if (isAdminLearning) {
    return (
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    );
  }

  if (role === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (role === "farmer") {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background text-on-background font-body-md overflow-x-hidden">
          <FarmerSidebar
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
          <div className={`${contentPaddingClass} pt-16 md:pt-0`}>
            <main className="min-h-screen w-full">{children}</main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white pb-20 transition-[padding] duration-300 lg:pb-0 lg:pl-64">
        <BuyerSidebar />
        <div className="min-h-screen">{children}</div>
        <BuyerBottomNav />
      </div>
    </AuthGuard>
  );
}

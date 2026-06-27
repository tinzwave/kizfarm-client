"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getAuthToken, getStoredUser } from "@/lib/kizfarm/auth";

export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    const user = getStoredUser();
    setLoggedIn(!!token);
    setUserEmail(user?.email ?? null);
    const onAuth = () => {
      const t = getAuthToken();
      const u = getStoredUser();
      setLoggedIn(!!t);
      setUserEmail(u?.email ?? null);
    };
    window.addEventListener("storage", onAuth);
    window.addEventListener("kizfarm_auth_changed", onAuth as EventListener);
    return () => {
      window.removeEventListener("storage", onAuth);
      window.removeEventListener(
        "kizfarm_auth_changed",
        onAuth as EventListener,
      );
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    setLoggedIn(false);
    router.push("/public/home");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/public/home" className="flex items-center gap-2">
            <img
              src="/logo.jpeg"
              alt="KizFarm"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-lg text-emerald-900">KizFarm</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 ml-6">
            <Link
              href="/public/home"
              className="text-sm text-gray-700 hover:text-emerald-700"
            >
              Home
            </Link>
            <Link
              href="/public/about"
              className="text-sm text-gray-700 hover:text-emerald-700"
            >
              About
            </Link>
            <Link
              href="/public/contact"
              className="text-sm text-gray-700 hover:text-emerald-700"
            >
              Contact
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!loggedIn ? (
            <Link
              href="/public/login"
              className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-lg"
            >
              Login
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">{userEmail}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-gray-100 rounded"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

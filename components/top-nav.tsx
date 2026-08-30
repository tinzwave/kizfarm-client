"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/kizfarm/supabase-client";
import { signOut } from "@/lib/kizfarm/supabase-auth";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setUserEmail(session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    setLoggedIn(false);
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-gray-100 shadow-[0_1px_20px_rgba(0,0,0,0.04)]"
          : "bg-white/70 backdrop-blur-sm border-transparent"
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <img
              src="/logo-mark.png"
              alt="KizFarm"
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    active
                      ? "text-[#1B6D24]"
                      : "text-gray-600 hover:text-[#1B6D24] hover:bg-emerald-50/60"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full bg-[#1B6D24]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {!loggedIn ? (
            <Link
              href="/login"
              className="hidden sm:inline-flex px-5 py-2.5 text-sm font-bold bg-[#1B6D24] text-white rounded-lg hover:bg-[#154f1a] transition-all active:scale-95 shadow-sm shadow-emerald-900/10"
            >
              Login
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-gray-600 max-w-[160px] truncate">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md">
          <nav className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    active
                      ? "text-[#1B6D24] bg-emerald-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-3 mt-2 border-t border-gray-100">
              {!loggedIn ? (
                <Link
                  href="/login"
                  className="block text-center px-4 py-2.5 text-sm font-bold bg-[#1B6D24] text-white rounded-lg"
                >
                  Login
                </Link>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg"
                >
                  Logout
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

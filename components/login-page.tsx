"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, saveUserAuth, setPendingVerificationEmail } from "@/lib/kizfarm/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const router = useRouter();

  // redirect away if already authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getAuthToken();
    if (token) router.push('/public/home');
  }, [router]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403 && data.needsVerification && data.email) {
            setPendingVerificationEmail(data.email);
            router.push("/public/otp");
            return;
          }
          throw new Error(data.error || "Login failed");
        }
        if (data.token && data.user) saveUserAuth(data.token, data.user);
        
        const role = data.user?.role || "user";
        if (role === "farmer") {
          router.push("/farmer/dashboard");
        } else if (role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/buyer/dashboard");
        }
      } catch (err: any) {
        setError(err.message || "Login failed");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <main className="w-full flex min-h-screen">
      {/* Brand Visual Side (Hidden on Mobile) */}
      <section
        className="hidden lg:flex lg:w-1/2 relative farm-hero-gradient items-end p-xl"
        data-alt="expansive precision farming field with neat crop rows stretching toward a soft sunrise with a modern tractor in the far distance"
      >
        <style>{`
          .farm-hero-gradient {
            background: linear-gradient(rgba(0, 83, 18, 0.2), rgba(0, 83, 18, 0.4)), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80');
            background-size: cover;
            background-position: center;
          }
        `}</style>
        <div className="bg-white/10 backdrop-blur-md p-lg rounded-xl border border-white/20 max-w-md">
          <h2 className="font-headline-lg text-white mb-sm">
            Sustainable Growth starts with Digital Agronomy.
          </h2>
          <p className="font-body-md text-white/90">
            Monitor soil health, crop status, and environmental metrics in
            real-time with KIZ FARM.
          </p>
        </div>
      </section>

      {/* Login Form Side */}
      <section className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center px-margin lg:px-xl relative">
        {/* Logo Header */}
        <div className="mb-lg text-center flex flex-col items-center">
          <img
            alt="KIZ FARM Logo"
            className="h-24 w-auto mb-xs"
            src="/logo.jpeg"
          />
          <p className="font-body-md text-on-secondary-container mt-xs">
            Precision Farming Portal
          </p>
        </div>

        {/* Login Form Container */}
        <div className="w-full max-w-[400px]">
          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-xs">
              <label className="font-label-sm text-on-surface" htmlFor="email">
                Email Address
              </label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  mail
                </span>
                <input
                  className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all outline-none font-body-md"
                  id="email"
                  name="email"
                  placeholder="agronomist@kizfarm.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-xs">
              <div className="flex justify-between items-center">
                <label
                  className="font-label-sm text-on-surface"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  className="font-label-xs text-primary hover:underline transition-all"
                  href="#"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                  lock
                </span>
                <input
                  className="w-full h-12 pl-12 pr-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all outline-none font-body-md"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-base">
              <input
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer"
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label
                className="font-label-sm text-on-surface-variant cursor-pointer"
                htmlFor="remember"
              >
                Keep me logged in
              </label>
            </div>

            {/* Primary Action */}
            <button
              className="w-full h-12 bg-primary-container text-on-primary font-label-sm uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          </form>

          {/* Alternate Actions */}
          <div className="mt-lg pt-lg border-t border-outline-variant text-center">
            <p className="font-body-md text-on-secondary-container">
              New to the platform?{" "}
              <a
                className="text-primary font-semibold hover:underline"
                href="/public/signup"
              >
                Sign Up
              </a>
            </p>
          </div>
        </div>

        {/* Footer Compliance */}
        <div className="absolute bottom-base w-full text-center">
          <p className="font-label-xs text-outline-variant uppercase tracking-widest">
            © 2024 KIZ FARM. Digital Agronomy.
          </p>
        </div>
      </section>

      {/* Visual Decoration */}
      <div className="fixed top-0 right-0 p-lg opacity-10 pointer-events-none hidden lg:block">
        <span className="material-symbols-outlined text-[120px] text-primary">
          agriculture
        </span>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/kizfarm/supabase-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The reset-password link Supabase emails redirects here with a one-time
    // ?code= param -- exchange it for a real session before allowing the
    // password update below, same PKCE flow the rest of the app's auth uses.
    async function exchangeCode() {
      const supabase = createClient();
      try {
        if (window.location.href.includes("code=")) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError) throw exchangeError;
        }
      } catch {
        setError("This reset link is invalid or has expired. Please request a new one.");
      } finally {
        setReady(true);
      }
    }
    exchangeCode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Could not reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white font-body-md text-on-surface flex flex-col min-h-screen">
      <header className="fixed top-0 w-full z-50 bg-white border-b border-gray-100 flex justify-between items-center px-6 h-16 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-2">
          <img alt="KIZ FARM" className="h-10 w-auto object-contain" src="/logo.jpeg" />
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-8 py-xl mt-16">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-md">
            <span className="material-symbols-outlined text-primary text-[32px]">password</span>
          </div>

          <div className="text-center mb-lg">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Set a new password</h1>
            <p className="font-body-md text-body-md text-on-secondary-container">
              Choose a new password for your account.
            </p>
          </div>

          <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
            <div className="space-y-xs">
              <label className="font-label-sm text-on-surface" htmlFor="password">
                New Password
              </label>
              <input
                className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all outline-none font-body-md"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-xs">
              <label className="font-label-sm text-on-surface" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all outline-none font-body-md"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <button
              className="w-full h-12 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              type="submit"
              disabled={isLoading || !ready}
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

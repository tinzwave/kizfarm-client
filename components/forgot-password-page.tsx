"use client";

import { useState } from "react";
import { createClient } from "@/lib/kizfarm/supabase-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw new Error(resetError.message);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Could not send reset email");
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
            <span className="material-symbols-outlined text-primary text-[32px]">lock_reset</span>
          </div>

          <div className="text-center mb-lg">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">Reset your password</h1>
            <p className="font-body-md text-body-md text-on-secondary-container">
              Enter your account email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div className="w-full text-center space-y-md">
              <p className="font-body-md text-body-md text-on-surface">
                If an account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.
              </p>
              <a href="/login" className="text-primary font-bold hover:underline font-label-sm">
                Back to login
              </a>
            </div>
          ) : (
            <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
              <div className="space-y-xs">
                <label className="font-label-sm text-on-surface" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full h-12 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary transition-all outline-none font-body-md"
                  id="email"
                  name="email"
                  placeholder="agronomist@kizfarm.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                className="w-full h-12 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </button>

              <div className="text-center">
                <a href="/login" className="font-label-sm text-primary font-bold hover:underline">
                  Back to login
                </a>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

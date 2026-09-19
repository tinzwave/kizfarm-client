"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/kizfarm/supabase-client";
import { getPendingVerificationEmail, clearPendingVerificationEmail } from "@/lib/kizfarm/supabase-auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  // Starts null on both server and first client render, then resolves after
  // mount -- reading localStorage during render would mismatch the SSR
  // output and trigger a hydration error. Same pattern as otp-page.tsx.
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => {
      setEmail(getPendingVerificationEmail() || search?.get("email") || null);
    });
  }, [search]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const handleOtpChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);
    if (numericValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    if (!email) {
      setError("Missing email address. Please request a new code.");
      return;
    }
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
      // Redeems the emailed code and establishes a recovery session --
      // the same mechanism the "Reset Password" email template now emails
      // as a {{ .Token }} code instead of a magic link.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });
      if (verifyError) throw new Error(verifyError.message || "That code is invalid or has expired.");

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      await supabase.auth.signOut();
      clearPendingVerificationEmail();
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Could not reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setError("Missing email address. Please start over.");
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email);
      if (resendError) throw new Error(resendError.message);
      setResendCooldown(30);
      cooldownRef.current = window.setInterval(() => {
        setResendCooldown((s) => {
          if (s <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
              cooldownRef.current = null;
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000) as unknown as number;
    } catch (err) {
      console.error(err);
      setError("Failed to resend code");
    } finally {
      setIsResending(false);
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
              {email
                ? `Enter the 6-digit code sent to ${email}, then choose a new password.`
                : "Enter the 6-digit code sent to your email, then choose a new password."}
            </p>
          </div>

          <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-sm w-full">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  autoFocus={index === 0}
                  className="otp-input w-full aspect-square text-center font-headline-md border border-outline-variant rounded-lg bg-white transition-all text-primary focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(0,83,18,0.1)]"
                  maxLength={1}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading}
                />
              ))}
            </div>

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
              className="w-full h-12 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">autorenew</span>
                  Updating...
                </>
              ) : (
                "Reset Password"
              )}
            </button>

            <div className="text-center">
              <p className="font-label-sm text-on-secondary-container">
                Didn&apos;t receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="text-primary font-bold hover:underline disabled:opacity-60"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : isResending ? "Resending..." : "Resend Code"}
                </button>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

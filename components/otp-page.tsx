"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearPendingVerificationEmail, getAuthToken, getPendingVerificationEmail } from "@/lib/kizfarm/auth";

export default function OtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const search = useSearchParams();
  const pendingEmail =
    typeof window !== "undefined"
      ? getPendingVerificationEmail() || search?.get("email")
      : null;
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
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

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);
    const otpCode = otp.join("");
    if (!pendingEmail) return setError("No pending email to verify");
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP verification failed");
      // on success, clear pending and go to login
      clearPendingVerificationEmail();
      router.push("/public/login");
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // redirect away if already authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getAuthToken();
    if (token) router.push('/public/home');
  }, [router]);

  const handleResend = async () => {
    if (!pendingEmail) return setError("No pending email to resend to");
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await fetch(`${API}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      if (!res.ok) throw new Error("Resend failed");
      // start cooldown
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
          <span
            className="material-symbols-outlined text-primary"
            data-icon="agriculture"
          >
            agriculture
          </span>
          <span className="text-xl font-black text-green-900 tracking-tighter">
            KIZ FARM
          </span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-8 py-xl mt-16">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="mb-lg">
            <img
              alt="KIZ FARM"
              className="h-12 w-auto object-contain"
              src="/logo.jpeg"
            />
          </div>

          <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-md">
            <span
              className="material-symbols-outlined text-primary text-[32px]"
              data-icon="domain_verification"
            >
              domain_verification
            </span>
          </div>

          <div className="text-center mb-lg">
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">
              Verify your account
            </h1>
            <p className="font-body-md text-body-md text-on-secondary-container">
              Enter the 6-digit code sent to your phone
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
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  disabled={isVerifying}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                />
              ))}
            </div>

            <button
              className="w-full h-12 bg-primary text-on-primary font-label-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              type="submit"
              disabled={isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verify & Continue"}
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

          <div className="mt-xl opacity-20">
            <div className="flex gap-4">
              <span
                className="material-symbols-outlined text-[48px]"
                data-icon="potted_plant"
              >
                potted_plant
              </span>
              <span
                className="material-symbols-outlined text-[48px]"
                data-icon="grass"
              >
                grass
              </span>
              <span
                className="material-symbols-outlined text-[48px]"
                data-icon="nature"
              >
                nature
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full rounded-none border-t border-gray-100 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 px-8 w-full max-w-[1440px] mx-auto gap-8">
          <div className="flex flex-col gap-2">
            <div className="font-bold text-green-900">KIZ FARM</div>
            <p className="font-['Inter'] text-xs font-normal uppercase tracking-widest text-gray-400">
              © 2024 KIZ FARM. Digital Agronomy.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="font-['Inter'] text-xs font-normal uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors cursor-pointer opacity-80 hover:opacity-100"
              href="#"
            >
              Precision Farming
            </a>
            <a
              className="font-['Inter'] text-xs font-normal uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors cursor-pointer opacity-80 hover:opacity-100"
              href="#"
            >
              Soil Analysis
            </a>
            <a
              className="font-['Inter'] text-xs font-normal uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors cursor-pointer opacity-80 hover:opacity-100"
              href="#"
            >
              Sustainability
            </a>
            <a
              className="font-['Inter'] text-xs font-normal uppercase tracking-widest text-gray-400 hover:text-green-800 transition-colors cursor-pointer opacity-80 hover:opacity-100"
              href="#"
            >
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

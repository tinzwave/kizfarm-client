"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getCourseAccess, getCourseById } from "@/lib/kizfarm/supabase-data";
import { COURSE_ACCESS_DAYS, courseAccessState, formatCourseDate } from "@/lib/kizfarm/course-access";
import { initiateCoursePayment, confirmCoursePurchase } from "@/lib/kizfarm/supabase-mutations";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  finalPrice?: number;
}

export default function LearningCheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const courseId = params.get("courseId");
  const source = params.get("source") === "buyer" ? "buyer" : "admin";
  const returnTo = params.get("returnTo") || "/learning";
  const [course, setCourse] = useState<Course | null>(null);
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  // Set once we've kicked off (or are auto-finalizing) a payment, so the
  // "Pay" button doesn't flash back in while we're confirming.
  const [finalizing, setFinalizing] = useState(false);
  // Flutterwave took the money but hasn't settled it yet (bank transfer,
  // USSD). The webhook will unlock the course -- never offer to pay again.
  const [pendingRef, setPendingRef] = useState("");
  // Set when the buyer already holds a subscription (active or expired):
  // this checkout is then a renewal.
  const [currentExpiry, setCurrentExpiry] = useState<string | null>(null);
  // When access would run until after this renewal: 30 days on top of the
  // current expiry, or from now if it has already passed.
  const [renewedUntil, setRenewedUntil] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourseAndProfile() {
      if (!courseId) return;
      try {
        const [courseRes, profile, accessRes] = await Promise.all([
          getCourseById(courseId, { source }),
          getCurrentProfile(),
          getCourseAccess(courseId, { source }),
        ]);

        if (courseRes.payload?.ok) {
          setCourse(courseRes.payload.course);
        }
        if (accessRes.res.ok && accessRes.payload.subscription) {
          const expiresAt = accessRes.payload.subscription.expiresAt;
          setCurrentExpiry(expiresAt);
          const start = Math.max(Date.now(), new Date(expiresAt).getTime());
          setRenewedUntil(new Date(start + COURSE_ACCESS_DAYS * 86_400_000).toISOString());
        }
        if (profile?.email) {
          setEmail(profile.email);
        }
      } catch (err) {
        console.error("Error loading course details:", err);
      }
    }
    loadCourseAndProfile();
  }, [courseId, source]);

  // Flutterwave's checkout is a hosted page (redirect), not an inline
  // widget -- create-flutterwave-course-payment embeds a `ref` query param
  // into the returnUrl we give it, so when the buyer lands back here after
  // paying, that param is how we recognize the return and finalize
  // automatically.
  useEffect(() => {
    if (!courseId) return;
    const ref = params.get("ref");
    if (!ref) return;
    // Flutterwave appends ?status=successful|cancelled to the return URL.
    const status = params.get("status");
    if (status === "cancelled") {
      void Promise.resolve().then(() => setError("Payment was cancelled and you were not charged. You can try again whenever you're ready."));
      return;
    }
    if (status === "failed") {
      void Promise.resolve().then(() => setError("The payment failed and the course was not unlocked. Please try again or use another payment method."));
      return;
    }

    // Deferred a tick so the state updates below don't run synchronously
    // within the effect body itself.
    void Promise.resolve().then(() => {
      setFinalizing(true);
      setError("");
    });
    confirmCoursePurchase(courseId, ref)
      .then(({ res, payload }) => {
        if ((payload as { pending?: boolean }).pending) {
          setPendingRef(ref);
          setFinalizing(false);
          return;
        }
        if (!res.ok) {
          setError(`${payload?.error || "Payment could not be confirmed."} If you were charged, contact support@kizfarm.com with reference ${ref}.`);
          setFinalizing(false);
          return;
        }
        const expiresAt = (payload as { subscription?: { expires_at?: string } }).subscription?.expires_at;
        toast.success("Payment successful", {
          description: expiresAt
            ? `Your course is unlocked until ${formatCourseDate(expiresAt)}. We've emailed you a receipt.`
            : "Your course is unlocked. Enjoy learning!",
          duration: 6000,
        });
        router.push(`/learning/course?courseId=${courseId}&access=1&source=${source}&returnTo=${encodeURIComponent(returnTo)}`);
      })
      .catch((err) => {
        console.error("Subscription activation error after Flutterwave return:", err);
        setError(`We couldn't confirm your payment because of a connection problem. Don't pay again: refresh this page to check again, or contact support@kizfarm.com with reference ${ref}.`);
        setFinalizing(false);
      });
    // Only ever run once per landing on the page with a ref in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, params]);

  const access = currentExpiry ? courseAccessState(currentExpiry) : null;
  const isRenewal = !!access;
  // Access still has more than the renewal window to run: paying now would
  // be rejected by create-flutterwave-course-payment anyway.
  const alreadyActive = !!access && !access.canRenew;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !course) return;

    setError("");
    if (!email) {
      setError("Could not verify your account email. Please log in again.");
      return;
    }

    setPaying(true);
    try {
      const returnUrl = `${window.location.origin}/learning/checkout?courseId=${courseId}&source=${source}&returnTo=${encodeURIComponent(returnTo)}`;
      const { res, payload } = await initiateCoursePayment(courseId, returnUrl);
      if (!res.ok || !payload.checkoutUrl) {
        setError(payload?.error || "Could not start payment. Please try again.");
        setPaying(false);
        return;
      }
      window.location.href = payload.checkoutUrl;
    } catch (err) {
      console.error("Flutterwave initialization error:", err);
      setError("Failed to initialize payment gateway. Please try again.");
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7faf7] text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href={courseId ? `/learning/course?courseId=${courseId}&source=${source}&returnTo=${encodeURIComponent(returnTo)}` : returnTo} className="text-sm font-semibold text-green-800 hover:underline">Back</Link>
          <span className="text-sm font-bold text-slate-500">Secure Checkout</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1fr_360px]">
        <form onSubmit={pay} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold">{isRenewal ? "Renew Subscription" : "Payment Details"}</h1>
            <p className="text-sm text-slate-500 mt-1">Review the details and complete your subscription securely via Flutterwave.</p>
          </div>

          {alreadyActive && !finalizing && !pendingRef && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <p className="font-bold">You already have access to this course until {formatCourseDate(currentExpiry)}.</p>
              <p className="mt-1">Renewal opens in the last 3 days of your access, so you never pay for days you already have.</p>
              <Link href={`/learning/course?courseId=${courseId}&access=1&source=${source}&returnTo=${encodeURIComponent(returnTo)}`} className="mt-2 inline-block font-bold text-green-800 hover:underline">
                Go to the course
              </Link>
            </div>
          )}
          {isRenewal && !alreadyActive && !finalizing && !pendingRef && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {access!.expired
                ? `Your access ended on ${formatCourseDate(currentExpiry)}. Renewing unlocks the course again until ${formatCourseDate(renewedUntil)}.`
                : `Your access runs until ${formatCourseDate(currentExpiry)}. Renewing now adds ${COURSE_ACCESS_DAYS} days, so it will run until ${formatCourseDate(renewedUntil)}.`}
            </div>
          )}

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {pendingRef ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <span className="material-symbols-outlined text-base">schedule</span> Payment received, waiting for confirmation
              </p>
              <p className="text-xs leading-relaxed text-amber-900">
                Your bank is still confirming the payment. <strong>Please don&apos;t pay again.</strong> The course unlocks automatically as soon as Flutterwave confirms it, and you&apos;ll get a notification. This usually takes a few minutes.
              </p>
              <p className="text-xs text-amber-800">Reference: {pendingRef}</p>
              <Link href={`/learning/course?courseId=${courseId}&source=${source}&returnTo=${encodeURIComponent(returnTo)}`} className="inline-block text-sm font-bold text-green-800 hover:underline">
                Go to the course page
              </Link>
            </div>
          ) : finalizing ? (
            <div className="rounded-lg bg-green-50/50 border border-green-100 p-5 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700" />
              <p className="text-sm font-semibold text-green-900">Confirming your payment...</p>
            </div>
          ) : (
            <div className="rounded-lg bg-green-50/50 border border-green-100 p-5 space-y-3">
              <p className="font-semibold text-green-900 flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-base">shield</span> Secured via Flutterwave
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kizfarm uses Flutterwave to process payments securely. You will be able to pay with your bank card, direct bank transfer, USSD, or mobile money on Flutterwave&apos;s secure checkout page.
              </p>
            </div>
          )}

          {!pendingRef && <button disabled={paying || finalizing || alreadyActive || !courseId || !course} className="w-full rounded-lg bg-green-800 px-5 py-3 font-bold text-white hover:bg-green-900 disabled:opacity-60 transition-colors">
            {finalizing ? "Confirming..." : paying ? "Redirecting to Flutterwave..." : `${isRenewal ? "Renew for" : "Pay"} NGN ${(course?.finalPrice ?? course?.price ?? 0).toLocaleString()}`}
          </button>}
        </form>

        <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
          <p className="text-sm font-semibold text-slate-500">Course Subscribing To</p>
          <h2 className="mt-2 text-xl font-bold">{course?.title ?? "Loading..."}</h2>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course?.description}</p>
          <div className="mt-6 border-t pt-4">
            <div className="mb-3 flex justify-between text-sm text-slate-600">
              <span>Access period</span>
              <span>{COURSE_ACCESS_DAYS} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>NGN {(course?.finalPrice ?? course?.price ?? 0).toLocaleString()}</span>
            </div>
            <div className="mt-3 flex justify-between text-lg font-bold text-green-800">
              <span>Total</span>
              <span>NGN {(course?.finalPrice ?? course?.price ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

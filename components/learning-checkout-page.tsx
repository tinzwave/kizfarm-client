"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getCourseById } from "@/lib/kizfarm/supabase-data";
import { purchaseCourse } from "@/lib/kizfarm/supabase-mutations";
import { getCurrentProfile } from "@/lib/kizfarm/supabase-auth";

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
  const [userId, setUserId] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCourseAndProfile() {
      if (!courseId) return;
      try {
        const [courseRes, profile] = await Promise.all([
          getCourseById(courseId, { source }),
          getCurrentProfile(),
        ]);

        if (courseRes.payload?.ok) {
          setCourse(courseRes.payload.course);
        }
        if (profile?.email) {
          setEmail(profile.email);
        }
        if (profile?.id) {
          setUserId(profile.id);
        }
      } catch (err) {
        console.error("Error loading course details:", err);
      }
    }
    loadCourseAndProfile();
  }, [courseId, source]);

  const loadPaystackScript = () => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !course) return;
    const payablePrice = course.finalPrice ?? course.price;

    setError("");
    const scriptLoaded = await loadPaystackScript();
    if (!scriptLoaded) {
      setError("Failed to load payment gateway. Please check your internet connection.");
      return;
    }

    setPaying(true);

    try {
      const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (!paystackPublicKey) {
        setError("Payment gateway is not configured. Please contact support.");
        setPaying(false);
        return;
      }
      if (!email) {
        setError("Could not verify your account email. Please log in again.");
        setPaying(false);
        return;
      }

      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email,
        amount: Math.round(payablePrice * 100), // in kobo
        currency: "NGN",
        metadata: {
          brand: "KIZ FARM",
          course_id: courseId,
          user_id: userId,
          custom_fields: [
            {
              display_name: "Merchant",
              variable_name: "merchant",
              value: "KIZ FARM",
            },
          ],
        },
        callback: function (response: any) {
          const paymentRef = response.reference;

          purchaseCourse(courseId, paymentRef).then(({ res, payload }) => {
            if (!res.ok) {
              setError(payload?.error || "Payment succeeded, but subscription failed. Reference: " + paymentRef);
              setPaying(false);
              return;
            }

            router.push(`/learning/course?courseId=${courseId}&access=1&source=${source}&returnTo=${encodeURIComponent(returnTo)}`);
          }).catch(err => {
            console.error("Subscription activation error after Paystack success:", err);
            setError("Payment succeeded, but connection failed. Reference: " + paymentRef);
            setPaying(false);
          });
        },
        onClose: function () {
          setPaying(false);
          setError("Payment was cancelled.");
        }
      });

      handler.openIframe();
    } catch (err) {
      console.error("Paystack initialization error:", err);
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
            <h1 className="text-2xl font-bold">Payment Details</h1>
            <p className="text-sm text-slate-500 mt-1">Review the details and complete your subscription securely via Paystack.</p>
          </div>
          
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-lg bg-green-50/50 border border-green-100 p-5 space-y-3">
            <p className="font-semibold text-green-900 flex items-center gap-1.5 text-sm">
              <span className="material-symbols-outlined text-base">shield</span> Secured via Paystack
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kizfarm uses Paystack to process payments securely. You will be able to pay with your bank card, direct bank transfer, USSD, or mobile money inside the secure checkout popup.
            </p>
          </div>

          <button disabled={paying || !courseId} className="w-full rounded-lg bg-green-800 px-5 py-3 font-bold text-white hover:bg-green-900 disabled:opacity-60 transition-colors">
            {paying ? "Processing Payment..." : `Pay NGN ${(course?.finalPrice ?? course?.price ?? 0).toLocaleString()}`}
          </button>
        </form>

        <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
          <p className="text-sm font-semibold text-slate-500">Course Subscribing To</p>
          <h2 className="mt-2 text-xl font-bold">{course?.title ?? "Loading..."}</h2>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course?.description}</p>
          <div className="mt-6 border-t pt-4">
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

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getMyReferrals } from "@/lib/kizfarm/supabase-data";

interface ReferralsData {
  referralCode: string | null;
  rewardAmount: number;
  minReferralsForPayout: number;
  referralCount: number;
  eligibleForPayout: boolean;
  referrals: { id: string; referredName: string; hasPurchased: boolean; createdAt: string }[];
  rewards: { id: string; type: string; amount: number; status: string; createdAt: string }[];
  pendingAmount: number;
  releasedAmount: number;
}

const money = (value = 0) => `₦${Number(value).toLocaleString()}`;

export default function ReferralsPage({ backHref }: { backHref: string }) {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getMyReferrals();
        if (!res.ok) {
          setError(payload?.error || "Could not load your referrals.");
          return;
        }
        setData(payload as unknown as ReferralsData);
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const referralLink =
    data?.referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${data.referralCode}`
      : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — nothing to fall back to silently
    }
  };

  return (
    <div className="bg-white text-on-surface font-body-md">
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-gray-600 hover:text-gray-900">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="text-xl font-extrabold tracking-tight text-[#1B6D24]">Refer &amp; Earn</span>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 pb-24 md:pb-12">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <p>Loading your referrals...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Referral link */}
            <div className="mb-8 rounded-2xl border border-outline-variant bg-gradient-to-br from-emerald-50 to-emerald-100 p-8">
              <p className="text-sm text-emerald-600 font-semibold uppercase tracking-wide">Your Referral Link</p>
              <p className="text-sm text-emerald-700 mt-2">
                Earn {money(data?.rewardAmount || 0)} when someone you refer signs up, and another{" "}
                {money(data?.rewardAmount || 0)} on their first product purchase.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  readOnly
                  value={referralLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 h-12 px-4 rounded-lg border border-emerald-200 bg-white text-sm text-gray-700"
                />
                <button
                  onClick={handleCopy}
                  className="h-12 px-6 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-xs text-emerald-700 mt-3">Your code: {data?.referralCode || "-"}</p>
            </div>

            {/* Payout eligibility banner */}
            <div
              className={`mb-8 rounded-xl border p-5 ${
                data?.eligibleForPayout
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className={`text-sm font-semibold ${data?.eligibleForPayout ? "text-emerald-800" : "text-amber-800"}`}>
                {data?.referralCount || 0} of {data?.minReferralsForPayout || 0} referrals needed for payout
              </p>
              <p className={`text-xs mt-1 ${data?.eligibleForPayout ? "text-emerald-700" : "text-amber-700"}`}>
                {data?.eligibleForPayout
                  ? "You&apos;re eligible — earnings are paid out weekly by the team."
                  : `Refer ${Math.max((data?.minReferralsForPayout || 0) - (data?.referralCount || 0), 0)} more people to unlock weekly payouts.`}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl border border-outline-variant bg-white p-4">
                <p className="text-sm text-gray-600">People Referred</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data?.referralCount || 0}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-white p-4">
                <p className="text-sm text-gray-600">Pending Earnings</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">{money(data?.pendingAmount || 0)}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-white p-4">
                <p className="text-sm text-gray-600">Paid Out</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{money(data?.releasedAmount || 0)}</p>
              </div>
            </div>

            {/* Referred people */}
            <section className="mb-8">
              <div className="mb-4">
                <h2 className="font-headline-lg text-on-surface">People You&apos;ve Referred</h2>
              </div>
              {(data?.referrals ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-2xl text-gray-400">group_add</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">No referrals yet</h3>
                  <p className="text-sm text-gray-600">Share your link above to start earning.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.referrals ?? []).map((r) => (
                    <div key={r.id} className="rounded-xl border border-outline-variant bg-white p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{r.referredName}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          r.hasPurchased ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.hasPurchased ? "Purchased" : "Signed up"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reward history */}
            <section>
              <div className="mb-4">
                <h2 className="font-headline-lg text-on-surface">Reward History</h2>
              </div>
              {(data?.rewards ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-600">
                  No rewards yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.rewards ?? []).map((r) => (
                    <div key={r.id} className="rounded-xl border border-outline-variant bg-white p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {r.type === "signup" ? "Signup bonus" : "First purchase bonus"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{money(r.amount)}</p>
                        <span
                          className={`text-xs font-medium ${r.status === "released" ? "text-emerald-600" : "text-amber-600"}`}
                        >
                          {r.status === "released" ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="mt-8">
          <Link href={backHref} className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

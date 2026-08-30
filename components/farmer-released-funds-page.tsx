"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getFarmerPayoutHistory } from "@/lib/kizfarm/supabase-data";

interface ReleasedFund {
  orderId: string;
  escrowId: string;
  amount: number;
  releasedAt: string;
  releasedBy?: { name: string; email: string };
  notes?: string;
}

interface FarmerPayoutData {
  accountBalance: number;
  releasedFundsLedger: ReleasedFund[];
  totalReleased: number;
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

export default function FarmerPayoutHistoryPage() {
  const [data, setData] = useState<FarmerPayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPayouts() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getFarmerPayoutHistory();
        if (!res.ok) {
          setError(payload?.error || "Could not load payout history.");
          return;
        }
        setData({
          accountBalance: payload.accountBalance ?? 0,
          releasedFundsLedger: (payload.releasedFundsLedger ?? []) as ReleasedFund[],
          totalReleased: payload.totalReleased ?? 0,
        });
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadPayouts();
  }, []);

  return (
    <div className="bg-white text-on-surface font-body-md">
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <Link
            href="/farmer/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="text-xl font-extrabold tracking-tight text-[#1B6D24]">
            Released Funds
          </span>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8 pb-24 md:pb-12">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Account Balance Section */}
        <div className="mb-8 rounded-2xl border border-outline-variant bg-gradient-to-br from-emerald-50 to-emerald-100 p-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-emerald-600 font-semibold uppercase tracking-wide">
                Account Balance
              </p>
              <p className="text-4xl font-bold text-emerald-900 mt-2">
                {loading ? "-" : money(data?.accountBalance || 0)}
              </p>
              <p className="text-sm text-emerald-700 mt-3">
                Total earnings from released escrow payments
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-200 rounded-xl flex items-center justify-center text-2xl text-emerald-600">
              <span className="material-symbols-outlined">savings</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <p className="text-sm text-gray-600">Total Released</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {money(data?.totalReleased || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                {(data?.releasedFundsLedger || []).length}
              </p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-4">
              <p className="text-sm text-gray-600">Average Payment</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {(data?.releasedFundsLedger || []).length > 0
                  ? money(
                      (data?.totalReleased || 0) /
                        (data?.releasedFundsLedger || []).length,
                    )
                  : money(0)}
              </p>
            </div>
          </div>
        )}

        {/* Released Funds History */}
        <section>
          <div className="mb-6">
            <h2 className="font-headline-lg text-on-surface">Payout History</h2>
            <p className="text-on-surface-variant font-body-md">
              Track all funds released from escrow to your account
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p>Loading payout history...</p>
              </div>
            </div>
          ) : (data?.releasedFundsLedger ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-gray-400">
                  account_balance
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No payouts yet</h3>
              <p className="text-sm text-gray-600">
                When orders are completed and funds are released, they will
                appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.releasedFundsLedger ?? []).map((payout, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-outline-variant bg-white p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                          <span className="material-symbols-outlined text-lg">
                            check_circle
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Order{" "}
                            {payout.orderId?.slice(-8).toUpperCase() || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payout.releasedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      {payout.releasedBy && (
                        <p className="text-xs text-gray-600 ml-13">
                          Released by: {payout.releasedBy.name}
                        </p>
                      )}
                      {payout.notes && (
                        <p className="text-xs text-gray-600 ml-13 mt-1">
                          Notes: {payout.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-lg">
                        {money(payout.amount)}
                      </p>
                      <p className="text-xs text-gray-500">Released</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Summary */}
        {!loading && (data?.releasedFundsLedger ?? []).length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-emerald-600 font-semibold">
                    Total Released
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    {money(data?.totalReleased || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-600 font-semibold">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    {(data?.releasedFundsLedger || []).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-emerald-600 font-semibold">
                    Current Balance
                  </p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    {money(data?.accountBalance || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Setup CTA */}
        {!loading && (
          <div className="mt-8 p-6 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-blue-900 mb-1">
                  Set up your bank details
                </h3>
                <p className="text-sm text-blue-700">
                  Ensure your bank account is verified to receive payouts
                  directly
                </p>
              </div>
              <Link
                href="/farmer/bank-setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap font-semibold text-sm"
              >
                Setup Bank{" "}
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link
            href="/farmer/dashboard"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

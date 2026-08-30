"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getBuyerRefunds } from "@/lib/kizfarm/supabase-data";

interface RefundEntry {
  orderId: string;
  escrowId?: string;
  amount: number;
  reason?: string;
  refundedAt: string;
}

interface BuyerRefundData {
  accountBalance: number;
  refundLedger: RefundEntry[];
  totalRefunded: number;
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

export default function BuyerRefundsPage() {
  const [data, setData] = useState<BuyerRefundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRefunds() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getBuyerRefunds();
        if (!res.ok) {
          setError(payload?.error || "Could not load refunds.");
          return;
        }
        setData(payload as BuyerRefundData);
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadRefunds();
  }, []);

  return (
    <div className="bg-white text-on-surface font-body-md">
      <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center px-6 h-16 w-full max-w-[1440px] mx-auto z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <Link
            href="/buyer/dashboard"
            className="text-gray-600 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="text-xl font-extrabold tracking-tight text-[#1B6D24]">
            Refunds
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
        <div className="mb-8 rounded-2xl border border-outline-variant bg-gradient-to-br from-blue-50 to-blue-100 p-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-blue-600 font-semibold uppercase tracking-wide">
                Available Balance
              </p>
              <p className="text-4xl font-bold text-blue-900 mt-2">
                {loading ? "-" : money(data?.accountBalance || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-3">
                Refunded amount available in your account balance
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center text-2xl text-blue-600">
              <span className="material-symbols-outlined">
                account_balance_wallet
              </span>
            </div>
          </div>
        </div>

        {/* Refund History */}
        <section>
          <div className="mb-6">
            <h2 className="font-headline-lg text-on-surface">Refund History</h2>
            <p className="text-on-surface-variant font-body-md">
              View all refunds issued to your account
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p>Loading refunds...</p>
              </div>
            </div>
          ) : (data?.refundLedger ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-gray-400">
                  receipt
                </span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No refunds yet</h3>
              <p className="text-sm text-gray-600">
                When orders are cancelled or refunded, they will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.refundLedger ?? []).map((refund, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-outline-variant bg-white p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                          <span className="material-symbols-outlined text-lg">
                            check_circle
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Order{" "}
                            {refund.orderId?.slice(-8).toUpperCase() || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(refund.refundedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      {refund.reason && (
                        <p className="text-sm text-gray-600 ml-13">
                          Reason: {refund.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-lg">
                        {money(refund.amount)}
                      </p>
                      <p className="text-xs text-gray-500">Refunded</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Total Refunded */}
        {!loading && (data?.refundLedger ?? []).length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="font-headline-md text-gray-900">Total Refunded:</p>
              <p className="text-2xl font-bold text-green-600">
                {money(
                  (data?.refundLedger ?? []).reduce(
                    (sum, r) => sum + r.amount,
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8">
          <Link
            href="/buyer/dashboard"
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

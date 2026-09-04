"use client";

import React, { useEffect, useState } from "react";
import { getAdminReferrals } from "@/lib/kizfarm/supabase-data";
import { updateReferralSettings, releaseReferralRewards } from "@/lib/kizfarm/supabase-mutations";

interface Referrer {
  referrerId: string;
  name: string;
  email: string | null;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  referralCount: number;
  purchaseCount: number;
  pendingAmount: number;
  releasedAmount: number;
  eligibleForPayout: boolean;
}

const money = (value = 0) => `₦${Number(value).toLocaleString()}`;

export default function AdminReferralsPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [minReferrals, setMinReferrals] = useState(0);
  const [rewardAmountInput, setRewardAmountInput] = useState("0");
  const [minReferralsInput, setMinReferralsInput] = useState("0");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { res, payload } = await getAdminReferrals();
      if (!res.ok) {
        setError(payload?.error || "Could not load referrals.");
        return;
      }
      setReferrers((payload.referrers as Referrer[]) || []);
      setRewardAmount(payload.rewardAmount || 0);
      setMinReferrals(payload.minReferralsForPayout || 0);
      setRewardAmountInput(String(payload.rewardAmount || 0));
      setMinReferralsInput(String(payload.minReferralsForPayout || 0));
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError("");
    setMessage("");
    try {
      const { res, payload } = await updateReferralSettings(Number(rewardAmountInput), Number(minReferralsInput));
      if (!res.ok) {
        setError(payload?.error || "Could not update referral settings.");
        return;
      }
      setMessage("Referral settings updated.");
      await load();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRelease = async (referrerId: string) => {
    setReleasingId(referrerId);
    setError("");
    setMessage("");
    try {
      const { res, payload } = await releaseReferralRewards(referrerId);
      if (!res.ok) {
        setError(payload?.error || "Could not release rewards.");
        return;
      }
      setMessage(`Released ${money(payload.totalReleased || 0)}.`);
      await load();
    } finally {
      setReleasingId(null);
    }
  };

  const totalPending = referrers.reduce((s, r) => s + r.pendingAmount, 0);
  const totalReleased = referrers.reduce((s, r) => s + r.releasedAmount, 0);

  return (
    <div style={{ backgroundColor: "#f9f9ff", fontFamily: "'Inter', sans-serif" }}>
      <main className="min-h-screen p-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Program</h1>
            <p className="text-gray-600">Review referral activity and release weekly payouts</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {/* Settings */}
          <form
            onSubmit={handleSaveSettings}
            className="bg-white p-6 rounded-lg border border-gray-200 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-end"
          >
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Reward amount (per event)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={rewardAmountInput}
                onChange={(e) => setRewardAmountInput(e.target.value)}
                className="w-48 h-11 px-3 rounded-lg border border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1">Paid once on signup and once on first purchase (double if both).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Minimum referrals to unlock payout</label>
              <input
                type="number"
                min={0}
                step="1"
                value={minReferralsInput}
                onChange={(e) => setMinReferralsInput(e.target.value)}
                className="w-48 h-11 px-3 rounded-lg border border-gray-300"
              />
            </div>
            <button
              type="submit"
              disabled={savingSettings}
              className="h-11 px-6 rounded-lg bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </form>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Current Rate</p>
              <p className="text-3xl font-bold text-gray-900">{money(rewardAmount)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Referrers</p>
              <p className="text-3xl font-bold text-blue-600">{referrers.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Pending Payouts</p>
              <p className="text-3xl font-bold text-amber-600">{money(totalPending)}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Paid Out</p>
              <p className="text-3xl font-bold text-emerald-600">{money(totalReleased)}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Referrers</h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : referrers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No referral activity yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referrer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Referrals</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Purchases</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bank Details</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {referrers.map((r) => (
                      <tr key={r.referrerId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              r.eligibleForPayout ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {r.referralCount} / {minReferrals}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{r.purchaseCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {r.bankName ? (
                            <>
                              <p>{r.bankName}</p>
                              <p className="text-xs text-gray-500">
                                {r.accountHolderName} · {r.accountNumber}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Not provided</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-amber-600">{money(r.pendingAmount)}</td>
                        <td className="px-6 py-4 text-sm text-emerald-600">{money(r.releasedAmount)}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleRelease(r.referrerId)}
                            disabled={!r.eligibleForPayout || r.pendingAmount <= 0 || releasingId === r.referrerId}
                            className="text-green-700 hover:text-green-900 font-medium text-sm disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            {releasingId === r.referrerId ? "Releasing..." : "Release Payout"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

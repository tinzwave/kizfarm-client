"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAdminBuyerById, getAdminBuyerSuspensionEligibility } from "@/lib/kizfarm/supabase-data";
import { suspendAdminBuyer, unsuspendAdminBuyer, deactivateAdminBuyer } from "@/lib/kizfarm/supabase-mutations";

interface Buyer {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "suspended" | "deactivated";
  createdAt: string;
  suspensionReason: string | null;
  suspendedAt: string | null;
}

interface Order {
  _id: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
  farmName: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  suspended: "bg-red-100 text-red-800",
  deactivated: "bg-gray-100 text-gray-800",
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspensionError, setSuspensionError] = useState("");
  const [canSuspend, setCanSuspend] = useState(true);
  const [actionError, setActionError] = useState("");

  const fetchBuyer = async () => {
    setLoading(true);
    setError("");
    try {
      const { res, payload } = await getAdminBuyerById(userId);
      if (res.ok) {
        setBuyer(payload.buyer ?? null);
        setOrders(payload.orders || []);
      } else {
        setError(payload?.error || "Failed to load buyer");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) void Promise.resolve().then(() => fetchBuyer());
  }, [userId]);

  const openSuspendModal = async () => {
    setSuspensionReason("");
    setSuspensionError("");
    setShowSuspendModal(true);
    try {
      const { res, payload } = await getAdminBuyerSuspensionEligibility(userId);
      if (res.ok) {
        const activeCount = payload.activeOrdersCount ?? 0;
        setCanSuspend(activeCount === 0);
        if (activeCount > 0) {
          setSuspensionError("This buyer has an active order and cannot be suspended.");
        }
      }
    } catch (err) {
      console.error("Check suspend eligibility failed:", err);
    }
  };

  const handleSuspend = async () => {
    if (!canSuspend) return;
    setSuspending(true);
    setSuspensionError("");
    try {
      const { res, payload } = await suspendAdminBuyer(userId, suspensionReason);
      if (res.ok) {
        setShowSuspendModal(false);
        fetchBuyer();
      } else {
        setSuspensionError(payload?.error || "Failed to suspend buyer");
      }
    } catch (err) {
      setSuspensionError("Network error");
      console.error("Suspend failed:", err);
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    setActionError("");
    try {
      const { res, payload } = await unsuspendAdminBuyer(userId);
      if (res.ok) {
        fetchBuyer();
      } else {
        setActionError(payload?.error || "Failed to unsuspend buyer");
      }
    } catch (err) {
      setActionError("Network error");
      console.error("Unsuspend failed:", err);
    }
  };

  const handleDeactivate = async () => {
    if (!buyer || !window.confirm(`Deactivate buyer "${buyer.name}"? This blocks them from logging in. Their order history is kept.`)) return;
    setActionError("");
    try {
      const { res, payload } = await deactivateAdminBuyer(userId);
      if (res.ok) {
        fetchBuyer();
      } else {
        setActionError(payload?.error || "Failed to deactivate buyer");
      }
    } catch (err) {
      setActionError("Network error");
      console.error("Deactivate failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <span className="material-symbols-outlined animate-spin mr-2">autorenew</span>
        Loading buyer...
      </div>
    );
  }

  if (error || !buyer) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-red-100 p-8 shadow-sm">
        <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
        <p className="text-red-700 font-semibold">{error || "Buyer not found"}</p>
        <Link href="/admin/buyers" className="text-primary hover:underline text-sm mt-4 inline-block">
          Back to Buyers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/buyers" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Buyers
          </Link>
          <h1 className="text-2xl font-black text-emerald-950 tracking-tight">{buyer.name}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE[buyer.status] || "bg-gray-100 text-gray-800"}`}>
          {buyer.status.charAt(0).toUpperCase() + buyer.status.slice(1)}
        </span>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{actionError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm md:col-span-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Profile</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{buyer.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{buyer.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Joined</dt>
              <dd className="font-medium text-gray-900">{new Date(buyer.createdAt).toLocaleDateString()}</dd>
            </div>
            {buyer.status === "suspended" && buyer.suspensionReason && (
              <div>
                <dt className="text-gray-500">Suspension Reason</dt>
                <dd className="font-medium text-gray-900">{buyer.suspensionReason}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-col gap-2">
            {buyer.status === "suspended" ? (
              <button
                onClick={handleUnsuspend}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 transition-colors"
              >
                Unsuspend Buyer
              </button>
            ) : buyer.status === "active" ? (
              <button
                onClick={openSuspendModal}
                className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 transition-colors"
              >
                Suspend Buyer
              </button>
            ) : null}
            {buyer.status !== "deactivated" && (
              <button
                onClick={handleDeactivate}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Deactivate Buyer
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden md:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/30">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              Order History <span className="text-gray-400 font-normal">({orders.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-3">shopping_bag</span>
                <p className="text-sm font-medium">No orders yet</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-gray-500">Order</th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-gray-500">Farmer</th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wider text-gray-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o._id}>
                      <td className="px-6 py-4 text-sm font-mono text-gray-700">#{o._id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{o.farmName || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">{o.status.replace(/_/g, " ")}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">₦{Number(o.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Suspend {buyer.name}</h3>
            {suspensionError && (
              <p className="text-sm text-red-600 mb-3">{suspensionError}</p>
            )}
            {canSuspend && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Why is this buyer being suspended?"
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              {canSuspend && (
                <button
                  onClick={handleSuspend}
                  disabled={suspending}
                  className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-60"
                >
                  {suspending ? "Suspending..." : "Confirm Suspend"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { getAdminFarmers, getAdminFarmerSuspensionEligibility } from "@/lib/kizfarm/supabase-data";
import { suspendAdminFarmer, unsuspendAdminFarmer, deactivateAdminFarmer } from "@/lib/kizfarm/supabase-mutations";

interface Farmer {
  _id: string;
  fullName: string;
  farmName: string;
  phone: string;
  status: "approved" | "pending" | "rejected";
  createdAt: string;
  userId?: {
    email: string;
    phone: string;
    status: string;
  };
}

export default function AllFarmersListPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");

  // Suspension modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspensionError, setSuspensionError] = useState("");
  const [canSuspend, setCanSuspend] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    fetchFarmers();
  }, [statusFilter]);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const { res, payload } = await getAdminFarmers({ status: statusFilter, search: searchQ || undefined });
      if (res.ok) {
        setFarmers(payload.farmers || []);
        setTotal(payload.total || 0);
      }
    } catch (err) {
      console.error("Fetch farmers failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const openSuspendModal = async (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setSuspensionReason("");
    setSuspensionError("");
    setCanSuspend(false);
    setCheckingEligibility(true);
    setShowSuspendModal(true);

    try {
      const { res, payload } = await getAdminFarmerSuspensionEligibility(farmer._id);
      if (res.ok) {
        if ((payload.activeOrdersCount ?? 0) > 0) {
          setSuspensionError(
            "This farmer has an active order and cannot be suspended."
          );
        } else if (payload.hasPendingEscrow) {
          setSuspensionError(
            "This farmer cannot be suspended because they have unreleased payments in escrow."
          );
        } else {
          setCanSuspend(true);
        }
      } else {
        setSuspensionError(payload?.error || "Failed to check suspension eligibility.");
      }
    } catch (err) {
      console.error("Check eligibility failed:", err);
      setSuspensionError("Failed to check suspension eligibility.");
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedFarmer || !canSuspend) return;
    setSuspending(true);
    setSuspensionError("");

    try {
      const { res, payload } = await suspendAdminFarmer(selectedFarmer._id, suspensionReason);
      if (res.ok) {
        setShowSuspendModal(false);
        fetchFarmers();
      } else {
        setSuspensionError(payload?.error || "Failed to suspend farmer");
      }
    } catch (err) {
      setSuspensionError("Network error. Please try again.");
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async (farmer: Farmer) => {
    try {
      const { res } = await unsuspendAdminFarmer(farmer._id);
      if (res.ok) fetchFarmers();
    } catch (err) {
      console.error("Unsuspend failed:", err);
    }
  };

  const handleDeactivate = async (farmer: Farmer) => {
    if (
      !window.confirm(
        `Deactivate farmer "${farmer.fullName}"? This blocks them from logging in. Their listings and order history are kept.`
      )
    )
      return;
    try {
      const { res, payload } = await deactivateAdminFarmer(farmer._id);
      if (res.ok) {
        fetchFarmers();
      } else {
        alert(payload?.error || "Failed to deactivate farmer");
      }
    } catch (err) {
      console.error("Deactivate failed:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100/50 text-emerald-700";
      case "pending":
        return "bg-amber-100/50 text-amber-700";
      case "rejected":
        return "bg-rose-100/50 text-rose-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-600";
      case "pending":
        return "bg-amber-600";
      case "rejected":
        return "bg-rose-600";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Verified";
      case "pending":
        return "Pending";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const isSuspended = (farmer: Farmer) =>
    farmer.userId?.status === "suspended" || farmer.userId?.status === "deactivated";

  const filteredFarmers = farmers.filter((f) => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      f.fullName?.toLowerCase().includes(q) ||
      f.farmName?.toLowerCase().includes(q) ||
      f.phone?.toLowerCase().includes(q) ||
      f.userId?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="bg-background text-on-background antialiased"
      style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#f9f9ff" }}
    >
      {/* Main Content */}
      <main>
        <div className="p-margin max-w-container-max mx-auto">
          {/* Breadcrumbs & Actions */}
          <div className="flex items-center justify-between mb-lg">
            <div>
              <nav className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <span>Admin</span>
                <span
                  className="material-symbols-outlined text-[14px]"
                  data-icon="chevron_right"
                >
                  chevron_right
                </span>
                <span className="text-emerald-700 font-medium">Farmers</span>
              </nav>
              <h2 className="font-h1 text-h1 text-slate-900">
                Farmers Management
              </h2>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-label-md shadow-sm hover:bg-slate-50 transition-all">
                <span
                  className="material-symbols-outlined text-[20px]"
                  data-icon="file_download"
                >
                  file_download
                </span>
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <span
                    className="material-symbols-outlined text-emerald-700"
                    data-icon="groups"
                  >
                    groups
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 font-label-sm uppercase tracking-wider">
                  Total Farmers
                </p>
                <p className="text-h2 font-h2 text-slate-900">{total}</p>
              </div>
            </div>
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <span
                    className="material-symbols-outlined text-blue-700"
                    data-icon="verified"
                  >
                    verified
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 font-label-sm uppercase tracking-wider">
                  Showing
                </p>
                <p className="text-h2 font-h2 text-slate-900">
                  {filteredFarmers.length}
                </p>
              </div>
            </div>
            <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-rose-50 rounded-lg">
                  <span
                    className="material-symbols-outlined text-rose-700"
                    data-icon="block"
                  >
                    block
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-slate-500 font-label-sm uppercase tracking-wider">
                  Suspended
                </p>
                <p className="text-h2 font-h2 text-slate-900">
                  {filteredFarmers.filter((f) => isSuspended(f)).length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white border border-outline-variant rounded-t-xl p-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-56"
                  placeholder="Search farmers..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchFarmers()}
                />
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Status:
                </span>
                <select
                  className="text-xs border border-slate-200 bg-white text-slate-700 rounded-lg py-1 pl-2 pr-6 focus:ring-0 focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {filteredFarmers.length}
              </span>{" "}
              of {total} farmers
            </div>
          </div>

          {/* Farmers Table */}
          <div className="bg-white border-x border-b border-outline-variant rounded-b-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    autorenew
                  </span>
                  Loading farmers...
                </div>
              ) : filteredFarmers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <span className="material-symbols-outlined text-4xl mb-3">
                    agriculture
                  </span>
                  <p className="text-sm font-medium">No farmers found</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                        Farmer Name
                      </th>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                        Farm Name
                      </th>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                        Verification Status
                      </th>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-lg py-3 text-[12px] font-bold text-slate-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFarmers.map((farmer) => (
                      <tr
                        key={farmer._id}
                        className={`hover:bg-slate-50/50 transition-colors group ${isSuspended(farmer) ? "bg-red-50/20" : ""}`}
                      >
                        <td className="px-lg py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                              {farmer.fullName?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-label-md text-slate-900">
                                {farmer.fullName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {farmer.userId?.email || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-lg py-4">
                          <p className="text-body-sm text-slate-700">
                            {farmer.farmName || "—"}
                          </p>
                        </td>
                        <td className="px-lg py-4 text-body-sm text-slate-600">
                          {farmer.phone || farmer.userId?.phone || "—"}
                        </td>
                        <td className="px-lg py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(farmer.status)}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${getStatusDot(farmer.status)}`}
                            />
                            {getStatusLabel(farmer.status)}
                          </span>
                        </td>
                        <td className="px-lg py-4">
                          {isSuspended(farmer) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100/50 text-red-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/50 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-lg py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSuspended(farmer) ? (
                              <button
                                onClick={() => handleUnsuspend(farmer)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 transition-colors"
                              >
                                Unsuspend
                              </button>
                            ) : (
                              <button
                                onClick={() => openSuspendModal(farmer)}
                                className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-amber-700 font-bold text-xs hover:bg-amber-50 transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => handleDeactivate(farmer)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-colors"
                            >
                              Deactivate
                            </button>
                          </div>
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

      {/* Suspension Modal */}
      {showSuspendModal && selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-slate-900">
                Suspend Farmer
              </h3>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Farmer:</strong> {selectedFarmer.fullName}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Farm:</strong> {selectedFarmer.farmName || "—"}
                </p>
              </div>

              {checkingEligibility && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined animate-spin text-sm">
                    autorenew
                  </span>
                  Checking eligibility...
                </div>
              )}

              {suspensionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5">
                    error
                  </span>
                  {suspensionError}
                </div>
              )}

              {canSuspend && !checkingEligibility && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suspension Reason (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      placeholder="e.g., Policy violation, Fraudulent activity..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Warning:</strong> Suspending this farmer will
                      prevent them from accessing their account and listing
                      products.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!canSuspend || suspending || checkingEligibility}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  !canSuspend || checkingEligibility
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                } disabled:opacity-60`}
              >
                {suspending ? "Suspending..." : "Suspend Farmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

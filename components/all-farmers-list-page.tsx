"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFarmers, getAdminFarmerStatusCounts, getAdminFarmerSuspensionEligibility } from "@/lib/kizfarm/supabase-data";
import { statusMeta } from "@/lib/kizfarm/farmer-application";
import { suspendAdminFarmer, unsuspendAdminFarmer, deactivateAdminFarmer } from "@/lib/kizfarm/supabase-mutations";
import DeleteAccountButton from "@/components/delete-account-button";

interface Farmer {
  _id: string;
  fullName: string;
  farmName: string;
  phone: string;
  status: "draft" | "approved" | "pending" | "rejected";
  location?: string;
  createdAt: string;
  submittedAt?: string;
  missingCount: number;
  userId?: {
    _id?: string;
    email: string;
    phone: string;
    status: string;
  };
}

export default function AllFarmersListPage() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  // "All" by default: a filtered default once made pending and incomplete
  // applicants look like they had vanished from the list.
  const [statusFilter, setStatusFilter] = useState("all");
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Suspension modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspensionError, setSuspensionError] = useState("");
  const [canSuspend, setCanSuspend] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const fetchCounts = async () => {
    const { res, payload } = await getAdminFarmerStatusCounts();
    if (res.ok) setCounts(payload.counts || {});
  };

  const fetchFarmers = async () => {
    void fetchCounts();
    try {
      setLoading(true);
      const { res, payload } = await getAdminFarmers({ status: statusFilter, search: searchQ || undefined, offset: 0, limit: PAGE_SIZE });
      if (res.ok) {
        setFarmers(payload.farmers || []);
        setTotal(payload.total || 0);
        setOffset(0);
      }
    } catch (err) {
      console.error("Fetch farmers failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFarmers = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const { res, payload } = await getAdminFarmers({ status: statusFilter, search: searchQ || undefined, offset: nextOffset, limit: PAGE_SIZE });
      if (res.ok) {
        setFarmers((prev) => [...prev, ...(payload.farmers || [])]);
        setOffset(nextOffset);
      }
    } catch (err) {
      console.error("Load more farmers failed:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Debounced so typing in the search box doesn't fire a request per key.
    const t = setTimeout(() => fetchFarmers(), searchQ ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchQ]);

  const exportCsv = () => {
    const header = ["Name", "Farm", "Email", "Phone", "State", "Application status", "Account", "Started", "Submitted"];
    const rows = filteredFarmers.map((f) => [
      f.fullName,
      f.farmName,
      f.userId?.email || "",
      f.phone || f.userId?.phone || "",
      f.location || "",
      statusMeta(f.status).adminLabel,
      isSuspended(f) ? f.userId?.status || "" : "active",
      f.createdAt ? new Date(f.createdAt).toISOString() : "",
      f.submittedAt ? new Date(f.submittedAt).toISOString() : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kizfarm-farmers-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
              <Link
                href="/admin/verify-farmers"
                className="flex items-center gap-2 px-4 py-2 bg-[#1B6D24] rounded-lg text-white font-label-md shadow-sm hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">verified</span>
                Review applications
                {(counts.pending || 0) > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">{counts.pending}</span>
                )}
              </Link>
              <button
                onClick={exportCsv}
                disabled={filteredFarmers.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-label-md shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
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

          {/* Stats Overview -- each card filters the list */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-lg">
            {[
              { key: "all", label: "All", icon: "groups", tone: "bg-slate-50 text-slate-700" },
              { key: "approved", label: "Verified", icon: "verified", tone: "bg-emerald-50 text-emerald-700" },
              { key: "pending", label: "Pending review", icon: "hourglass_top", tone: "bg-amber-50 text-amber-700" },
              { key: "draft", label: "Incomplete", icon: "edit_note", tone: "bg-slate-100 text-slate-700" },
              { key: "rejected", label: "Rejected", icon: "block", tone: "bg-rose-50 text-rose-700" },
            ].map((c) => (
              <button
                key={c.key}
                onClick={() => setStatusFilter(c.key)}
                className={`bg-white p-4 rounded-xl border text-left shadow-sm transition-all hover:shadow-md ${
                  statusFilter === c.key ? "border-[#1B6D24] ring-2 ring-[#1B6D24]/15" : "border-outline-variant"
                }`}
              >
                <span className={`inline-flex p-1.5 rounded-lg ${c.tone}`}>
                  <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
                </span>
                <p className="mt-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900">{counts[c.key] ?? "–"}</p>
              </button>
            ))}
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
                  <option value="pending">Pending review</option>
                  <option value="draft">Incomplete (not submitted)</option>
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
                  <p className="text-sm font-medium">
                    {searchQ ? `No farmers match “${searchQ}”` : statusFilter === "all" ? "No farmers yet" : `No ${statusMeta(statusFilter).adminLabel.toLowerCase()} farmers`}
                  </p>
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
                              <Link href={`/admin/verify-farmers/${farmer._id}`} className="font-label-md text-slate-900 hover:text-[#1B6D24] hover:underline">
                                {farmer.fullName}
                              </Link>
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusMeta(farmer.status).badge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusMeta(farmer.status).dot}`}
                            />
                            {statusMeta(farmer.status).adminLabel}
                          </span>
                          {farmer.status === "draft" && (
                            <p className="mt-1 text-xs text-slate-500">
                              {farmer.missingCount > 0 ? `${farmer.missingCount} item${farmer.missingCount === 1 ? "" : "s"} missing` : "Complete, not submitted"}
                            </p>
                          )}
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
                          <div className="flex flex-wrap items-center justify-end gap-2 min-w-[220px]">
                            <Link
                              href={`/admin/verify-farmers/${farmer._id}`}
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                            >
                              {farmer.status === "pending" ? "Review" : "Application"}
                            </Link>
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
                            {farmer.userId?._id && (
                              <DeleteAccountButton
                                userId={farmer.userId._id}
                                name={farmer.fullName || farmer.farmName}
                                label="Delete"
                                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg font-bold text-xs hover:bg-red-50 transition-colors"
                                onDeleted={() => fetchFarmers()}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {!loading && farmers.length < total && (
              <div className="flex justify-center py-4 border-t border-gray-100">
                <button
                  onClick={loadMoreFarmers}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm font-semibold text-[#1B6D24] hover:bg-green-50 rounded-lg disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : `Load more (${farmers.length} of ${total})`}
                </button>
              </div>
            )}
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

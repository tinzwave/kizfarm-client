"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminBuyers, getAdminBuyerStats } from "@/lib/kizfarm/supabase-data";

interface Buyer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "suspended" | "deactivated";
  createdAt: string;
  profileImage?: string;
}

interface BuyerStats {
  totalBuyers: number;
  activeBuyers: number;
  suspendedBuyers: number;
}

export default function AdminBuyerManagementPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "suspended"
  >("active");
  const [stats, setStats] = useState<BuyerStats>({
    totalBuyers: 0,
    activeBuyers: 0,
    suspendedBuyers: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await getAdminBuyers({ status: statusFilter, search: searchQ || undefined, offset: 0, limit: PAGE_SIZE });
      if (!res.ok) throw new Error(payload?.error || "Failed to fetch buyers");
      setBuyers(payload.users || []);
      setTotal(payload.total || 0);
      setOffset(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch buyers");
      console.error("Fetch buyers failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreBuyers = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const { res, payload } = await getAdminBuyers({ status: statusFilter, search: searchQ || undefined, offset: nextOffset, limit: PAGE_SIZE });
      if (res.ok) {
        setBuyers((prev) => [...prev, ...(payload.users || [])]);
        setOffset(nextOffset);
      }
    } catch (err) {
      console.error("Load more buyers failed:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { res, payload } = await getAdminBuyerStats();
      if (res.ok) {
        setStats({
          totalBuyers: payload.totalBuyers || 0,
          activeBuyers: payload.activeBuyers || 0,
          suspendedBuyers: payload.suspendedBuyers || 0,
        });
      }
    } catch (err) {
      console.error("Fetch stats failed:", err);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchBuyers();
      fetchStats();
    });
  }, [statusFilter, searchQ]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQ(e.target.value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-300";
      case "suspended":
        return "bg-red-100 text-red-700 border-red-300";
      case "deactivated":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Buyer Management
          </h1>
          <p className="text-gray-600">
            Manage and monitor all registered buyers on the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Total Buyers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalBuyers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">
                  group
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Active Buyers
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.activeBuyers}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">
                  check_circle
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Suspended Buyers
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {stats.suspendedBuyers}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">
                  block
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name or Email
              </label>
              <input
                type="text"
                value={searchQ}
                onChange={handleSearch}
                placeholder="Search buyers..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Buyers Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Buyers {buyers.length > 0 && `(${buyers.length})`}
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <p>Loading buyers...</p>
              </div>
            ) : buyers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="font-medium mb-2">No buyers found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {buyers.map((buyer) => (
                    <tr
                      key={buyer._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                            {buyer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {buyer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {buyer.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {buyer.phone || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(buyer.status)}`}
                        >
                          {buyer.status.charAt(0).toUpperCase() +
                            buyer.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(buyer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/users/${buyer._id}`}
                          className="text-primary hover:text-primary-dark font-medium text-sm hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!loading && buyers.length < total && (
            <div className="flex justify-center py-4 border-t border-gray-100">
              <button
                onClick={loadMoreBuyers}
                disabled={loadingMore}
                className="px-4 py-2 text-sm font-semibold text-[#1B6D24] hover:bg-green-50 rounded-lg disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : `Load more (${buyers.length} of ${total})`}
              </button>
            </div>
          )}
        </div>

        {/* Empty State Helper */}
        {!loading &&
          buyers.length === 0 &&
          searchQ === "" &&
          statusFilter === "active" && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                No active buyers yet
              </h3>
              <p className="text-sm text-blue-700">
                Buyers will appear here as they sign up on the platform
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

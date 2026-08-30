"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAdminEscrows, getAdminEscrowStats } from "@/lib/kizfarm/supabase-data";

interface Escrow {
  _id: string;
  orderId: any;
  amount: number;
  status: string;
  buyerId: any;
  farmerId: any;
  createdAt: string;
  releasedAt?: string;
}

export default function EscrowManagementPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalPending: 0, pendingAmount: 0, releasedAmount: 0, totalRefunded: 0 });

  useEffect(() => {
    fetchEscrows();
    fetchStats();
  }, []);

  const fetchEscrows = async () => {
    try {
      const { payload } = await getAdminEscrows();
      if (payload?.ok) setEscrows((payload.escrows as Escrow[]) || []);
    } catch (err) {
      console.error('Fetch escrows failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { payload } = await getAdminEscrowStats();
      if (payload?.ok) setStats(payload.stats);
    } catch (err) {
      console.error('Fetch stats failed:', err);
    }
  };

  return (
    <div style={{ backgroundColor: '#f9f9ff', fontFamily: "'Inter', sans-serif" }}>
      <main className="min-h-screen p-8">
        <div className="max-w-[1440px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Escrow Management</h1>
            <p className="text-gray-600">Monitor and manage secure payment holds for farmer payouts</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Total in Escrow</p>
              <p className="text-3xl font-bold text-green-700">₦{(stats.pendingAmount || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Pending Payouts</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalPending}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Released</p>
              <p className="text-3xl font-bold text-emerald-600">₦{(stats.releasedAmount || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm font-medium mb-2">Refunded</p>
              <p className="text-3xl font-bold text-red-600">₦0</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Escrow Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : escrows.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No escrow transactions</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Farmer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Buyer</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {escrows.map((escrow) => (
                      <tr key={escrow._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4"><span className="font-medium">{escrow.farmerId?.fullName || 'N/A'}</span></td>
                        <td className="px-6 py-4"><span>{escrow.buyerId?.name}</span></td>
                        <td className="px-6 py-4"><span className="font-semibold text-green-700">₦{escrow.amount.toLocaleString()}</span></td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            escrow.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            escrow.status === 'released' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {escrow.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(escrow.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/escrow/${escrow._id}`} className="text-green-700 hover:text-green-900 font-medium text-sm">
                            View Details
                          </Link>
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

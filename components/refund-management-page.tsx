"use client"

import React, { useState, useEffect } from 'react';
import { getAdminRefunds } from "@/lib/kizfarm/supabase-data";

interface RefundedOrder {
  _id: string;
  farmerId?: { farmName: string; fullName?: string };
  total: number;
  items: any[];
  cancelledAt: string;
  cancellationReason?: string;
  paymentStatus: string;
  status: string;
}

export default function RefundManagementPage() {
  const [refunds, setRefunds] = useState<RefundedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundedOrder | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const fetchRefunds = async () => {
    try {
      const { res, payload } = await getAdminRefunds();
      if (res.ok) setRefunds(payload.refunds || []);
    } catch (err) {
      console.error('Fetch refunds failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchRefunds());
  }, []);

  const filteredRefunds = refunds.filter((r) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return r.farmerId?.farmName?.toLowerCase().includes(q) ||
             r._id.toLowerCase().includes(q);
    }
    return true;
  });

  const openDetail = (refund: RefundedOrder) => {
    setSelectedRefund(refund);
    setShowDetail(true);
  };

  const getRefundStatus = (status: string) => {
    switch (status) {
      case 'refunded':
        return { label: 'Refunded', color: 'bg-green-100 text-green-700' };
      case 'pending':
        return { label: 'Processing', color: 'bg-yellow-100 text-yellow-700' };
      case 'failed':
        return { label: 'Failed', color: 'bg-red-100 text-red-700' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Refund Management</h1>
        </div>
        <button
          onClick={fetchRefunds}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Search by farm name or order ID..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Total Refunded</p>
              <p className="text-3xl font-bold text-green-700">
                ₦{refunds
                  .filter(r => r.paymentStatus === 'refunded')
                  .reduce((sum, r) => sum + r.total, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Processing</p>
              <p className="text-3xl font-bold text-yellow-700">
                {refunds.filter(r => r.paymentStatus === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Total Refunds</p>
              <p className="text-3xl font-bold text-gray-900">{refunds.length}</p>
            </div>
          </div>

          {/* Refunds Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <span className="material-symbols-outlined animate-spin mr-2">autorenew</span>
                Loading refunds...
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-3">inbox</span>
                <p className="text-sm font-medium">No refunds found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Farm Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cancelled Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRefunds.map((refund) => {
                    const statusInfo = getRefundStatus(refund.paymentStatus);
                    return (
                      <tr key={refund._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          #{refund._id.slice(-8).toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {refund.farmerId?.farmName || 'Unknown Farm'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₦{refund.total.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {refund.items.length} item{refund.items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(refund.cancelledAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openDetail(refund)}
                            className="text-green-700 hover:text-green-900 font-medium text-sm"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {showDetail && selectedRefund && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Refund Details
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Order Info */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Order Information</p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Order ID:</strong> #{selectedRefund._id.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Farm:</strong> {selectedRefund.farmerId?.farmName || 'Unknown'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Cancelled:</strong> {new Date(selectedRefund.cancelledAt).toLocaleDateString()}
                </p>
              </div>

              {/* Amount Info */}
              <div className="border-b border-gray-200 pb-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Amount</p>
                <p className="text-2xl font-bold text-green-700">
                  ₦{selectedRefund.total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Status:</strong>{' '}
                  <span className={`font-semibold ${
                    selectedRefund.paymentStatus === 'refunded'
                      ? 'text-green-700'
                      : selectedRefund.paymentStatus === 'pending'
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  }`}>
                    {selectedRefund.paymentStatus === 'refunded'
                      ? 'Refunded to Your Account'
                      : selectedRefund.paymentStatus === 'pending'
                      ? 'Processing'
                      : 'Refund Failed'}
                  </span>
                </p>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Items ({selectedRefund.items.length})</p>
                <div className="space-y-2">
                  {selectedRefund.items.map((item, i) => (
                    <div key={i} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                      <strong>{item.name}</strong> x{item.quantity} @ ₦{item.price?.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRefund.cancellationReason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Cancellation Reason:</strong> {selectedRefund.cancellationReason}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

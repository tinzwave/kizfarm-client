"use client"

import React, { useState, useEffect } from 'react';
import { getFarmerPaymentHistory, getFarmerBankDetails } from "@/lib/kizfarm/supabase-data";
import { saveFarmerBankDetails } from "@/lib/kizfarm/supabase-mutations";

interface Payment {
  _id: string;
  total: number;
  paymentStatus: string;
  escrowStatus: string;
  buyerName: string;
  acceptedAt: string;
  createdAt?: string;
  items: any[];
}

interface BankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  branchCode?: string;
  isVerified?: boolean;
}

interface Props {
  hideSidebar?: boolean;
}

export default function FarmerPayoutHistoryPage({ hideSidebar = false }: Props) {
  const [activeTab, setActiveTab] = useState<'history' | 'bank' | 'profile'>('history');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ bankName: '', accountHolderName: '', accountNumber: '', branchCode: '' });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { res, payload } = await getFarmerPaymentHistory();
      if (res.ok) setPayments(payload.payments || []);
    } catch (err) {
      console.error('Fetch payments failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    setLoading(true);
    try {
      const { res, payload } = await getFarmerBankDetails();
      if (res.ok && payload.bankDetails) {
        setBankDetails(payload.bankDetails);
        setFormData({
          bankName: payload.bankDetails.bankName || '',
          accountHolderName: payload.bankDetails.accountHolderName || '',
          accountNumber: payload.bankDetails.accountNumber || '',
          branchCode: payload.bankDetails.branchCode || ''
        });
      }
    } catch (err) {
      console.error('Fetch bank details failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (activeTab === 'history') fetchPayments();
      if (activeTab === 'bank') fetchBankDetails();
    });
  }, [activeTab]);

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { res, payload } = await saveFarmerBankDetails(formData);
      if (res.ok) {
        setBankDetails(payload.bankDetails ?? formData);
        alert('Bank details saved successfully');
      } else {
        alert(payload?.error || 'Failed to save bank details');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Farmer Account</h1>
          <p className="text-gray-600">Manage payments, bank details, and profile</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="flex border-b border-gray-200">
            {['history', 'bank', 'profile'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'history' | 'bank' | 'profile')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-green-700 text-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'history' && 'Payment History'}
                {tab === 'bank' && 'Bank Details'}
                {tab === 'profile' && 'Profile'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Payment History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Payment History</h2>
                {loading ? (
                  <p className="flex items-center gap-2 text-gray-500">
                    <span className="material-symbols-outlined animate-spin">autorenew</span>
                    Loading...
                  </p>
                ) : payments.length === 0 ? (
                  <p className="text-gray-500">No payments yet</p>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment._id} className="border border-gray-200 rounded p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900">From: {payment.buyerName}</p>
                            <p className="text-sm text-gray-500 mt-1">{new Date(payment.acceptedAt || payment.createdAt || "").toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-700">₦{payment.total.toLocaleString()}</p>
                            <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                              payment.escrowStatus === 'released'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.escrowStatus === 'released' ? 'Paid' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p><strong>Items:</strong> {payment.items.length} product(s)</p>
                          <p><strong>Status:</strong> {payment.escrowStatus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Bank Account Information</h2>
                <form onSubmit={handleSaveBankDetails} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Access Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Full name as on bank account"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="10-12 digits"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch Code / Swift (Optional)</label>
                    <input
                      type="text"
                      value={formData.branchCode}
                      onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., ACBN123"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </form>
                {bankDetails.accountNumber && (
                  <div className={`mt-6 p-4 rounded border ${bankDetails.isVerified ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <p className={`text-sm ${bankDetails.isVerified ? "text-green-800" : "text-amber-800"}`}>
                      <strong>{bankDetails.isVerified ? "Verified ✓" : "Pending verification"}</strong> Bank details on file
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
                <p className="text-gray-500 text-sm">Profile editing coming soon. Contact support for profile updates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

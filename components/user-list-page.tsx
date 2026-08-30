"use client"

import React, { useState, useEffect } from 'react';
import { getAdminBuyers, getAdminBuyerSuspensionEligibility } from "@/lib/kizfarm/supabase-data";
import { suspendAdminBuyer, unsuspendAdminBuyer, deactivateAdminBuyer } from "@/lib/kizfarm/supabase-mutations";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: string;
  activeOrdersCount?: number;
  suspensionReason?: string;
  suspendedAt?: string;
}

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Suspension modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [suspensionError, setSuspensionError] = useState("");
  const [canSuspend, setCanSuspend] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { res, payload } = await getAdminBuyers({ status: statusFilter });
      if (res.ok) setUsers(payload.users || []);
    } catch (err) {
      console.error('Fetch users failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const openSuspendModal = async (user: User) => {
    setSelectedUser(user);
    setSuspensionReason("");
    setSuspensionError("");
    setShowSuspendModal(true);

    // Check if user can be suspended
    try {
      const { res, payload } = await getAdminBuyerSuspensionEligibility(user._id);
      if (res.ok) {
        const activeCount = payload.activeOrdersCount ?? 0;
        setCanSuspend(activeCount === 0);
        if (activeCount > 0) {
          setSuspensionError("This buyer has an active order and cannot be suspended.");
        }
      }
    } catch (err) {
      console.error('Check suspend eligibility failed:', err);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser || !canSuspend) return;
    setSuspending(true);
    setSuspensionError("");

    try {
      const { res, payload } = await suspendAdminBuyer(selectedUser._id, suspensionReason);
      if (res.ok) {
        setShowSuspendModal(false);
        fetchUsers();
      } else {
        setSuspensionError(payload?.error || 'Failed to suspend user');
      }
    } catch (err) {
      setSuspensionError('Network error');
      console.error('Suspend failed:', err);
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async (user: User) => {
    try {
      const { res } = await unsuspendAdminBuyer(user._id);
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Unsuspend failed:', err);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!window.confirm(`Deactivate buyer "${user.name}"? This blocks them from logging in. Their order history is kept.`)) return;
    try {
      const { res, payload } = await deactivateAdminBuyer(user._id);
      if (res.ok) {
        fetchUsers();
      } else {
        alert(payload?.error || 'Failed to deactivate user');
      }
    } catch (err) {
      console.error('Deactivate failed:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return u.name?.toLowerCase().includes(q) ||
             u.email?.toLowerCase().includes(q) ||
             u.phone?.toLowerCase().includes(q);
    }
    return true;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'farmer': return 'bg-green-100 text-green-800';
      case 'buyer': return 'bg-blue-100 text-blue-800';
      case 'driver': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'deactivated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="bg-background text-on-background antialiased">
      {/* Main Content */}
        <div className="max-w-7xl mx-auto">
          {/* Filters */}
          <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="pl-3 pr-8 py-2 rounded-lg border border-outline-variant text-sm text-gray-600 focus:ring-2 focus:ring-primary-container/10 focus:border-primary-container outline-none bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant bg-gray-50/30">
              <h3 className="text-lg font-semibold">Total Buyers <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{users.length}</span></h3>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <span className="material-symbols-outlined animate-spin mr-2">autorenew</span>
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-3">people</span>
                  <p className="text-sm font-medium">No users found</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-outline-variant">
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Email</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Phone</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Role</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500">Joined</th>
                      <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredUsers.map((user) => (
                      <tr key={user._id} className={`hover:bg-gray-50/80 transition-colors ${user.status !== 'active' ? 'bg-red-50/10' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="text-body-md font-semibold text-on-surface">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-body-sm text-gray-600">{user.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(user.status)}`}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-1.5 text-xs font-semibold text-primary hover:bg-emerald-50 rounded-md transition-colors">
                              View
                            </button>
                            {user.status !== 'active' ? (
                              <button
                                onClick={() => handleUnsuspend(user)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => openSuspendModal(user)}
                                className="px-3 py-1.5 text-xs font-semibold text-error hover:bg-red-50 rounded-md transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => handleDeactivate(user)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
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

      {/* Suspension Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-slate-900">Suspend User</h3>
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
                  <strong>User:</strong> {selectedUser.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Email:</strong> {selectedUser.email}
                </p>
              </div>

              {suspensionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {suspensionError}
                </div>
              )}

              {canSuspend && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suspension Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="e.g., Violation of terms, Suspicious activity..."
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                  />
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> Suspending this user will prevent them from accessing their account.
                </p>
              </div>
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
                disabled={!canSuspend || suspending}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  !canSuspend
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                } disabled:opacity-60`}
              >
                {suspending ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

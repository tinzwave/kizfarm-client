"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getAdminDashboard } from "@/lib/kizfarm/supabase-data";

interface RecentOrder {
  _id: string;
  masterOrderId?: string;
  status: string;
  total: number;
  buyerId?: { name?: string; email?: string };
  farmerId?: { farmName?: string; fullName?: string };
}

interface Product {
  _id: string;
  name: string;
  price: number;
  quantity?: number;
  unit?: string;
  category?: string;
  images?: string[];
  farmerId?: { farmName?: string; fullName?: string };
}

interface DashboardPayload {
  stats: {
    totalUsers: number;
    totalFarmers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingFarmers: number;
  };
  recentOrders: RecentOrder[];
  recentProducts: Product[];
}

const money = (value = 0) => `NGN ${Number(value).toLocaleString()}`;

function statusClass(status: string) {
  if (["delivered", "receipt_confirmed"].includes(status)) return "bg-green-100 text-green-800";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  if (["assigned", "in_transit"].includes(status)) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const { res, payload } = await getAdminDashboard();
        if (!res.ok) {
          setError(payload?.error || "Could not load dashboard data.");
          return;
        }
        setData(payload as DashboardPayload);
      } catch {
        setError("Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const stats = data?.stats;
  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: "group", color: "bg-emerald-50 text-emerald-700" },
    { label: "Total Farmers", value: stats?.totalFarmers, icon: "agriculture", color: "bg-blue-50 text-blue-700" },
    { label: "Total Orders", value: stats?.totalOrders, icon: "shopping_cart", color: "bg-orange-50 text-orange-700" },
    { label: "Total Revenue", value: money(stats?.totalRevenue || 0), icon: "payments", color: "bg-emerald-700 text-white" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-container-max mx-auto">
      <div className="flex items-center gap-2 mb-6 text-on-surface-variant font-label-sm">
        <span>Home</span>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-primary font-bold">Dashboard</span>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter mb-gutter">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-lg rounded-xl border border-[#EAECF0] shadow-[0px_1px_3px_rgba(16,24,40,0.05)]">
            <div className="flex items-center justify-between mb-sm">
              <div className={`p-sm rounded-lg ${card.color}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">Live</span>
            </div>
            <h4 className="font-label-md text-on-surface-variant uppercase tracking-wider mb-xs">{card.label}</h4>
            <span className="font-h1 text-on-surface">{loading ? "-" : card.value ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-gutter">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#EAECF0] shadow-[0px_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">
          <div className="px-lg py-md border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-h3 text-on-surface">Recent Orders</h3>
              <p className="font-body-sm text-on-surface-variant">Latest transactions across the network</p>
            </div>
            <Link href="/admin/order-control" className="text-sm font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-lg py-md font-label-sm text-on-surface-variant uppercase">Order</th>
                  <th className="px-lg py-md font-label-sm text-on-surface-variant uppercase">Buyer</th>
                  <th className="px-lg py-md font-label-sm text-on-surface-variant uppercase">Farmer</th>
                  <th className="px-lg py-md font-label-sm text-on-surface-variant uppercase">Status</th>
                  <th className="px-lg py-md font-label-sm text-on-surface-variant uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.recentOrders ?? []).map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-lg py-md font-numeric text-on-surface font-medium">{order.masterOrderId || order._id.slice(-8).toUpperCase()}</td>
                    <td className="px-lg py-md text-sm">{order.buyerId?.name || order.buyerId?.email || "Buyer"}</td>
                    <td className="px-lg py-md text-sm">{order.farmerId?.farmName || order.farmerId?.fullName || "Farmer"}</td>
                    <td className="px-lg py-md"><span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${statusClass(order.status)}`}>{order.status.replaceAll("_", " ")}</span></td>
                    <td className="px-lg py-md font-numeric text-right font-bold">{money(order.total)}</td>
                  </tr>
                ))}
                {!loading && (data?.recentOrders ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-lg py-10 text-center text-sm text-slate-500">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#EAECF0] shadow-[0px_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">
          <div className="px-lg py-md border-b border-gray-100">
            <h3 className="font-h3 text-on-surface">Live Platform Snapshot</h3>
            <p className="font-body-sm text-on-surface-variant">Database-backed counts</p>
          </div>
          <div className="p-lg space-y-4">
            <div className="flex justify-between rounded-lg bg-emerald-50 p-4">
              <span className="font-semibold text-emerald-900">Products</span>
              <span className="font-bold">{loading ? "-" : stats?.totalProducts ?? 0}</span>
            </div>
            <div className="flex justify-between rounded-lg bg-amber-50 p-4">
              <span className="font-semibold text-amber-900">Farmers Pending Review</span>
              <span className="font-bold">{loading ? "-" : stats?.pendingFarmers ?? 0}</span>
            </div>
            <Link href="/admin/verify-farmers" className="block rounded-lg border border-dashed border-primary/30 py-3 text-center text-sm font-bold text-primary hover:bg-emerald-50">
              Review Farmer Applications
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EAECF0] shadow-[0px_1px_3px_rgba(16,24,40,0.05)] overflow-hidden">
        <div className="px-lg py-md border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-h3 text-on-surface">Latest Products</h3>
            <p className="font-body-sm text-on-surface-variant">Newest products added by farmers</p>
          </div>
          <Link href="/admin/products" className="text-sm font-bold text-primary hover:underline">Manage products</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 p-lg">
          {(data?.recentProducts ?? []).map((product) => (
            <div key={product._id} className="rounded-lg border border-gray-100 overflow-hidden">
              <img src={product.images?.[0] || "/placeholder.jpg"} alt={product.name} className="h-32 w-full object-cover" />
              <div className="p-3">
                <h4 className="font-bold text-sm line-clamp-1">{product.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{product.farmerId?.farmName || product.category || "Farm product"}</p>
                <p className="mt-2 font-bold text-primary">{money(product.price)}</p>
              </div>
            </div>
          ))}
          {!loading && (data?.recentProducts ?? []).length === 0 && (
            <div className="md:col-span-2 xl:col-span-5 rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-slate-500">No products yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

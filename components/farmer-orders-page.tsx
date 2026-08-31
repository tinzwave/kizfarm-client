"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getFarmerOrders } from "@/lib/kizfarm/supabase-data";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  image?: string;
}

interface Order {
  _id: string;
  buyerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
}

function statusClass(status: string) {
  const s = status?.toLowerCase();
  if (["delivered", "receipt_confirmed"].includes(s)) return "bg-green-100 text-green-800";
  if (["assigned", "in_transit"].includes(s)) return "bg-blue-100 text-blue-800";
  if (s === "packed") return "bg-purple-100 text-purple-800";
  if (s === "cancelled") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

const getStatusLabel = (s: string) => {
  switch (s?.toLowerCase()) {
    case "pending": return "Pending";
    case "accepted_by_farmer": return "Accepted by Farmer";
    case "confirmed": return "Confirmed by Admin";
    case "packed": return "Packed";
    case "assigned": return "Driver Assigned";
    case "in_transit": return "In Transit";
    case "delivered": return "Delivered";
    case "receipt_confirmed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return s;
  }
};

export default function FarmerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"All" | "Processing" | "Shipped" | "Delivered">("All");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await getFarmerOrders();
      if (!res.ok) {
        setError(payload?.error || "Failed to load farmer orders");
        return;
      }
      setOrders((payload.orders as Order[]) || []);
    } catch (err) {
      console.error("Error fetching farmer orders:", err);
      setError("Failed to fetch orders from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchOrders());
  }, []);

  const filteredOrders = orders.filter((order) => {
    const s = order.status?.toLowerCase();
    if (activeFilter === "All") return true;
    if (activeFilter === "Processing") return ["pending", "accepted_by_farmer", "confirmed"].includes(s);
    if (activeFilter === "Shipped") return ["packed", "assigned", "in_transit"].includes(s);
    if (activeFilter === "Delivered") return ["delivered", "receipt_confirmed", "cancelled"].includes(s);
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-[#1B6D24]">
            Farmer Orders Dashboard
          </h1>
          <span className="text-xs text-zinc-500">({filteredOrders.length})</span>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto w-full p-4 md:p-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Customer orders
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Fulfill incoming fresh produce orders and coordinate logistics.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["All", "Processing", "Shipped", "Delivered"] as const).map((label) => (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                className={`h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeFilter === label
                    ? "bg-[#1B6D24] text-white"
                    : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <span className="material-symbols-outlined text-6xl text-zinc-300 mb-4">receipt_long</span>
            <p className="text-lg font-semibold text-zinc-900 mb-1">No orders found</p>
            <p className="text-sm text-zinc-500">There are no customer orders matching this category.</p>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredOrders.map((order) => {
              const firstItem = order.items?.[0];
              return (
                <Link
                  key={order._id}
                  href={`/farmer/orders/${order._id}`}
                  className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
                    <img
                      src={firstItem?.image || "https://via.placeholder.com/300x225?text=No+Image"}
                      alt={firstItem?.name || "Order Item"}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="font-bold text-zinc-950 dark:text-zinc-100 text-sm">
                          #KF-{order._id.slice(-6).toUpperCase()}
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${statusClass(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 font-semibold mb-3">
                        Buyer: {order.buyerId?.name || "Anonymous Buyer"}
                      </div>
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                        {firstItem?.name || "Fresh produce"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-4">
                      <div className="font-bold text-[#1B6D24]">
                        ₦{order.total.toLocaleString()}
                      </div>
                      <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#1B6D24]">
                        Manage Details
                        <span className="material-symbols-outlined text-[16px] ml-0.5">
                          chevron_right
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

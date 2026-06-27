"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from "@/lib/kizfarm/api";

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
  buyerId: string;
  farmerId: {
    _id: string;
    farmName: string;
    location: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  total: number;
  paymentStatus?: string;
  status: string;
  createdAt: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "processing" | "shipped" | "delivered">("all");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const { res, payload } = await apiFetch("/buyer/orders");
        if (!res.ok) {
          setError(payload?.error || "Failed to fetch orders");
          return;
        }
        setOrders(payload.orders || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusLabelAndStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "awaiting_transport_quote":
        return { label: "Transport Review", style: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
      case "awaiting_payment":
        return { label: "Ready to Pay", style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" };
      case "pending":
        return { label: "Pending", style: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" };
      case "accepted_by_farmer":
        return { label: "Accepted by Farmer", style: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
      case "confirmed":
        return { label: "Confirmed by Farmer", style: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
      case "packed":
        return { label: "Packed", style: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
      case "assigned":
        return { label: "Driver Assigned", style: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" };
      case "in_transit":
        return { label: "In Transit", style: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" };
      case "delivered":
        return { label: "Delivered", style: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
      case "receipt_confirmed":
        return { label: "Completed", style: "bg-[#1B6D24] text-white" };
      case "cancelled":
        return { label: "Cancelled", style: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
      default:
        return { label: status, style: "bg-gray-100 text-gray-800" };
    }
  };

  const filteredOrders = orders.filter((order) => {
    const s = order.status?.toLowerCase();
    if (activeFilter === "all") return true;
    if (activeFilter === "processing") return ["awaiting_transport_quote", "awaiting_payment", "pending", "accepted_by_farmer", "confirmed", "packed"].includes(s);
    if (activeFilter === "shipped") return ["assigned", "in_transit"].includes(s);
    if (activeFilter === "delivered") return ["delivered", "receipt_confirmed", "cancelled"].includes(s);
    return true;
  });

  return (
    <>
      {/* TopAppBar */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 shadow-none sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-6 py-3 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/buyer/marketplace" className="h-8 rounded-lg overflow-hidden flex-shrink-0 w-10 cursor-pointer">
              <img alt="KIZ FARM Official Logo" className="w-full h-full object-contain" data-alt="Minimalist agricultural logo with a stylized green leaf and modern geometric structure, professional branding" src="/logo.jpeg" />
            </Link>
            <h1 className="font-inter antialiased text-sm font-medium font-extrabold tracking-tight text-[#1B6D24] dark:text-green-500 text-xl">KIZ FARM</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-500 dark:text-zinc-400 hover:opacity-80 transition-opacity active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="search">search</span>
            </button>
            <button className="text-gray-500 dark:text-zinc-400 hover:opacity-80 transition-opacity active:scale-95 duration-150">
              <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-8">
        {/* Section Header */}
        <div className="mb-lg">
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Track Your Orders</h2>
          <p className="text-secondary font-body-md max-w-2xl">Monitor your recent agricultural purchases, delivery statuses, and transaction history in real-time.</p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-sm mb-md overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveFilter("all")}
            className={`px-6 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
              activeFilter === "all" ? "bg-primary-container text-white" : "bg-white border border-outline-variant text-secondary hover:bg-surface-container"
            }`}
          >
            All Orders
          </button>
          <button 
            onClick={() => setActiveFilter("processing")}
            className={`px-6 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
              activeFilter === "processing" ? "bg-primary-container text-white" : "bg-white border border-outline-variant text-secondary hover:bg-surface-container"
            }`}
          >
            Processing
          </button>
          <button 
            onClick={() => setActiveFilter("shipped")}
            className={`px-6 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
              activeFilter === "shipped" ? "bg-primary-container text-white" : "bg-white border border-outline-variant text-secondary hover:bg-surface-container"
            }`}
          >
            Shipped
          </button>
          <button 
            onClick={() => setActiveFilter("delivered")}
            className={`px-6 py-2 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
              activeFilter === "delivered" ? "bg-primary-container text-white" : "bg-white border border-outline-variant text-secondary hover:bg-surface-container"
            }`}
          >
            Delivered / Completed
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Orders Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filteredOrders.map((order) => {
              const firstItem = order.items?.[0];
              const { label, style } = getStatusLabelAndStyle(order.status);
              const orderDate = new Date(order.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div key={order._id} className="bg-white border border-gray-200 rounded-xl p-md flex flex-col gap-md transition-all hover:shadow-[0_10px_30px_rgba(27,109,36,0.05)] group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-label-xs text-label-xs text-secondary mb-1">ORDER ID</p>
                      <h3 className="font-headline-md text-sm font-bold text-on-surface">#KF-{order._id.slice(-6).toUpperCase()}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-label-xs text-[10px] font-bold uppercase tracking-wider ${style}`}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-md">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-surface-variant flex-shrink-0 bg-gray-50 flex items-center justify-center">
                      <img 
                        alt={firstItem?.name || "Product image"} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        src={firstItem?.image || "https://via.placeholder.com/100?text=Product"} 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-label-sm text-label-sm text-on-surface line-clamp-1">
                        {firstItem?.name || "Fresh produce"} 
                        {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                      </p>
                      <p className="font-body-md text-secondary text-xs">{orderDate}</p>
                      {order.farmerId && (
                        <p className="text-secondary text-[11px]">Farm: {order.farmerId.farmName}</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-md border-t border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-headline-md text-headline-md text-[#1B6D24]">₦{order.total.toLocaleString()}</p>
                      {order.status === "awaiting_transport_quote" && (
                        <p className="text-[10px] text-amber-700 font-semibold">Transport fare pending</p>
                      )}
                    </div>
                    <Link href={`/buyer/track-order?id=${order._id}`} className="text-primary font-label-sm text-label-sm flex items-center gap-1 hover:underline">
                      Details <span className="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Empty State / Add Placeholder */}
            <div className="border-2 border-dashed border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center gap-sm bg-surface-container-low/50 min-h-[220px]">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
              </div>
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface">Start a new order</h4>
                <p className="text-secondary text-xs mt-1">Browse our latest farm produce</p>
              </div>
              <Link href="/buyer/marketplace">
                <span className="mt-xs inline-block border border-primary text-primary px-4 py-1.5 rounded-lg font-label-xs text-label-xs hover:bg-primary hover:text-white transition-colors cursor-pointer">Go to Market</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { getFarmerOrderById } from "@/lib/kizfarm/supabase-data";
import { farmerAcceptOrder, farmerPackOrder, farmerRejectOrder } from "@/lib/kizfarm/supabase-mutations";

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
  driverId: {
    _id: string;
    name: string;
    phone: string;
    vehicleType?: string;
  } | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
  farmerNotes?: string;
  adminNotes?: string;
  cancellationReason?: string;
  deliveryAddress?: {
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
}

function timelineFor(status: string) {
  const steps = ["Order Placed", "Confirmed", "Packed", "Shipped", "Delivered"];
  const s = status?.toLowerCase();
  
  let activeIndex = 0;
  if (["delivered", "receipt_confirmed"].includes(s)) activeIndex = 4;
  else if (["assigned", "in_transit"].includes(s)) activeIndex = 3;
  else if (s === "packed") activeIndex = 2;
  else if (["accepted_by_farmer", "confirmed"].includes(s)) activeIndex = 1;
  else activeIndex = 0;

  return steps.map((label, index) => ({
    label,
    complete: index < activeIndex,
    current: index === activeIndex,
  }));
}

export default function FarmerOrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [acceptNotes, setAcceptNotes] = useState("");

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await getFarmerOrderById(id);
      if (!res.ok) {
        setError(payload?.error || "Order not found");
        return;
      }
      setOrder((payload.order as Order) ?? null);
    } catch (err) {
      console.error("Error fetching farmer order details:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchOrderDetails());
  }, [id]);

  const handleConfirmOrder = async () => {
    try {
      setActionLoading(true);
      const { res, payload } = await farmerAcceptOrder(id, acceptNotes || "Confirmed by farmer");
      if (!res.ok) {
        alert(payload?.error || "Failed to confirm order");
        return;
      }
      fetchOrderDetails();
    } catch (err) {
      console.error("Error confirming order:", err);
      alert("Failed to confirm order");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePackOrder = async () => {
    try {
      setActionLoading(true);
      const { res, payload } = await farmerPackOrder(id);
      if (!res.ok) {
        alert(payload?.error || "Failed to mark order as packed");
        return;
      }
      fetchOrderDetails();
    } catch (err) {
      console.error("Error packing order:", err);
      alert("Failed to pack order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!confirm("Are you sure you want to reject this order?")) return;
    try {
      setActionLoading(true);
      // Rejection cancels order
      const { res, payload } = await farmerRejectOrder(id, "Rejected by farmer");
      if (!res.ok) {
        alert(payload?.error || "Failed to reject order");
        return;
      }
      fetchOrderDetails();
    } catch (err) {
      console.error("Error rejecting order:", err);
      alert("Failed to reject order");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-error mb-4">error</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">Error Loading Order</h2>
        <p className="text-on-surface-variant mb-6">{error || "Could not retrieve order details."}</p>
        <Link href="/farmer/orders">
          <button className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold">Go to Dashboard</button>
        </Link>
      </div>
    );
  }

  const timeline = timelineFor(order.status);
  const status = order.status?.toLowerCase();
  const isPending = status === "pending";
  const isAccepted = status === "accepted_by_farmer";
  const isConfirmed = status === "confirmed";

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-16 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/farmer/orders"
            className="p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-900"
            aria-label="Back to orders"
          >
            <span className="material-symbols-outlined text-[#1B6D24]">
              arrow_back
            </span>
          </Link>
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              Order #KF-{order._id.slice(-6).toUpperCase()}
            </div>
            <div className="hidden sm:block text-xs text-zinc-500">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="px-4 py-1.5 rounded-lg bg-[#1B6D24]/10 text-[#1B6D24] text-sm font-bold capitalize">
          Status: {order.status}
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto w-full p-4 md:p-8 space-y-6">
        {/* Logistical Gatekeeping Prompt */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">gavel</span>
              Order Confirmation Required
            </h3>
            <p className="text-sm text-amber-800 mb-4 leading-relaxed">
              This order is currently pending. You must explicitly Accept the order to verify inventory availability 
              before advancing packed status, viewing delivery coordinates, or completing fulfillment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input 
                type="text" 
                placeholder="Add acceptance notes (optional)..."
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                className="w-full sm:max-w-md h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white text-black focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleConfirmOrder}
                  disabled={actionLoading}
                  className="px-6 h-10 bg-[#1B6D24] text-white font-bold rounded-lg hover:bg-primary transition-all active:scale-95 disabled:opacity-50 flex-1 sm:flex-initial"
                >
                  Accept Order
                </button>
                <button 
                  onClick={handleRejectOrder}
                  disabled={actionLoading}
                  className="px-6 h-10 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 flex-1 sm:flex-initial"
                >
                  Reject Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Packed Advance Actions */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-green-900 text-lg flex items-center gap-2">
              <span className="material-symbols-outlined">admin_panel_settings</span>
              Awaiting Admin Confirmation
            </h3>
            <p className="text-sm text-green-800 mt-1">You accepted this order. Packing is locked until admin confirms the order for the buyer.</p>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">inventory_2</span>
                Mark as Harvested & Packed
              </h3>
              <p className="text-sm text-blue-800 mt-1">Ready to ship? Update the status once items are packed and prepared at farm gate for courier pickup.</p>
            </div>
            <button 
              onClick={handlePackOrder}
              disabled={actionLoading}
              className="bg-[#1B6D24] text-white font-bold px-6 py-3 rounded-lg hover:bg-primary transition-all active:scale-95 duration-150 disabled:opacity-50 whitespace-nowrap"
            >
              Mark Packed & Ready
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Order #KF-{order._id.slice(-6).toUpperCase()}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isPending && (
              <button 
                onClick={handleRejectOrder}
                disabled={actionLoading}
                className="px-4 h-10 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 inline-flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">cancel</span>
                Reject Order
              </button>
            )}
            <button className="px-4 h-10 border border-zinc-200 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-50 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                support_agent
              </span>
              Support
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-950 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Subtotal Payout
                </p>
                <h2 className="text-2xl font-bold text-[#1B6D24]">
                  ₦{order.subtotal.toLocaleString()}
                </h2>
                <span className="inline-flex mt-2 bg-green-100 text-green-800 text-[11px] px-2 py-1 rounded-full font-bold">
                  Paid
                </span>
              </div>
              <div className="bg-white dark:bg-zinc-950 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Items
                </p>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {order.items.length} Product{order.items.length === 1 ? "" : "s"}
                </h2>
                <p className="text-zinc-400 text-sm mt-2">
                  Total Qty: {order.items.reduce((s, i) => s + i.quantity, 0)} units
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-950 p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <p className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Delivery Charge
                </p>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ₦{order.deliveryFee.toLocaleString()}
                </h2>
                <p className="text-zinc-400 text-sm mt-2">Status: {order.status}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-5 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Order Contents
                </h2>
                <span className="text-zinc-400 text-sm">
                  {order.items.length} Items Total
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="p-5 md:p-6 flex items-center gap-4 md:gap-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <img
                      alt={item.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800 bg-gray-50"
                      src={item.image || "https://via.placeholder.com/100?text=No+Image"}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-1">
                        {item.name}
                      </h3>
                      {item.unit && (
                        <p className="text-zinc-500 text-sm">
                          Unit: {item.unit}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-900 dark:text-zinc-50">
                        ₦{item.price.toLocaleString()}
                      </p>
                      <p className="text-zinc-500 text-sm">x {item.quantity}</p>
                      <p className="font-bold text-[#1B6D24] mt-1">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-5 md:p-6 flex flex-col items-end space-y-2">
                <div className="flex justify-between w-56 text-zinc-500 text-sm">
                  <span>Subtotal:</span>
                  <span>₦{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-56 text-zinc-500 text-sm">
                  <span>Logistics Fee:</span>
                  <span>₦{order.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-56 font-bold text-zinc-900 dark:text-zinc-50 text-lg pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span>Total:</span>
                  <span className="text-[#1B6D24]">₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            {/* Stakeholder Info */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  Buyer Information
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#1B6D24]">
                      person
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                      {order.buyerId?.name || "Anonymous Buyer"}
                    </h3>
                    <p className="text-sm text-zinc-500">{order.buyerId?.email || "No email"}</p>
                    <p className="text-sm text-zinc-500">{order.buyerId?.phone || "No phone"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery address & Courier Info */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  Logistics & Delivery Address
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-zinc-400 mt-1">
                    home
                  </span>
                  <div>
                    {order.deliveryAddress ? (
                      <>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                          {order.deliveryAddress.label || "Customer Shipping Address"}
                        </h3>
                        <p className="text-sm text-zinc-500">{order.deliveryAddress.street}</p>
                        <p className="text-sm text-zinc-500">
                          {order.deliveryAddress.city}, {order.deliveryAddress.state}
                        </p>
                        {order.deliveryAddress.phone && (
                          <p className="text-xs text-zinc-400 mt-1">Contact: {order.deliveryAddress.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">No delivery address attached.</p>
                    )}
                  </div>
                </div>
                
                {order.driverId && (
                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="material-symbols-outlined text-zinc-400">
                      local_shipping
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{order.driverId.name}</p>
                      <p className="text-xs text-zinc-500">
                        Phone: {order.driverId.phone} • Courier Assigned
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  Order Timeline
                </h2>
              </div>
              <div className="p-6">
                <div className="relative pl-8">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-zinc-100 dark:bg-zinc-800" />
                  {timeline.map((step, index) => (
                    <div
                      key={step.label}
                      className={`relative ${index === timeline.length - 1 ? "" : "mb-8"}`}
                    >
                      <div
                        className={`absolute -left-8 w-7 h-7 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm flex items-center justify-center ${
                          step.complete
                            ? "bg-[#1B6D24]"
                            : step.current
                              ? "bg-green-200"
                              : "bg-zinc-100 dark:bg-zinc-800"
                        }`}
                      >
                        {step.complete ? (
                          <span className="material-symbols-outlined text-white text-[14px]">
                            check
                          </span>
                        ) : step.current ? (
                          <div className="w-1.5 h-1.5 bg-[#1B6D24] rounded-full" />
                        ) : null}
                      </div>
                      <h3
                        className={`text-sm font-bold ${
                          step.current
                            ? "text-[#1B6D24]"
                            : step.complete
                              ? "text-zinc-900 dark:text-zinc-50"
                              : "text-zinc-400"
                        }`}
                      >
                        {step.label}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {step.current ? "Current status" : "Completed"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

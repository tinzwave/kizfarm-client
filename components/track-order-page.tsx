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
  farmerId?: {
    _id: string;
    farmName: string;
    location: string;
    phone?: string;
  };
  driverId?: {
    _id: string;
    name: string;
    phone: string;
    vehicleType?: string;
    currentLocation?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
  status: string;
  createdAt: string;
  adminNotes?: string;
  statusNotes?: { status: string; note: string; createdAt: string }[];
  farmerNotes?: string;
  cancellationReason?: string;
  driverRating?: number;
  driverRatedAt?: string;
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [driverRating, setDriverRating] = useState<number>(5);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Read order ID from URL query parameters client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setOrderId(params.get("id"));
    }
  }, []);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await apiFetch(`/buyer/orders/${id}`);
      if (!res.ok) {
        setError(payload?.error || "Order not found");
        return;
      }
      setOrder(payload.order);
      setRatingSubmitted(Boolean(payload.order?.driverRatedAt));
    } catch (err) {
      console.error("Error fetching order details:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const handleConfirmReceipt = async () => {
    if (!orderId) return;
    try {
      setConfirmingReceipt(true);
      const { res, payload } = await apiFetch(`/buyer/orders/${orderId}/confirm-receipt`, {
        method: "POST"
      });
      if (!res.ok) {
        alert(payload?.error || "Failed to confirm receipt");
        return;
      }
      // Reload order details
      await fetchOrderDetails(orderId);
    } catch (err) {
      console.error("Error confirming receipt:", err);
      alert("Failed to confirm receipt");
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleRateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setRatingLoading(true);
    try {
      if (!orderId) return;
      const { res, payload } = await apiFetch(`/buyer/orders/${orderId}/rate-driver`, {
        method: "POST",
        body: JSON.stringify({ rating: driverRating }),
      });
      if (!res.ok) {
        alert(payload?.error || "Failed to submit driver rating");
        return;
      }
      setRatingSubmitted(true);
      await fetchOrderDetails(orderId);
    } catch {
      alert("Failed to submit driver rating");
    } finally {
      setRatingLoading(false);
    }
  };

  const loadPaystackScript = () => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://js.paystack.co/v1/inline.js"]',
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(!!(window as any).PaystackPop), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.onload = () => resolve(!!(window as any).PaystackPop);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    if (!order || !orderId) return;
    setPaymentError(null);
    setPaying(true);
    const scriptLoaded = await loadPaystackScript();
    if (!scriptLoaded || !(window as any).PaystackPop) {
      setPaymentError("Failed to load payment gateway. Please check your internet connection.");
      setPaying(false);
      return;
    }

    try {
      const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_4815a51356e4576307137f8d75e8db5ce8eb473f";
      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email: "customer@kizfarm.com",
        amount: Math.round(order.total * 100),
        currency: "NGN",
        metadata: {
          brand: "KIZ FARM",
          orderId: order._id,
        },
        callback: function (response: any) {
          const method = order.paymentMethod === "bank_transfer" ? "bank_transfer" : order.paymentMethod === "mpesa" ? "mpesa" : "card";
          apiFetch(`/buyer/orders/${orderId}/pay`, {
              method: "POST",
              body: JSON.stringify({
                paymentReference: response.reference,
                paymentMethod: method,
              }),
            })
            .then(async ({ res, payload }) => {
            if (!res.ok) {
              setPaymentError(payload?.error || "Payment succeeded, but order activation failed. Please contact support.");
              setPaying(false);
              return;
            }
            await fetchOrderDetails(orderId);
            })
            .catch(() => {
              setPaymentError("Payment succeeded, but connection failed. Please contact support with your reference.");
            })
            .finally(() => {
              setPaying(false);
            });
        },
        onClose: () => {
          setPaying(false);
          setPaymentError("Payment was cancelled.");
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error("Paystack initialization error:", err);
      setPaymentError("Failed to initialize payment gateway. Please try again.");
      setPaying(false);
    }
  };

  if (!orderId) {
    return (
      <div className="min-h-screen bg-background p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-amber-500 mb-4">warning</span>
        <h2 className="text-xl font-bold text-on-surface mb-2">No Order ID Provided</h2>
        <p className="text-secondary mb-6">Please go back to your orders page to select an order.</p>
        <Link href="/buyer/orders">
          <button className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold">Go to My Orders</button>
        </Link>
      </div>
    );
  }

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
        <p className="text-secondary mb-6">{error || "Could not retrieve order details."}</p>
        <Link href="/buyer/orders">
          <button className="px-6 py-3 bg-[#1B6D24] text-white rounded-lg font-bold">Go to My Orders</button>
        </Link>
      </div>
    );
  }

  const status = order.status?.toLowerCase();
  const isCancelled = status === "cancelled";

  // Check which steps are completed/active based on status order
  const stepOrder = ["awaiting_transport_quote", "awaiting_payment", "pending", "accepted_by_farmer", "confirmed", "packed", "assigned", "in_transit", "delivered", "receipt_confirmed", "completed"];
  const currentStepIndex = stepOrder.indexOf(status);

  const isStepDone = (stepName: string) => {
    if (isCancelled) return false;
    const stepIdx = stepOrder.indexOf(stepName);
    return stepIdx !== -1 && currentStepIndex >= stepIdx;
  };

  const getStatusDisplay = (s: string) => {
    switch (s) {
      case "awaiting_transport_quote": return "Transport Review";
      case "awaiting_payment": return "Ready for Payment";
      case "pending": return "Placed";
      case "accepted_by_farmer": return "Accepted by Farmer";
      case "confirmed": return "Confirmed by Farmer";
      case "packed": return "Packed";
      case "assigned": return "Driver Assigned";
      case "in_transit": return "In Transit";
      case "delivered": return "Delivered";
      case "receipt_confirmed": return "Completed";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return s;
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/buyer/orders" className="cursor-pointer flex items-center">
            <img alt="KIZ FARM Logo" className="w-8 h-8 object-contain" src="/logo.jpeg" />
          </Link>
          <span className="font-inter antialiased text-sm font-medium text-xl font-extrabold tracking-tight text-[#1B6D24] dark:text-green-500">KIZ FARM</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/buyer/orders" className="text-sm font-semibold text-primary hover:underline">Back to Orders</Link>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-12 lg:py-xl">
        <div className="mb-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="font-headline-xl text-headline-xl text-primary mb-2">Track Your Harvest</h1>
              <p className="text-secondary font-body-md">
                Order #KF-{order._id.slice(-6).toUpperCase()} • Placed {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="bg-surface-container-low border border-gray-200 rounded-xl p-6 flex items-center gap-4 min-w-[300px]">
              <div className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCancelled ? "bg-red-400" : "bg-primary-container"}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isCancelled ? "bg-red-500" : "bg-[#1B6D24]"}`}></span>
              </div>
              <div>
                <p className="font-label-xs text-label-xs text-secondary uppercase">Live Status</p>
                <p className={`font-headline-md text-headline-md font-bold uppercase ${isCancelled ? "text-red-600" : "text-[#1B6D24]"}`}>
                  {getStatusDisplay(status)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transport Fare / Payment Gate */}
        {status === "awaiting_transport_quote" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">support_agent</span>
                Transport fare is being reviewed
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                Admin will contact you with the transport fare for moving these goods to your address. Payment will open once the fare is added.
              </p>
            </div>
            <span className="px-4 py-2 rounded-full bg-white border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              Awaiting Quote
            </span>
          </div>
        )}

        {status === "awaiting_payment" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-green-900 text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">payments</span>
                  Transport fare added
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Your order total now includes the transport fare. Complete payment to send the order to the farmer.
                </p>
                {paymentError && (
                  <p className="mt-3 text-sm font-semibold text-red-600">{paymentError}</p>
                )}
              </div>
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="bg-[#1B6D24] text-white font-bold px-6 py-3 rounded-xl hover:bg-primary transition-all active:scale-95 duration-150 flex items-center gap-2 disabled:opacity-60"
              >
                {paying ? "Processing..." : `Pay ₦${order.total.toLocaleString()}`}
                <span className="material-symbols-outlined">lock</span>
              </button>
            </div>
          </div>
        )}

        {/* Delivery Confirmation Gate */}
        {status === "delivered" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
            <div>
              <h3 className="font-bold text-green-900 text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">mark_as_unread</span>
                Have you received your order?
              </h3>
              <p className="text-sm text-green-700 mt-1">Please confirm that your produce was successfully delivered by the logistics driver.</p>
            </div>
            <button 
              onClick={handleConfirmReceipt}
              disabled={confirmingReceipt}
              className="bg-[#1B6D24] text-white font-bold px-6 py-3 rounded-xl hover:bg-primary transition-all active:scale-95 duration-150 flex items-center gap-2"
            >
              {confirmingReceipt ? "Processing..." : "Yes, Confirm Receipt"}
              <span className="material-symbols-outlined">thumb_up</span>
            </button>
          </div>
        )}

        {/* Driver Rating after receipt confirmation */}
        {["receipt_confirmed", "completed"].includes(status) && !ratingSubmitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 shadow-sm">
            <h3 className="font-bold text-blue-900 text-lg flex items-center gap-2">
              <span className="material-symbols-outlined">star</span>
              Rate Your Delivery Driver
            </h3>
            <p className="text-sm text-blue-700 mt-1">Help us maintain a premium logistics experience by rating {order.driverId?.name || "the driver"}.</p>
            <form onSubmit={handleRateDriver} className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    type="button"
                    onClick={() => setDriverRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: `'FILL' ${star <= driverRating ? 1 : 0}`, color: star <= driverRating ? '#F59E0B' : '#9CA3AF' }}>
                      star
                    </span>
                  </button>
                ))}
              </div>
              <button 
                type="submit" 
                disabled={ratingLoading}
                className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                {ratingLoading ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          </div>
        )}

        {["receipt_confirmed", "completed"].includes(status) && ratingSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 text-green-800 text-sm font-semibold flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-green-600">verified</span>
            Thank you! Your driver rating has been submitted successfully.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Timeline Section */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="font-headline-md text-headline-md mb-8">Delivery Progress</h2>
            
            {isCancelled ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-800">
                <p className="font-bold">This order was cancelled</p>
                {order.cancellationReason && (
                  <p className="text-sm mt-1">Reason: {order.cancellationReason}</p>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100"></div>

                {/* 1. Placed */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("pending") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("pending") ? "text-[#1B6D24]" : "text-gray-500"}`}>Order Placed</h3>
                    <p className="text-secondary text-xs">Awaiting farmer confirmation</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">Your order has been received by the Kiz Farm system.</p>
                  </div>
                </div>

                {/* 2. Confirmed by Farmer */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("confirmed") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("confirmed") ? "text-[#1B6D24]" : "text-gray-500"}`}>Confirmed by Farmer</h3>
                    <p className="text-secondary text-xs">Farmer accepted and scheduled harvest</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">
                      {order.adminNotes || `${order.farmerId?.farmName || "The farmer"} has confirmed your selection for harvest.`}
                    </p>
                  </div>
                </div>

                {/* 3. Packed */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("packed") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("packed") ? "text-[#1B6D24]" : "text-gray-500"}`}>Harvested & Packed</h3>
                    <p className="text-secondary text-xs">Ready for driver pickup</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">Produce was harvested and packed in sustainable bio-containers.</p>
                  </div>
                </div>

                {/* 4. Driver Assigned */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("assigned") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("assigned") ? "text-[#1B6D24]" : "text-gray-500"}`}>Courier Assigned</h3>
                    <p className="text-secondary text-xs">Logistic driver dispatched</p>
                    {order.driverId ? (
                      <p className="mt-1 text-on-surface-variant font-body-sm text-sm">
                        Driver {order.driverId.name} has been assigned to collect your harvest.
                      </p>
                    ) : (
                      <p className="mt-1 text-on-surface-variant font-body-sm text-sm">Awaiting driver assignment from dispatch centre.</p>
                    )}
                  </div>
                </div>

                {/* 5. In Transit */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("in_transit") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("in_transit") ? "text-[#1B6D24]" : "text-gray-500"}`}>In Transit</h3>
                    <p className="text-secondary text-xs">En route to delivery address</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">
                      Package is on the way.
                    </p>
                    {order.statusNotes?.filter((note) => note.status === "in_transit").map((note, index) => (
                      <p key={`${note.createdAt}-${index}`} className="mt-2 text-xs text-primary bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                        {new Date(note.createdAt).toLocaleString()}: {note.note}
                      </p>
                    ))}
                  </div>
                </div>

                {/* 6. Delivered */}
                <div className="relative flex gap-6 mb-8 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("delivered") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("delivered") ? "text-[#1B6D24]" : "text-gray-500"}`}>Delivered</h3>
                    <p className="text-secondary text-xs">Arrived at destination</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">Logistics driver has completed physical dropoff.</p>
                  </div>
                </div>

                {/* 7. Completed (Receipt Confirmed) */}
                <div className="relative flex gap-6 items-start">
                  <div className={`z-10 flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                    isStepDone("receipt_confirmed") ? "bg-[#1B6D24] text-white" : "bg-gray-100 text-gray-400"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-[16px] ${isStepDone("receipt_confirmed") ? "text-[#1B6D24]" : "text-gray-500"}`}>Receipt Confirmed</h3>
                    <p className="text-secondary text-xs">Closed order successfully</p>
                    <p className="mt-1 text-on-surface-variant font-body-sm text-sm">Buyer confirmed receipt of fresh produce.</p>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Right Column: Driver, Farmer, and Items Info */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Courier / Driver Info Card */}
            {order.driverId && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-gray-700">
                  Logistics Courier
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">person</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-on-surface font-semibold">{order.driverId.name}</p>
                      <p className="text-label-xs text-secondary capitalize">{order.driverId.vehicleType || "bike"} Driver</p>
                    </div>
                    <a href={`tel:${order.driverId.phone}`} className="ml-auto material-symbols-outlined text-primary p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 active:scale-95">
                      call
                    </a>
                  </div>
                  {order.driverId.currentLocation && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-secondary flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      <span>Last Seen: {order.driverId.currentLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Farmer Info Card */}
            {order.farmerId && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-gray-700">
                  Farmer details
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">agriculture</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-on-surface font-semibold">{order.farmerId.farmName}</p>
                      <p className="text-label-xs text-secondary">{order.farmerId.location}</p>
                    </div>
                    {order.farmerId.phone && (
                      <a href={`tel:${order.farmerId.phone}`} className="ml-auto material-symbols-outlined text-primary p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 active:scale-95">
                        call
                      </a>
                    )}
                  </div>
                  {order.farmerNotes && (
                    <div className="mt-4 p-3 bg-green-50/50 rounded-lg text-xs text-secondary italic">
                      " {order.farmerNotes} "
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Items Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-bold text-[18px] mb-4">Order Items Summary</h3>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4">
                    <img 
                      alt={item.name} 
                      className="w-14 h-14 rounded-lg object-cover bg-gray-100" 
                      src={item.image || "https://via.placeholder.com/100?text=Produce"} 
                    />
                    <div className="flex-1">
                      <p className="font-label-sm font-semibold">{item.name}</p>
                      <p className="text-label-xs text-secondary">
                        Qty: {item.quantity} {item.unit ? `• ${item.unit}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold text-sm">₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                
                <hr className="border-gray-100" />
                <div className="space-y-2 text-sm text-secondary">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-on-surface">₦{order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Fee</span>
                    <span className="text-on-surface">₦{(order.serviceFee || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transport Fare</span>
                    <span className="text-on-surface">
                      {order.deliveryFee > 0 ? `₦${order.deliveryFee.toLocaleString()}` : "Pending"}
                    </span>
                  </div>
                </div>
                
                <hr className="border-gray-100" />
                <div className="flex justify-between text-on-surface font-bold text-base">
                  <span>Total</span>
                  <span className="text-[#1B6D24]">₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </>
  );
}

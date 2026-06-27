"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/kizfarm/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  image?: string;
}

interface Driver {
  _id: string;
  name: string;
  phone: string;
  vehicleType: string;
  currentLocation: string | null;
  status: "active" | "busy" | "offline";
  activeOrdersCount?: number;
  averageRating?: number;
}

interface Order {
  _id: string;
  buyerId: { _id: string; name: string; email: string; phone: string } | null;
  farmerId: {
    _id: string;
    farmName: string;
    location?: string;
    phone?: string;
  } | null;
  driverId: Driver | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee?: number;
  total: number;
  paymentMethod: string;
  paymentReference: string | null;
  paymentStatus: string;
  deliveryAddress: {
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
  status: string;
  adminNotes: string | null;
  farmerNotes: string | null;
  confirmedAt: string | null;
  packedAt: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  receiptConfirmedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt?: string;
  masterOrderId?: string | null;
  subOrderIndex?: number;
  subOrderCount?: number;
  statusNotes?: { status: string; note: string; createdAt: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  awaiting_transport_quote: "Awaiting Transport Fare",
  awaiting_payment: "Awaiting Buyer Payment",
  pending: "Pending",
  accepted_by_farmer: "Accepted by Farmer",
  confirmed: "Confirmed by Farmer",
  packed: "Packed",
  assigned: "Driver Assigned",
  in_transit: "In Transit",
  delivered: "Delivered",
  receipt_confirmed: "Receipt Confirmed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_transport_quote: "bg-amber-50 text-amber-700 border-amber-200",
  awaiting_payment: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted_by_farmer: "bg-cyan-50 text-cyan-700 border-cyan-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-purple-50 text-purple-700 border-purple-200",
  assigned: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_transit: "bg-orange-50 text-orange-700 border-orange-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  receipt_confirmed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const TIMELINE_STEPS = [
  {
    key: "awaiting_transport_quote",
    label: "Transport Review",
    icon: "support_agent",
    dateKey: "createdAt",
  },
  {
    key: "awaiting_payment",
    label: "Fare Added",
    icon: "payments",
    dateKey: "updatedAt",
  },
  {
    key: "pending",
    label: "Order Placed",
    icon: "receipt_long",
    dateKey: "createdAt",
  },
  {
    key: "accepted_by_farmer",
    label: "Farmer Accepted",
    icon: "task_alt",
    dateKey: "acceptedAt",
  },
  {
    key: "confirmed",
    label: "Admin Confirmed",
    icon: "check_circle",
    dateKey: "confirmedAt",
  },
  { key: "packed", label: "Packed", icon: "inventory_2", dateKey: "packedAt" },
  {
    key: "assigned",
    label: "Driver Assigned",
    icon: "local_shipping",
    dateKey: "assignedAt",
  },
  {
    key: "in_transit",
    label: "In Transit",
    icon: "directions_car",
    dateKey: "pickedUpAt",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "home",
    dateKey: "deliveredAt",
  },
  {
    key: "receipt_confirmed",
    label: "Receipt Confirmed",
    icon: "handshake",
    dateKey: "receiptConfirmedAt",
  },
];

const STATUS_ORDER = [
  "awaiting_transport_quote",
  "awaiting_payment",
  "pending",
  "accepted_by_farmer",
  "confirmed",
  "packed",
  "assigned",
  "in_transit",
  "delivered",
  "receipt_confirmed",
  "cancelled",
];

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0 });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderControlPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Transport fare modal
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportFare, setTransportFare] = useState("");
  const [transportNote, setTransportNote] = useState("");
  const [savingTransportFare, setSavingTransportFare] = useState(false);
  const [transportError, setTransportError] = useState("");

  // Driver assignment modal
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState("");
  const [driverError, setDriverError] = useState("");

  // Cancellation guard state
  const [canCancelOrder, setCanCancelOrder] = useState(true);
  const [cancelCheckLoading, setCancelCheckLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      const { payload } = await apiFetch("/admin/orders");
      if (payload?.ok) setOrders(payload.orders ?? []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Select order (refresh detail) ──────────────────────────────────────────
  const selectOrder = useCallback(async (orderId: string) => {
    setLoadingDetail(true);
    setSelected(null);
    setCancelCheckLoading(true);
    try {
      const { payload } = await apiFetch(`/admin/orders/${orderId}`);
      if (payload?.ok) {
        setSelected(payload.order);
        
        // Check if order can be cancelled
        const { payload: cancelPayload } = await apiFetch(
          `/admin/orders/${orderId}/can-cancel`
        );
        if (cancelPayload?.ok) {
          setCanCancelOrder(cancelPayload.canCancel);
          setCancelReason(cancelPayload.reason || "");
        }
      }
    } finally {
      setLoadingDetail(false);
      setCancelCheckLoading(false);
    }
  }, []);

  // ── Status update ───────────────────────────────────────────────────────────
  function openStatusModal(status: string) {
    setPendingStatus(status);
    setStatusNote("");
    setStatusError("");
    setShowStatusModal(true);
  }

  async function submitStatusUpdate() {
    if (!selected) return;
    setUpdatingStatus(true);
    setStatusError("");
    try {
      const { res, payload } = await apiFetch(
        `/admin/orders/${selected._id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: pendingStatus,
            notes: statusNote || undefined,
          }),
        },
      );
      if (!res.ok) {
        setStatusError(payload?.error ?? "Failed to update.");
        return;
      }
      setShowStatusModal(false);
      // Refresh both list and detail
      await fetchOrders();
      await selectOrder(selected._id);
    } catch {
      setStatusError("Network error. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ── Driver assignment ───────────────────────────────────────────────────────
  function openTransportModal() {
    setTransportFare(selected?.deliveryFee ? String(selected.deliveryFee) : "");
    setTransportNote(selected?.adminNotes ?? "");
    setTransportError("");
    setShowTransportModal(true);
  }

  async function submitTransportFare() {
    if (!selected) return;
    const amount = Number(transportFare);
    if (!Number.isFinite(amount) || amount < 0) {
      setTransportError("Enter a valid transport fare.");
      return;
    }

    setSavingTransportFare(true);
    setTransportError("");
    try {
      const { res, payload } = await apiFetch(
        `/admin/orders/${selected._id}/transport-fare`,
        {
          method: "PATCH",
          body: JSON.stringify({
            transportFare: amount,
            notes: transportNote || undefined,
          }),
        },
      );
      if (!res.ok) {
        setTransportError(payload?.error ?? "Failed to save transport fare.");
        return;
      }
      setShowTransportModal(false);
      await fetchOrders();
      await selectOrder(selected._id);
    } catch {
      setTransportError("Network error. Please try again.");
    } finally {
      setSavingTransportFare(false);
    }
  }

  async function openDriverModal() {
    setDriverError("");
    setShowDriverModal(true);
    setLoadingDrivers(true);
    try {
      const { payload } = await apiFetch("/admin/drivers?status=active");
      if (payload?.ok) setDrivers(payload.drivers ?? []);
    } finally {
      setLoadingDrivers(false);
    }
  }

  async function assignDriver(driverId: string) {
    if (!selected) return;
    setAssigningDriver(driverId);
    setDriverError("");
    try {
      const { res, payload } = await apiFetch(
        `/admin/orders/${selected._id}/assign-driver`,
        {
          method: "POST",
          body: JSON.stringify({ driverId }),
        },
      );
      if (!res.ok) {
        setDriverError(payload?.error ?? "Assignment failed.");
        return;
      }
      setShowDriverModal(false);
      await fetchOrders();
      await selectOrder(selected._id);
    } catch {
      setDriverError("Network error.");
    } finally {
      setAssigningDriver("");
    }
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const buyerName = o.buyerId?.name?.toLowerCase() ?? "";
      const farmName = o.farmerId?.farmName?.toLowerCase() ?? "";
      const id = o._id.toLowerCase();
      if (!buyerName.includes(q) && !farmName.includes(q) && !id.includes(q))
        return false;
    }
    return true;
  });

  // ── Next actions for selected order ────────────────────────────────────────
  function getNextActions(
    o: Order,
  ): { label: string; status?: string; special?: string; danger?: boolean }[] {
    switch (o.status) {
      case "awaiting_transport_quote":
      case "awaiting_payment":
        return [
          { label: o.status === "awaiting_payment" ? "Update Transport Fare" : "Add Transport Fare", special: "transport_fare" },
          { label: "Cancel Order", status: "cancelled", danger: true },
        ];
      case "pending":
        return [{ label: "Cancel Order", status: "cancelled", danger: true }];
      case "accepted_by_farmer":
        return [
          { label: "Admin Confirm", status: "confirmed" },
          { label: "Cancel Order", status: "cancelled", danger: true },
        ];
      case "confirmed":
        return [{ label: "Cancel Order", status: "cancelled", danger: true }];
      case "packed":
        return [
          { label: "Assign Driver", special: "assign_driver" },
          { label: "Cancel Order", status: "cancelled", danger: true },
        ];
      case "assigned":
        return [
          { label: "Mark In Transit", status: "in_transit" },
          { label: "Cancel Order", status: "cancelled", danger: true },
        ];
      case "in_transit":
        return [{ label: "Mark Delivered", status: "delivered" }];
      case "delivered":
        return [
          { label: "Confirm Receipt (Manual)", status: "receipt_confirmed" },
        ];
      default:
        return [];
    }
  }

  const currentStepIndex = selected
    ? STATUS_ORDER.indexOf(selected.status)
    : -1;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-background text-on-surface"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Status Update Modal ── */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Update Status →{" "}
                <span className="text-green-800">
                  {STATUS_LABELS[pendingStatus] ?? pendingStatus}
                </span>
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {statusError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {statusError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin Note (optional)
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-800 outline-none resize-none"
                placeholder="Add a note for this status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
            {pendingStatus === "cancelled" && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm font-medium">
                ⚠️ This action will cancel the order. It cannot be undone.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitStatusUpdate}
                disabled={updatingStatus}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                  pendingStatus === "cancelled"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-800 text-white hover:bg-green-900"
                }`}
              >
                {updatingStatus ? "Updating…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Assignment Modal ── */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Add Transport Fare
              </h3>
              <button
                onClick={() => setShowTransportModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {transportError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {transportError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Transport Fare (NGN)
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-600 outline-none"
                placeholder="e.g. 5000"
                value={transportFare}
                onChange={(e) => setTransportFare(e.target.value)}
              />
              {selected && (
                <p className="mt-2 text-xs text-slate-500">
                  New total: {fmt(selected.subtotal + (selected.serviceFee || 0) + (Number(transportFare) || 0))}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Buyer Note (optional)
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-amber-600 outline-none resize-none"
                placeholder="Example: Transport fare includes delivery to the selected address."
                value={transportNote}
                onChange={(e) => setTransportNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTransportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitTransportFare}
                disabled={savingTransportFare}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 bg-amber-600 text-white hover:bg-amber-700"
              >
                {savingTransportFare ? "Saving..." : "Save Fare"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Assign Driver
              </h3>
              <button
                onClick={() => setShowDriverModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {driverError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {driverError}
              </div>
            )}
            <p className="text-sm text-slate-500 mb-4">
              Select an available driver to assign to this order:
            </p>
            <div className="flex-1 overflow-y-auto space-y-3">
              {loadingDrivers ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    autorenew
                  </span>
                  Loading drivers…
                </div>
              ) : drivers.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-2 block">
                    local_shipping
                  </span>
                  <p className="text-sm">
                    No active drivers available at this time.
                  </p>
                </div>
              ) : (
                drivers.map((d) => (
                  <div
                    key={d._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-green-800 text-base">
                          person
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {d.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.phone} · {d.vehicleType}
                        </p>
                        <p className="text-xs text-slate-400">
                          Workload: {d.activeOrdersCount ?? 0} active
                          {d.averageRating
                            ? ` · ${d.averageRating.toFixed(1)} stars`
                            : ""}
                        </p>
                        {d.currentLocation && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-xs text-red-400">
                              location_on
                            </span>
                            {d.currentLocation}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => assignDriver(d._id)}
                      disabled={assigningDriver === d._id}
                      className="px-4 py-1.5 bg-green-800 text-white text-sm font-semibold rounded-lg hover:bg-green-900 transition-colors disabled:opacity-60"
                    >
                      {assigningDriver === d._id ? "Assigning…" : "Assign"}
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowDriverModal(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="min-h-screen flex flex-col">
        {/* Top Navigation Bar */}
        <header className="flex justify-between items-center px-8 h-16 sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex items-center gap-4">
            <nav className="flex items-center space-x-2 text-slate-500 text-sm">
              <span className="font-semibold text-green-800">
                Orders Workspace
              </span>
            </nav>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={fetchOrders}
              className="text-slate-500 hover:text-green-800 transition-colors"
              title="Refresh"
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
            <div className="relative">
              <span
                className="material-symbols-outlined text-slate-500 cursor-pointer hover:text-green-800"
                data-icon="notifications"
              >
                notifications
              </span>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            <div className="flex items-center space-x-3 cursor-pointer pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface">KizFarm HQ</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  Admin
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-800 text-sm">
                  admin_panel_settings
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Two-Panel Layout ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left Panel: Orders List ── */}
          <div className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
            {/* Search + Filter */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                  search
                </span>
                <input
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-green-800 focus:border-green-800 outline-none"
                  placeholder="Search orders, buyers…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  "all",
                  "awaiting_transport_quote",
                  "awaiting_payment",
                  "pending",
                  "accepted_by_farmer",
                  "confirmed",
                  "packed",
                  "assigned",
                  "in_transit",
                  "delivered",
                  "cancelled",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                      statusFilter === s
                        ? "bg-green-800 text-white border-green-800"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {s === "all" ? "All" : STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {loadingList ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <span className="material-symbols-outlined animate-spin mr-2">
                    autorenew
                  </span>
                  Loading orders…
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-6 text-center">
                  <span className="material-symbols-outlined text-4xl mb-3">
                    shopping_cart
                  </span>
                  <p className="text-sm font-medium">No orders found.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() => selectOrder(order._id)}
                    className={`w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors ${
                      selected?._id === order._id
                        ? "bg-green-50 border-l-4 border-l-green-800"
                        : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        #{order._id.slice(-8).toUpperCase()}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[order.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {order.buyerId?.name ?? "Unknown Buyer"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {order.farmerId?.farmName ?? "Unknown Farm"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-green-800">
                        {fmt(order.total)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {fmtDate(order.createdAt).split(",")[0]}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Right Panel: Order Detail ── */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {loadingDetail ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <span className="material-symbols-outlined animate-spin mr-2">
                  autorenew
                </span>
                Loading order detail…
              </div>
            ) : !selected ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <span className="material-symbols-outlined text-5xl">
                  receipt_long
                </span>
                <p className="text-sm font-medium">
                  Select an order to view details
                </p>
              </div>
            ) : (
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Order{" "}
                      <span className="font-mono">
                        #{selected._id.slice(-8).toUpperCase()}
                      </span>
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                      Placed {fmtDate(selected.createdAt)}
                    </p>
                    {selected.masterOrderId && (
                      <p className="text-xs text-slate-400 mt-1">
                        Master #{selected.masterOrderId} · Sub-order{" "}
                        {selected.subOrderIndex ?? 1}/
                        {selected.subOrderCount ?? 1}
                      </p>
                    )}
                    <div className="mt-2">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[selected.status] ?? ""}`}
                      >
                        {STATUS_LABELS[selected.status] ?? selected.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                    {getNextActions(selected).map((action) => {
                      const isCancelDisabled = action.danger && !canCancelOrder;
                      return (
                        <div key={action.label} className="relative group">
                          <button
                            onClick={() => {
                              if (isCancelDisabled) return;
                              if (action.special === "assign_driver") {
                                openDriverModal();
                              } else if (action.special === "transport_fare") {
                                openTransportModal();
                              } else if (action.status) {
                                openStatusModal(action.status);
                              }
                            }}
                            disabled={isCancelDisabled}
                            title={isCancelDisabled ? cancelReason : undefined}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              isCancelDisabled
                                ? "border border-gray-300 text-gray-400 cursor-not-allowed opacity-50"
                                : action.danger
                                  ? "border border-red-300 text-red-600 hover:bg-red-50"
                                  : action.special === "assign_driver"
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : action.special === "transport_fare"
                                      ? "bg-amber-600 text-white hover:bg-amber-700"
                                    : "bg-green-800 text-white hover:bg-green-900"
                            }`}
                          >
                            {action.label}
                          </button>
                          {isCancelDisabled && (
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                              {cancelReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 metric cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Total Amount
                    </p>
                    <h3 className="text-2xl font-bold text-green-900">
                      {fmt(selected.total)}
                    </h3>
                    <span
                      className={`text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selected.paymentStatus === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {selected.paymentStatus}
                    </span>
                  </div>
                  <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Items
                    </p>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {selected.items.length} Product
                      {selected.items.length !== 1 ? "s" : ""}
                    </h3>
                    <p className="text-slate-400 text-xs mt-2">
                      {selected.paymentMethod}
                    </p>
                  </div>
                  <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Driver
                    </p>
                    {selected.driverId ? (
                      <>
                        <h3 className="text-sm font-bold text-slate-900">
                          {selected.driverId.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {selected.driverId.phone}
                        </p>
                      </>
                    ) : (
                      <h3 className="text-sm font-semibold text-slate-400">
                        Not Assigned
                      </h3>
                    )}
                  </div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Order Contents */}
                  <div className="col-span-8 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h4 className="font-semibold text-slate-900">
                          Order Contents
                        </h4>
                        <span className="text-slate-400 text-sm">
                          {selected.items.length} Items
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {selected.items.map((item, i) => (
                          <div
                            key={i}
                            className="p-5 flex items-center gap-5 hover:bg-slate-50 transition-colors"
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-green-400">
                                  local_florist
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <h5 className="font-semibold text-slate-900 text-sm">
                                {item.name}
                              </h5>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {item.unit ?? "unit"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-700 text-sm">
                                {fmt(item.price)}
                              </p>
                              <p className="text-slate-500 text-xs">
                                × {item.quantity}
                              </p>
                              <p className="font-bold text-green-800 text-sm mt-1">
                                {fmt(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-50 p-5 flex flex-col items-end space-y-1.5">
                        <div className="flex justify-between w-44 text-slate-500 text-sm">
                          <span>Subtotal:</span>
                          <span>{fmt(selected.subtotal)}</span>
                        </div>
                        <div className="flex justify-between w-44 text-slate-500 text-sm">
                          <span>Service:</span>
                          <span>{fmt(selected.serviceFee || 0)}</span>
                        </div>
                        <div className="flex justify-between w-44 text-slate-500 text-sm">
                          <span>Transport:</span>
                          <span>{fmt(selected.deliveryFee)}</span>
                        </div>
                        <div className="flex justify-between w-44 font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
                          <span>Total:</span>
                          <span className="text-green-800">
                            {fmt(selected.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {selected.adminNotes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-amber-600 text-base">
                            sticky_note_2
                          </span>
                          <h4 className="text-sm font-semibold text-amber-800">
                            Admin Note
                          </h4>
                        </div>
                        <p className="text-sm text-amber-700">
                          {selected.adminNotes}
                        </p>
                      </div>
                    )}
                    {selected.statusNotes &&
                      selected.statusNotes.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-green-800 text-base">
                              timeline
                            </span>
                            <h4 className="text-sm font-semibold text-slate-900">
                              Lifecycle Notes
                            </h4>
                          </div>
                          <div className="space-y-2">
                            {selected.statusNotes.map((note, index) => (
                              <div
                                key={`${note.createdAt}-${index}`}
                                className="text-xs text-slate-600 border-l-2 border-green-700 pl-3"
                              >
                                <span className="font-bold">
                                  {STATUS_LABELS[note.status] ?? note.status}
                                </span>{" "}
                                · {fmtDate(note.createdAt)}
                                <p className="mt-0.5">{note.note}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Sidebar Cards */}
                  <div className="col-span-4 space-y-4">
                    {/* Stakeholders */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Stakeholders
                        </h4>
                      </div>
                      <div className="p-5 space-y-5">
                        {/* Buyer */}
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-500 text-base">
                              person
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">
                              Buyer
                            </p>
                            <h5 className="font-semibold text-slate-900 text-sm">
                              {selected.buyerId?.name ?? "—"}
                            </h5>
                            <p className="text-xs text-slate-500">
                              {selected.buyerId?.email ?? ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {selected.buyerId?.phone ?? ""}
                            </p>
                          </div>
                        </div>
                        {/* Farmer */}
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-green-800 text-base">
                              agriculture
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase">
                              Producer
                            </p>
                            <h5 className="font-semibold text-slate-900 text-sm">
                              {selected.farmerId?.farmName ?? "—"}
                            </h5>
                            <p className="text-xs text-slate-500">
                              {selected.farmerId?.location ?? ""}
                            </p>
                            <p className="text-xs text-slate-500">
                              {selected.farmerId?.phone ?? ""}
                            </p>
                          </div>
                        </div>
                        {/* Driver */}
                        {selected.driverId && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-indigo-600 text-base">
                                local_shipping
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase">
                                Driver
                              </p>
                              <h5 className="font-semibold text-slate-900 text-sm">
                                {selected.driverId.name}
                              </h5>
                              <p className="text-xs text-slate-500">
                                {selected.driverId.phone}
                              </p>
                              <p className="text-xs text-slate-500">
                                {selected.driverId.vehicleType}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Delivery Address
                        </h4>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-slate-400 mt-0.5">
                            home
                          </span>
                          <div>
                            <h5 className="font-semibold text-slate-900 text-sm">
                              {selected.deliveryAddress.label ??
                                "Delivery Address"}
                            </h5>
                            <p className="text-sm text-slate-500">
                              {selected.deliveryAddress.street}
                            </p>
                            <p className="text-sm text-slate-500">
                              {[
                                selected.deliveryAddress.city,
                                selected.deliveryAddress.state,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {selected.deliveryAddress.phone && (
                              <p className="text-xs text-slate-400 mt-1">
                                {selected.deliveryAddress.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Order Timeline
                        </h4>
                      </div>
                      <div className="p-5">
                        <div className="relative pl-7">
                          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                          {TIMELINE_STEPS.map((step, idx) => {
                            const stepIdx = STATUS_ORDER.indexOf(step.key);
                            const isCancelled = selected.status === "cancelled";
                            const isDone =
                              !isCancelled && stepIdx <= currentStepIndex;
                            const isCurrent =
                              !isCancelled && step.key === selected.status;
                            const dateVal = (
                              selected as Record<string, unknown>
                            )[step.dateKey] as string | null;

                            return (
                              <div
                                key={step.key}
                                className={`relative mb-6 last:mb-0 ${isCurrent ? "" : ""}`}
                              >
                                <div
                                  className={`absolute -left-7 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                    isDone
                                      ? "bg-green-800"
                                      : isCurrent
                                        ? "bg-green-400 animate-pulse"
                                        : "bg-slate-100"
                                  }`}
                                >
                                  {isDone && (
                                    <span
                                      className="material-symbols-outlined text-white"
                                      style={{ fontSize: "12px" }}
                                    >
                                      check
                                    </span>
                                  )}
                                </div>
                                <h5
                                  className={`text-xs font-semibold ${isDone || isCurrent ? "text-slate-900" : "text-slate-400"}`}
                                >
                                  {step.label}
                                </h5>
                                <p className="text-[10px] text-slate-400">
                                  {step.key === "pending"
                                    ? fmtDate(selected.createdAt)
                                    : fmtDate(dateVal ?? null)}
                                </p>
                              </div>
                            );
                          })}
                          {/* Cancelled step */}
                          {selected.status === "cancelled" && (
                            <div className="relative mb-0">
                              <div className="absolute -left-7 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-red-500">
                                <span
                                  className="material-symbols-outlined text-white"
                                  style={{ fontSize: "12px" }}
                                >
                                  close
                                </span>
                              </div>
                              <h5 className="text-xs font-semibold text-red-600">
                                Cancelled
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                {fmtDate(selected.cancelledAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminEscrowById } from "@/lib/kizfarm/supabase-data";
import { releaseEscrowToFarmer, adminCancelOrder } from "@/lib/kizfarm/supabase-mutations";

interface OrderMetrics {
  _id: string;
  masterOrderId?: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    unit?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  createdAt: string;
  paymentStatus: string;
  escrowStatus: string;
  driverId?: string;
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
}

interface BuyerMetadata {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface FarmerMetadata {
  _id: string;
  fullName: string;
  farmName: string;
  location: string;
  farmAddress?: string;
  phone?: string;
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    branchCode?: string;
    isVerified?: boolean;
  };
}

interface Escrow {
  _id: string;
  orderId: OrderMetrics;
  amount: number;
  status: "pending" | "released" | "refunded" | "disputed";
  buyerId: BuyerMetadata;
  farmerId: FarmerMetadata;
  createdAt: string;
  releasedAt?: string;
  refundedAt?: string;
  releaseNotes?: string;
  refundReason?: string;
  releasedBy?: { name: string; email: string };
  refundedBy?: { name: string; email: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 border-yellow-200 text-yellow-800",
  released: "bg-green-50 border-green-200 text-green-800",
  refunded: "bg-red-50 border-red-200 text-red-800",
  disputed: "bg-purple-50 border-purple-200 text-purple-800",
};

const orderStatusColors: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  accepted_by_farmer: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  packed: "bg-orange-100 text-orange-700",
  assigned: "bg-orange-100 text-orange-700",
  in_transit: "bg-purple-100 text-purple-700",
  delivered: "bg-emerald-100 text-emerald-700",
  receipt_confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

const money = (value: number) => `₦${Number(value).toLocaleString()}`;

const normalizeStatus = (status?: string) =>
  (status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export default function EscrowDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const escrowId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (escrowId) {
      fetchEscrowDetail();
    } else {
      setError("Escrow ID is missing");
      setLoading(false);
    }
  }, [escrowId]);

  const fetchEscrowDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const { res, payload } = await getAdminEscrowById(escrowId!);
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load escrow details");
      }
      setEscrow(payload.escrow as Escrow);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load escrow details",
      );
      console.error("Fetch escrow detail failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseFunds = async () => {
    if (!escrow) return;
    setReleasing(true);
    setReleaseError(null);

    try {
      const { res, payload } = await releaseEscrowToFarmer(
        escrow._id,
        `Released by admin on ${new Date().toLocaleDateString()}`,
      );

      if (!res.ok) {
        setReleaseError(payload?.error || "Failed to release funds");
        return;
      }

      setSuccessMessage("Funds released successfully to farmer!");
      setTimeout(() => {
        fetchEscrowDetail();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      setReleaseError(
        err instanceof Error ? err.message : "Failed to release funds",
      );
      console.error("Release failed:", err);
    } finally {
      setReleasing(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!escrow?.orderId._id) return;
    setCancelling(true);

    try {
      const { res, payload } = await adminCancelOrder(
        escrow.orderId._id,
        cancellationReason || "Cancelled by admin",
      );

      if (!res.ok) {
        setReleaseError(payload?.error || "Failed to cancel order");
        return;
      }

      setShowCancelModal(false);
      setCancellationReason("");
      setSuccessMessage("Order cancelled and escrow refunded successfully!");
      setTimeout(() => {
        fetchEscrowDetail();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      setReleaseError(
        err instanceof Error ? err.message : "Failed to cancel order",
      );
      console.error("Cancel failed:", err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading escrow details...</p>
        </div>
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="mb-6 text-primary hover:underline flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">
              {error || "Escrow not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const orderStatus = normalizeStatus(escrow.orderId.status);
  const releaseReadyStatuses = ["receipt_confirmed", "completed"];
  const canRelease =
    releaseReadyStatuses.includes(orderStatus) &&
    escrow.status === "pending";
  const canCancel =
    !escrow.orderId.driverId &&
    escrow.status === "pending" &&
    !["delivered", "receipt_confirmed", "completed"].includes(orderStatus);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-primary hover:underline flex items-center gap-2"
          >
            ← Back to Escrow Management
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Escrow Detail</h1>
          <p className="text-gray-600 mt-2">
            Order:{" "}
            {escrow.orderId.masterOrderId ||
              escrow.orderId._id.slice(-8).toUpperCase()}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {releaseError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            ✗ {releaseError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Escrow Status */}
            <div
              className={`border rounded-lg p-6 ${statusColors[escrow.status]}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Escrow Status</h2>
                  <p className="text-sm opacity-75">
                    Transaction ID: {escrow._id.slice(-12).toUpperCase()}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full font-semibold text-lg capitalize ${
                    escrow.status === "pending"
                      ? "bg-yellow-200"
                      : escrow.status === "released"
                        ? "bg-green-200"
                        : "bg-gray-200"
                  }`}
                >
                  {escrow.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm opacity-75">Amount</p>
                  <p className="text-3xl font-bold">{money(escrow.amount)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">Created</p>
                  <p className="font-semibold">
                    {new Date(escrow.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Metrics */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Order Information
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-gray-600 text-sm">Order ID</p>
                  <p className="font-semibold text-gray-900">
                    {escrow.orderId.masterOrderId ||
                      escrow.orderId._id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p
                    className={`font-semibold px-2 py-1 rounded inline-block ${orderStatusColors[orderStatus] || "bg-gray-100"}`}
                  >
                    {orderStatus.replace(/_/g, " ").toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Payment Status</p>
                  <p className="font-semibold">
                    {escrow.orderId.paymentStatus.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Created</p>
                  <p className="font-semibold">
                    {new Date(escrow.orderId.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <p className="text-gray-600 text-sm font-semibold mb-3">
                  Items Ordered
                </p>
                <div className="space-y-2">
                  {escrow.orderId.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center py-2 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × {item.unit || "unit"}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>{money(escrow.orderId.subtotal)}</span>
                  </div>
                  {escrow.orderId.deliveryFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Delivery Fee</span>
                      <span>{money(escrow.orderId.deliveryFee)}</span>
                    </div>
                  )}
                  {escrow.orderId.serviceFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Service Fee</span>
                      <span>{money(escrow.orderId.serviceFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 bg-gray-50 p-2 rounded">
                    <span>Total</span>
                    <span>{money(escrow.orderId.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Buyer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="font-semibold text-gray-900">
                    {escrow.buyerId.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Email</p>
                  <p className="font-semibold text-gray-900 break-all">
                    {escrow.buyerId.email}
                  </p>
                </div>
                {escrow.buyerId.phone && (
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.buyerId.phone}
                    </p>
                  </div>
                )}
                {escrow.orderId.deliveryAddress && (
                  <div>
                    <p className="text-gray-600 text-sm">Delivery Address</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.orderId.deliveryAddress.street &&
                        `${escrow.orderId.deliveryAddress.street}, `}
                      {escrow.orderId.deliveryAddress.city &&
                        `${escrow.orderId.deliveryAddress.city}, `}
                      {escrow.orderId.deliveryAddress.state}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Farmer Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Farmer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Farmer Name</p>
                  <p className="font-semibold text-gray-900">
                    {escrow.farmerId.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Farm Name</p>
                  <p className="font-semibold text-gray-900">
                    {escrow.farmerId.farmName || "N/A"}
                  </p>
                </div>
                {escrow.farmerId.phone && (
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.farmerId.phone}
                    </p>
                  </div>
                )}
                {escrow.farmerId.location && (
                  <div>
                    <p className="text-gray-600 text-sm">Farm Location</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.farmerId.location}
                    </p>
                  </div>
                )}
                {escrow.farmerId.farmAddress && (
                  <div>
                    <p className="text-gray-600 text-sm">Farm Address</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {escrow.farmerId.farmAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            {escrow.farmerId.bankDetails?.accountNumber && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Bank Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Bank</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.farmerId.bankDetails.bankName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Holder</p>
                    <p className="font-semibold text-gray-900">
                      {escrow.farmerId.bankDetails.accountHolderName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Number</p>
                    <p className="font-semibold text-gray-900 font-mono">
                      {escrow.farmerId.bankDetails.accountNumber}
                    </p>
                  </div>
                  {escrow.farmerId.bankDetails.isVerified && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 text-green-700 text-xs font-medium">
                      ✓ Bank details verified
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>

              {/* Release Funds Button */}
              {canRelease ? (
                <button
                  onClick={handleReleaseFunds}
                  disabled={releasing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  {releasing ? "Releasing Funds..." : "Release Funds to Farmer"}
                </button>
              ) : escrow.status === "released" ? (
                <div className="w-full bg-green-100 border border-green-300 text-green-700 font-semibold py-3 px-4 rounded-lg text-center">
                  ✓ Funds have been released
                </div>
              ) : (
                <div className="w-full bg-gray-100 border border-gray-300 text-gray-600 font-semibold py-3 px-4 rounded-lg text-center text-sm">
                  {escrow.status === "refunded"
                    ? "Escrow was refunded"
                    : !releaseReadyStatuses.includes(orderStatus)
                      ? "Order must be completed first"
                      : "Cannot release funds"}
                </div>
              )}

              {/* Cancel Order Button */}
              {canCancel ? (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Cancel Order & Refund
                </button>
              ) : escrow.status === "refunded" ? (
                <div className="w-full bg-red-100 border border-red-300 text-red-700 font-semibold py-3 px-4 rounded-lg text-center text-sm">
                  ✓ Order was refunded
                </div>
              ) : (
                <div className="w-full bg-gray-100 border border-gray-300 text-gray-600 font-semibold py-3 px-4 rounded-lg text-center text-sm">
                  {escrow.orderId.driverId
                    ? "Cannot cancel - driver assigned"
                    : "Cannot cancel this order"}
                </div>
              )}
            </div>

            {/* Timeline */}
            {(escrow.releasedAt || escrow.refundedAt) && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                    <div>
                      <p className="font-semibold">Created</p>
                      <p className="text-gray-600">
                        {new Date(escrow.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {escrow.releasedAt && (
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold">Funds Released</p>
                        <p className="text-gray-600">
                          {new Date(escrow.releasedAt).toLocaleString()}
                        </p>
                        {escrow.releasedBy && (
                          <p className="text-gray-600 text-xs">
                            By: {escrow.releasedBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {escrow.refundedAt && (
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold">Refunded</p>
                        <p className="text-gray-600">
                          {new Date(escrow.refundedAt).toLocaleString()}
                        </p>
                        {escrow.refundReason && (
                          <p className="text-gray-600 text-xs">
                            Reason: {escrow.refundReason}
                          </p>
                        )}
                        {escrow.refundedBy && (
                          <p className="text-gray-600 text-xs">
                            By: {escrow.refundedBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Cancel Order & Issue Refund
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                This action will cancel the order and refund the buyer
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
                ⚠ The buyer will be refunded {money(escrow.amount)} to their
                account balance
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 font-medium"
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

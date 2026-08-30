// Port of buyer.mjs POST /orders/:id/pay. Called directly by the buyer's
// client after Paystack's checkout widget succeeds. Verifies the payment
// with Paystack itself (never trusts the client's say-so), then hands off
// to the pay_order RPC for the atomic state change.
import { callerClient, adminClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import {
  notifyEmail,
  sendBuyerPaymentSuccessfulEmail,
  sendFarmerNewPaidOrderEmail,
  sendAdminOrderPaidEmail,
} from "../_shared/mailer.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

async function verifyPaystackPayment(reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  if (!response.ok) {
    return { success: false, message: "Paystack API responded with an error status." };
  }
  const data = await response.json();
  if (data?.status && data?.data?.status === "success") {
    return { success: true, amount: data.data.amount / 100 };
  }
  return { success: false, message: data?.message || "Transaction verification failed on Paystack." };
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderId, paymentReference, paymentMethod } = await req.json();
    if (!orderId || !paymentReference) {
      return jsonResponse({ error: "orderId and paymentReference are required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    // RLS (orders_select) ensures this only returns a row if the caller is
    // the buyer, the owning farmer, or admin -- and buyer_id is checked
    // explicitly below anyway, so a farmer/admin viewing it can't pay it.
    const { data: order, error: orderErr } = await caller
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return jsonResponse({ error: "Order not found" }, { status: 404 });
    }
    if (order.buyer_id !== user.id) {
      return jsonResponse({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "awaiting_payment") {
      return jsonResponse({ error: "Order is not ready for payment." }, { status: 400 });
    }
    if (order.delivery_fee <= 0) {
      return jsonResponse({ error: "Transport fare has not been added yet." }, { status: 400 });
    }
    if (order.payment_status === "paid") {
      return jsonResponse({ error: "Order has already been paid." }, { status: 400 });
    }

    const verification = await verifyPaystackPayment(paymentReference);
    if (!verification.success) {
      return jsonResponse({ error: verification.message || "Payment verification failed." }, { status: 400 });
    }
    if (Math.abs(verification.amount! - order.total) > 10) {
      return jsonResponse(
        { error: `Payment amount mismatch. Expected: NGN${order.total}, Paid: NGN${verification.amount}` },
        { status: 400 },
      );
    }

    const admin = adminClient();
    const { data: updatedOrder, error: payErr } = await admin.rpc("pay_order", {
      p_order_id: orderId,
      p_payment_reference: paymentReference,
      p_payment_method: paymentMethod ?? null,
    });
    if (payErr) {
      return jsonResponse({ error: payErr.message }, { status: 500 });
    }

    const [{ data: buyer }, { data: farmer }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", updatedOrder.buyer_id).single(),
      admin.from("farmers").select("user_id, profiles:user_id(email)").eq("id", updatedOrder.farmer_id).single(),
    ]);

    if (buyer?.email) {
      notifyEmail("Buyer payment successful notification", sendBuyerPaymentSuccessfulEmail(updatedOrder, buyer.email));
    }
    // deno-lint-ignore no-explicit-any
    const farmerEmail = (farmer as any)?.profiles?.email;
    if (farmerEmail) {
      notifyEmail("Farmer new paid order notification", sendFarmerNewPaidOrderEmail(updatedOrder, farmerEmail));
    }
    notifyEmail("Admin order paid notification", sendAdminOrderPaidEmail(updatedOrder));

    return jsonResponse({ ok: true, order: updatedOrder });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

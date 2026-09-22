// Initiates an OPay Cashier checkout for a buyer's order. OPay's checkout
// is a hosted, redirect-based page rather than an inline widget like
// Paystack's, so unlike the old "open PaystackPop right in the browser"
// flow, creating the checkout has to happen server-side: it needs the
// merchant's public/private keys, which must never reach the browser. The
// client gets back only a one-time cashierUrl to redirect to.
// verify-and-pay-order finalizes the order once the buyer is redirected
// back.
import { callerClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { createOpayCheckout } from "../_shared/opay.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderId, returnUrl, cancelUrl } = await req.json();
    if (!orderId || !returnUrl) {
      return jsonResponse({ error: "orderId and returnUrl are required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    // Same ownership/state checks verify-and-pay-order does, run before we
    // ever talk to OPay. RLS (orders_select) also ensures this only
    // returns a row if the caller is the buyer, the owning farmer, or
    // admin -- buyer_id is checked explicitly below anyway.
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

    // OPay rejects references longer than 50 chars, and the full order UUID
    // alone is 36 -- nothing decodes the order id back out of this string
    // (unlike the course-payment reference), it's only ever matched back to
    // the order via payment_reference, so a short random suffix is enough.
    const reference = `KFM-PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Stash the reference before we ever contact OPay -- same reasoning as
    // the old client-side setOrderPaymentReference call: the webhook (or a
    // retried finalize call) needs something reliable to match against
    // even if it beats the buyer's own redirect back. Runs as the caller
    // (not the admin client) so RLS's buyer_id = auth.uid() check applies.
    const { error: refErr } = await caller.rpc("set_order_payment_reference", {
      p_order_id: orderId,
      p_reference: reference,
    });
    if (refErr) {
      return jsonResponse({ error: refErr.message }, { status: 400 });
    }

    const checkout = await createOpayCheckout({
      reference,
      amountKobo: Math.round(Number(order.total) * 100),
      returnUrl,
      cancelUrl: cancelUrl || returnUrl,
      callbackUrl: `${SUPABASE_URL}/functions/v1/opay-webhook`,
      productName: `KIZ FARM order ${orderId}`,
      productDescription: `Payment for KIZ FARM order ${orderId}`,
      userId: user.id,
      userEmail: user.email ?? undefined,
    });

    return jsonResponse({ ok: true, cashierUrl: checkout.cashierUrl });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
});

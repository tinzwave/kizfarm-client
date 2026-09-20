// Fires the "we got your order, transport fare review is in progress" email
// (buyer) and the "new transport fare request" email (admin) right after
// create_split_orders succeeds. create_split_orders is a plain RPC with no
// email side effect of its own -- this mirrors the pattern every other
// buyer-facing email in this app already uses: the client calls an Edge
// Function right after the mutation that changed the data succeeds.
//
// Best-effort, same as every other notifyEmail() call in this codebase: if
// the buyer's tab closes before this call lands, the confirmation email is
// missed, but the order itself is already saved (this function does no DB
// writes of its own). There's no payment-style webhook to fall back on
// here since nothing external calls back for a plain order placement.
import { callerClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { notifyEmail, sendBuyerTransportFareRequestedEmail, sendAdminTransportFareRequestEmail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderIds } = await req.json();
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return jsonResponse({ error: "orderIds is required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    // orders_select RLS already scopes this to rows the caller can see;
    // the buyer_id check below is the actual authorization (a farmer/admin
    // who happens to be able to see the order shouldn't be able to fire
    // this as them).
    const { data: orders, error: ordersErr } = await caller
      .from("orders")
      .select("*")
      .in("id", orderIds);

    if (ordersErr || !orders || orders.length === 0) {
      return jsonResponse({ error: "Order(s) not found" }, { status: 404 });
    }
    if (!orders.every((o) => o.buyer_id === user.id)) {
      return jsonResponse({ error: "Unauthorized" }, { status: 403 });
    }
    const masterOrderId = orders[0].master_order_id;
    if (masterOrderId && !orders.every((o) => o.master_order_id === masterOrderId)) {
      return jsonResponse({ error: "orderIds must belong to the same checkout." }, { status: 400 });
    }

    if (user.email) {
      notifyEmail("Buyer transport fare requested notification", sendBuyerTransportFareRequestedEmail(orders, user.email));
    }
    notifyEmail("Admin transport fare request notification", sendAdminTransportFareRequestEmail(orders));

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

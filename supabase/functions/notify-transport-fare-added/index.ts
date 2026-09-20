// Fires the "your transport fare is ready, come pay" email right after
// admin_set_transport_fare succeeds. Same reasoning as
// notify-transport-fare-requested: that RPC is a plain client-side call
// with no email side effect of its own.
import { callerClient, adminClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { notifyEmail, sendBuyerTransportFareAddedEmail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return jsonResponse({ error: "orderId is required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    // Independently verify admin here -- never trust that the client only
    // calls this after a real admin_set_transport_fare success.
    const { data: isAdmin } = await caller.rpc("is_admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Admin required" }, { status: 403 });
    }

    const admin = adminClient();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return jsonResponse({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "awaiting_payment" || !order.delivery_fee) {
      return jsonResponse({ error: "This order has no transport fare to notify about yet." }, { status: 400 });
    }

    const { data: buyer } = await admin.from("profiles").select("email").eq("id", order.buyer_id).single();
    if (buyer?.email) {
      notifyEmail("Buyer transport fare added notification", sendBuyerTransportFareAddedEmail(order, buyer.email));
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

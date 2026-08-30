// Port of public.mjs POST /paystack-webhook. Public endpoint (deployed
// with --no-verify-jwt) -- authenticated only by the HMAC-SHA512 signature
// Paystack sends, never by a Supabase session. Matches orders by
// payment_reference (set in advance by set_order_payment_reference before
// the buyer opens Paystack's checkout) rather than by order id, since
// Paystack only gives us back the reference.
//
// Course-subscription activation (the other charge.success consumer in
// the original code) is added here once purchase_course exists.
import { adminClient } from "../_shared/supabase-admin.ts";
import {
  notifyEmail,
  sendBuyerPaymentSuccessfulEmail,
  sendFarmerNewPaidOrderEmail,
  sendAdminOrderPaidEmail,
} from "../_shared/mailer.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("No signature header", { status: 401 });
    }

    const expected = await hmacSha512Hex(PAYSTACK_SECRET_KEY, rawBody);
    if (expected !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const reference = event.data?.reference;
      const admin = adminClient();

      const { data: orders } = await admin
        .from("orders")
        .select("id")
        .eq("payment_reference", reference)
        .neq("payment_status", "paid");

      for (const { id: orderId } of orders ?? []) {
        const { data: updatedOrder, error } = await admin.rpc("pay_order", {
          p_order_id: orderId,
          p_payment_reference: reference,
        });
        if (error) {
          console.error("Webhook pay_order error:", error.message);
          continue;
        }

        const [{ data: buyer }, { data: farmer }] = await Promise.all([
          admin.from("profiles").select("email").eq("id", updatedOrder.buyer_id).single(),
          admin.from("farmers").select("profiles:user_id(email)").eq("id", updatedOrder.farmer_id).single(),
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
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
});

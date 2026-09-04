// Port of public.mjs POST /paystack-webhook. Public endpoint (deployed
// with --no-verify-jwt) -- authenticated only by the HMAC-SHA512 signature
// Paystack sends, never by a Supabase session. Matches orders by
// payment_reference (set in advance by set_order_payment_reference before
// the buyer opens Paystack's checkout) rather than by order id, since
// Paystack only gives us back the reference.
//
// Course-subscription activation is a second charge.success branch below,
// keyed off the course_id/user_id the checkout page passes as Paystack
// transaction metadata (courses have no pre-staged reference row like
// orders get from set_order_payment_reference, so metadata is the only way
// the webhook can identify which purchase a bare reference belongs to).
import { adminClient } from "../_shared/supabase-admin.ts";
import {
  notifyEmail,
  sendBuyerPaymentSuccessfulEmail,
  sendFarmerNewPaidOrderEmail,
  sendAdminOrderPaidEmail,
  sendCoursePurchaseBuyerEmail,
  sendCourseSaleCreatorEmail,
  sendAdminCoursePurchaseEmail,
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

      const courseId = event.data?.metadata?.course_id;
      const userId = event.data?.metadata?.user_id;
      if (courseId && userId) {
        const { data: subscription, error: subErr } = await admin.rpc("activate_subscription", {
          p_user_id: userId,
          p_course_id: courseId,
          p_payment_reference: reference,
        });
        if (subErr) {
          console.error("Webhook activate_subscription error:", subErr.message);
        } else {
          const [{ data: buyer }, { data: course }] = await Promise.all([
            admin.from("profiles").select("email").eq("id", userId).single(),
            admin.from("courses").select("title, source, creator_id").eq("id", courseId).single(),
          ]);
          if (buyer?.email) {
            notifyEmail("Course purchase notification", sendCoursePurchaseBuyerEmail(course?.title ?? "", subscription.amount, buyer.email));
          }
          if (course?.source === "buyer" && course.creator_id) {
            const { data: creator } = await admin.from("profiles").select("email").eq("id", course.creator_id).single();
            if (creator?.email) {
              notifyEmail("Course sale notification", sendCourseSaleCreatorEmail(course.title, creator.email));
            }
          }
          notifyEmail("Admin course purchase notification", sendAdminCoursePurchaseEmail(course?.title ?? "", subscription.amount));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
});

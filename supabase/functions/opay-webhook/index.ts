// OPay equivalent of the old paystack-webhook. Public endpoint (deploy
// with --no-verify-jwt) -- authenticated only by OPay's own callback
// signature (the `sha512` field), never by a Supabase session. Matches
// orders by payment_reference (set in advance by
// create-opay-order-payment's call to set_order_payment_reference) rather
// than by order id, since OPay only gives us back the reference.
// See https://documentation.opaycheckout.com/payment-notifications-callbacks
// and .../callback-signature.
//
// Course-subscription activation is a second branch below. Courses have
// no pre-staged reference column like orders get, but create-opay-course-
// payment stages courseId/userId into course_payment_intents (via
// stage_course_payment_intent) against the same short reference before
// ever contacting OPay, so this fallback looks them up there instead of
// decoding them from the reference string.
import { adminClient } from "../_shared/supabase-admin.ts";
import { verifyOpayCallbackSignature } from "../_shared/opay.ts";
import {
  notifyEmail,
  sendBuyerPaymentSuccessfulEmail,
  sendFarmerNewPaidOrderEmail,
  sendAdminOrderPaidEmail,
  sendCoursePurchaseBuyerEmail,
  sendCourseSaleCreatorEmail,
  sendAdminCoursePurchaseEmail,
} from "../_shared/mailer.ts";

const COURSE_REF_PREFIX = "KFM-CRS-";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const payload = body?.payload;
    const receivedSha512 = body?.sha512;
    if (!payload || !receivedSha512) {
      return new Response("Malformed callback", { status: 400 });
    }

    const valid = verifyOpayCallbackSignature(
      {
        amount: String(payload.amount),
        currency: String(payload.currency),
        reference: String(payload.reference),
        refunded: Boolean(payload.refunded),
        status: String(payload.status),
        timestamp: String(payload.timestamp),
        token: String(payload.token),
        transactionId: String(payload.transactionId),
      },
      receivedSha512,
    );
    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    if (payload.status === "SUCCESS") {
      const reference = String(payload.reference);
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

      if (reference.startsWith(COURSE_REF_PREFIX)) {
        const { data: intent } = await admin
          .from("course_payment_intents")
          .select("course_id, user_id")
          .eq("reference", reference)
          .maybeSingle();
        const courseId = intent?.course_id;
        const userId = intent?.user_id;

        // Pre-check before calling activate_subscription, same pattern as
        // the orders branch above -- without it, this fires (and re-sends
        // all 3 emails) on almost every purchase, not just as a
        // crash-recovery fallback, since the webhook and the client's own
        // purchase-course call both fire for essentially every real
        // transaction. activate_subscription's own idempotency guard still
        // keeps the data safe even if both this check and the client's
        // call race each other.
        const { data: alreadyActivated } = courseId && userId
          ? await admin
              .from("subscriptions")
              .select("id")
              .eq("user_id", userId)
              .eq("course_id", courseId)
              .eq("payment_reference", reference)
              .eq("status", "active")
              .maybeSingle()
          : { data: null };

        if (courseId && userId && !alreadyActivated) {
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
    }

    // OPay retries unacknowledged callbacks for up to 72 hours -- always
    // ack with 200 once the signature checks out, even branches above that
    // logged an error, so a permanently-failing edge case doesn't get
    // hammered for three days straight.
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("OPay webhook error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
});

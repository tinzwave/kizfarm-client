// Flutterwave webhook. Public endpoint (deploy with --no-verify-jwt) --
// authenticated only by the `verif-hash` header matching FLW_SECRET_HASH,
// never by a Supabase session. Its URL is registered once in the
// Flutterwave dashboard (Settings > Webhooks), not per checkout. Matches
// orders by payment_reference (staged in advance by
// create-flutterwave-order-payment's call to set_order_payment_reference),
// since Flutterwave only gives us back the tx_ref.
// See https://developer.flutterwave.com/docs/webhooks.
//
// verif-hash is a static shared secret, not a per-message signature, so
// the webhook body itself is never trusted: every reference is re-checked
// with verifyFlutterwaveTransaction (status, currency, amount) before
// anything is marked paid.
//
// Course-subscription activation is a second branch below. Courses have
// no pre-staged reference column like orders get, but create-flutterwave-
// course-payment stages courseId/userId into course_payment_intents (via
// stage_course_payment_intent) against the same short reference before
// ever contacting Flutterwave, so this fallback looks them up there.
import { adminClient } from "../_shared/supabase-admin.ts";
import { verifyFlutterwaveTransaction, verifyFlutterwaveWebhook } from "../_shared/flutterwave.ts";
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
    if (!verifyFlutterwaveWebhook(req.headers.get("verif-hash"))) {
      return new Response("Invalid signature", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const event = body?.event;
    const data = body?.data;
    // Anything other than a successful charge (transfers, failed charges,
    // etc.) falls through to the 200 ack below and is ignored.
    if (event === "charge.completed" && data?.status === "successful" && data?.tx_ref) {
      const reference = String(data.tx_ref);
      const admin = adminClient();

      // Source of truth -- the webhook body only tells us which reference
      // to go check.
      const verification = await verifyFlutterwaveTransaction(reference);
      if (!verification.success) {
        console.error("Webhook verification failed:", reference, verification.message);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
      const paidAmount = verification.amount!;

      const { data: orders } = await admin
        .from("orders")
        .select("id, total")
        .eq("payment_reference", reference)
        .neq("payment_status", "paid");

      for (const { id: orderId, total } of orders ?? []) {
        if (Math.abs(paidAmount - Number(total)) > 10) {
          console.error(`Webhook amount mismatch for order ${orderId}: expected NGN${total}, paid NGN${paidAmount}`);
          continue;
        }
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

        const { data: pricedCourse } = courseId
          ? await admin.from("courses").select("price, final_price, source").eq("id", courseId).single()
          : { data: null };
        const expectedCourseAmount = pricedCourse
          ? pricedCourse.source === "buyer" ? Number(pricedCourse.final_price ?? pricedCourse.price) : Number(pricedCourse.price)
          : NaN;
        const amountOk = Math.abs(paidAmount - expectedCourseAmount) <= 10;
        if (pricedCourse && !amountOk) {
          console.error(`Webhook amount mismatch for course ${courseId}: expected NGN${expectedCourseAmount}, paid NGN${paidAmount}`);
        }

        if (courseId && userId && !alreadyActivated && amountOk) {
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

    // Flutterwave retries webhooks that don't get a 200 -- always ack once
    // the verif-hash checks out, even for branches above that logged an
    // error, so a permanently-failing edge case doesn't get retried
    // forever.
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Flutterwave webhook error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
});

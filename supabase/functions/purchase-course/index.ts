// Port of learning.mjs POST /subscriptions. Same shape as
// verify-and-pay-order: verify with Paystack directly, never trust the
// client, then hand off to the activate_subscription RPC.
import { callerClient, adminClient } from "../_shared/supabase-admin.ts";
import {
  notifyEmail,
  sendCoursePurchaseBuyerEmail,
  sendCourseSaleCreatorEmail,
  sendAdminCoursePurchaseEmail,
} from "../_shared/mailer.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

async function verifyPaystackPayment(reference: string) {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  if (!response.ok) return { success: false, message: "Paystack API responded with an error status." };
  const data = await response.json();
  if (data?.status && data?.data?.status === "success") {
    return { success: true, amount: data.data.amount / 100 };
  }
  return { success: false, message: data?.message || "Transaction verification failed on Paystack." };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { courseId, paymentReference } = await req.json();
    if (!courseId || !paymentReference) {
      return new Response(JSON.stringify({ error: "courseId and paymentReference are required." }), { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: course, error: courseErr } = await caller
      .from("courses")
      .select("id, title, price, final_price, source, creator_id, is_published")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) {
      return new Response(JSON.stringify({ error: "Course not found" }), { status: 404 });
    }
    if (!course.is_published) {
      return new Response(JSON.stringify({ error: "Course is not available for purchase" }), { status: 400 });
    }
    if (course.source === "buyer" && course.creator_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot subscribe to a course you created" }), { status: 400 });
    }

    const payableAmount = course.source === "buyer" ? Number(course.final_price ?? course.price) : Number(course.price);

    const verification = await verifyPaystackPayment(paymentReference);
    if (!verification.success) {
      return new Response(JSON.stringify({ error: verification.message || "Payment verification failed." }), { status: 400 });
    }
    if (Math.abs(verification.amount! - payableAmount) > 10) {
      return new Response(
        JSON.stringify({ error: `Payment amount mismatch. Expected: NGN${payableAmount}, Paid: NGN${verification.amount}` }),
        { status: 400 },
      );
    }

    const admin = adminClient();
    const { data: subscription, error: subErr } = await admin.rpc("activate_subscription", {
      p_user_id: user.id,
      p_course_id: courseId,
      p_payment_reference: paymentReference,
    });
    if (subErr) {
      return new Response(JSON.stringify({ error: subErr.message }), { status: 500 });
    }

    const buyerEmail = user.email;
    if (buyerEmail) {
      notifyEmail("Course purchase notification", sendCoursePurchaseBuyerEmail(course.title, subscription.amount, buyerEmail));
    }
    if (course.source === "buyer" && course.creator_id) {
      const { data: creator } = await admin.from("profiles").select("email").eq("id", course.creator_id).single();
      if (creator?.email) {
        notifyEmail("Course sale notification", sendCourseSaleCreatorEmail(course.title, creator.email));
      }
    }
    notifyEmail("Admin course purchase notification", sendAdminCoursePurchaseEmail(course.title, subscription.amount));

    return new Response(JSON.stringify({ ok: true, subscription }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
});

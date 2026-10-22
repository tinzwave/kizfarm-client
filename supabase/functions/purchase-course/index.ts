// Port of learning.mjs POST /subscriptions. Same shape as
// verify-and-pay-order: verify with Flutterwave directly, never trust the
// client, then hand off to the activate_subscription RPC.
//
// paymentReference here is the reference create-flutterwave-course-payment
// generated and round-tripped through the returnUrl (?ref=...) -- courses
// have no pre-staged reference column the way orders do, so this is the
// only way the client can hand it back. verifyFlutterwaveTransaction
// independently confirms it with Flutterwave before anything is activated.
import { callerClient, adminClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { verifyFlutterwaveTransaction } from "../_shared/flutterwave.ts";
import { activateCourseSubscription } from "../_shared/course-notifications.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { courseId, paymentReference } = await req.json();
    if (!courseId || !paymentReference) {
      return jsonResponse({ error: "courseId and paymentReference are required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: course, error: courseErr } = await caller
      .from("courses")
      .select("id, title, price, final_price, source, creator_id, is_published")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) {
      return jsonResponse({ error: "Course not found" }, { status: 404 });
    }
    if (!course.is_published) {
      return jsonResponse({ error: "Course is not available for purchase" }, { status: 400 });
    }
    if (course.source === "buyer" && course.creator_id === user.id) {
      return jsonResponse({ error: "You cannot subscribe to a course you created" }, { status: 400 });
    }

    const payableAmount = course.source === "buyer" ? Number(course.final_price ?? course.price) : Number(course.price);
    const admin = adminClient();

    // The reference must be one create-flutterwave-course-payment staged
    // for this same buyer and course. Without this, a payment made for a
    // cheaper course (or by someone else) could be replayed to unlock a
    // different one.
    const { data: intent } = await admin
      .from("course_payment_intents")
      .select("user_id, course_id")
      .eq("reference", paymentReference)
      .maybeSingle();
    if (!intent || intent.user_id !== user.id || intent.course_id !== courseId) {
      return jsonResponse({ error: "This payment reference does not belong to this course." }, { status: 400 });
    }

    // The webhook may already have activated it -- succeed without
    // re-sending the purchase emails.
    const { data: activated } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("payment_reference", paymentReference)
      .eq("status", "active")
      .maybeSingle();
    if (activated) {
      return jsonResponse({ ok: true, subscription: activated });
    }

    const verification = await verifyFlutterwaveTransaction(paymentReference);
    if (!verification.success) {
      // Bank transfer / USSD payments sit in "pending" for a while. Not an
      // error: the client keeps checking, and the webhook activates the
      // course once Flutterwave confirms it.
      if (verification.status === "pending") {
        return jsonResponse({ ok: false, pending: true, error: "Payment is still being confirmed." }, { status: 202 });
      }
      return jsonResponse({ error: verification.message || "Payment verification failed." }, { status: 400 });
    }
    // Overpaying is harmless; anything short of the price is rejected
    // (0.5 allows for kobo rounding only).
    if (verification.amount! + 0.5 < payableAmount) {
      return jsonResponse(
        { error: `Payment amount mismatch. Expected: NGN${payableAmount}, Paid: NGN${verification.amount}` },
        { status: 400 },
      );
    }

    const { subscription, error: subErr } = await activateCourseSubscription(admin, {
      userId: user.id,
      courseId,
      reference: paymentReference,
    });
    if (subErr) {
      return jsonResponse({ error: subErr.message }, { status: 500 });
    }

    return jsonResponse({ ok: true, subscription });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

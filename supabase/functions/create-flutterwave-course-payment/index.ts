// Initiates a Flutterwave Standard checkout for a course subscription.
// Same redirect-based reasoning as create-flutterwave-order-payment.
//
// Courses have no pre-staged reference column the way orders get one from
// set_order_payment_reference -- stage_course_payment_intent (see
// course_payment_intents) fills the same role: courseId/userId are staged
// against a short reference before Flutterwave is ever contacted.
// purchase-course gets the reference back via the returnUrl (?ref=...);
// the flutterwave-webhook fallback looks it up in course_payment_intents.
import { callerClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { createFlutterwaveCheckout } from "../_shared/flutterwave.ts";
import { courseDate } from "../_shared/mailer.ts";

// Keep in step with course_renewal_window_days() (0046).
const RENEWAL_WINDOW_DAYS = 3;

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { courseId, returnUrl } = await req.json();
    if (!courseId || !returnUrl) {
      return jsonResponse({ error: "courseId and returnUrl are required." }, { status: 400 });
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

    // Access lasts 30 days. Renewing opens in the last 3 days (the new 30
    // days are added on top) and stays open after expiry; before that, a
    // second checkout would only charge the buyer for access they already
    // have.
    const { data: existing } = await caller
      .from("subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();
    const renewalOpensAt = existing
      ? new Date(existing.expires_at).getTime() - RENEWAL_WINDOW_DAYS * 86_400_000
      : 0;
    if (existing && Date.now() < renewalOpensAt) {
      return jsonResponse(
        {
          error: `You already have access to this course until ${courseDate(existing.expires_at)}. You can renew from ${courseDate(new Date(renewalOpensAt))}.`,
        },
        { status: 409 },
      );
    }

    const payableAmount = course.source === "buyer" ? Number(course.final_price ?? course.price) : Number(course.price);
    const reference = `KFM-CRS-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const { error: stageErr } = await caller.rpc("stage_course_payment_intent", {
      p_reference: reference,
      p_course_id: courseId,
    });
    if (stageErr) {
      return jsonResponse({ error: stageErr.message }, { status: 400 });
    }

    const separator = returnUrl.includes("?") ? "&" : "?";
    const returnUrlWithRef = `${returnUrl}${separator}ref=${encodeURIComponent(reference)}`;

    const checkout = await createFlutterwaveCheckout({
      reference,
      amountNaira: payableAmount,
      redirectUrl: returnUrlWithRef,
      title: "KIZ FARM",
      description: `KIZ FARM course subscription: ${course.title}`,
      customerEmail: user.email ?? "",
    });

    return jsonResponse({ ok: true, checkoutUrl: checkout.link });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
});

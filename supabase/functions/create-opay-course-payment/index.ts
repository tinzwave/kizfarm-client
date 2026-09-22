// Initiates an OPay Cashier checkout for a course subscription. Same
// redirect-based reasoning as create-opay-order-payment.
//
// Courses have no pre-staged reference column the way orders get one from
// set_order_payment_reference -- stage_course_payment_intent (see
// course_payment_intents) fills the same role: courseId/userId are staged
// against a short reference before OPay is ever contacted, since OPay
// rejects references over 50 chars and the raw UUIDs alone don't fit.
// purchase-course gets the reference back via the returnUrl (?ref=...);
// the opay-webhook fallback looks it up in course_payment_intents.
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
    const { courseId, returnUrl, cancelUrl } = await req.json();
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

    const checkout = await createOpayCheckout({
      reference,
      amountKobo: Math.round(payableAmount * 100),
      returnUrl: returnUrlWithRef,
      cancelUrl: cancelUrl || returnUrlWithRef,
      callbackUrl: `${SUPABASE_URL}/functions/v1/opay-webhook`,
      productName: course.title,
      productDescription: `KIZ FARM course subscription: ${course.title}`,
      userId: user.id,
      userEmail: user.email ?? undefined,
    });

    return jsonResponse({ ok: true, cashierUrl: checkout.cashierUrl });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
});

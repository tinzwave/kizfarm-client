// Course activation shared by purchase-course (client return) and the
// flutterwave-webhook fallback, so both send the same three emails.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  notifyEmail,
  sendAdminCoursePurchaseEmail,
  sendCoursePurchaseBuyerEmail,
  sendCourseSaleCreatorEmail,
} from "./mailer.ts";

export async function activateCourseSubscription(
  admin: SupabaseClient,
  { userId, courseId, reference }: { userId: string; courseId: string; reference: string },
) {
  // Read before activating: a row that already exists means this payment
  // is a renewal, which changes the wording of every email.
  const { data: previous } = await admin
    .from("subscriptions")
    .select("id, payment_reference")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  const { data: subscription, error } = await admin.rpc("activate_subscription", {
    p_user_id: userId,
    p_course_id: courseId,
    p_payment_reference: reference,
  });
  if (error) return { error };

  // Same reference as before means the other path (client/webhook) already
  // activated it and sent the emails.
  if (previous?.payment_reference !== reference) {
    notifyEmail(
      "Course purchase notifications",
      sendCoursePurchaseNotifications(admin, { userId, courseId, subscription, renewed: !!previous }),
    );
  }
  return { subscription };
}

async function sendCoursePurchaseNotifications(
  admin: SupabaseClient,
  { userId, courseId, subscription, renewed }: {
    userId: string;
    courseId: string;
    // deno-lint-ignore no-explicit-any
    subscription: any;
    renewed: boolean;
  },
) {
  const [{ data: course }, { data: buyer }] = await Promise.all([
    admin.from("courses").select("id, title, source, price, final_price, creator_id").eq("id", courseId).single(),
    admin.from("profiles").select("name, email, role").eq("id", userId).single(),
  ]);
  if (!course) throw new Error(`Course ${courseId} not found for purchase emails`);

  const community = course.source === "buyer";
  // subscription.amount can include an earlier, still-unreleased payment
  // (see activate_subscription), so the amount for *this* payment is the
  // course price.
  const amountPaid = Number(community ? (course.final_price ?? course.price) : course.price);

  const [{ data: creator }, { count: activeSubscribers }] = community && course.creator_id
    ? await Promise.all([
        admin.from("profiles").select("name, email, role").eq("id", course.creator_id).single(),
        admin
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString()),
      ])
    : [{ data: null }, { count: 0 }];

  const sends: Promise<unknown>[] = [];
  if (buyer?.email) {
    sends.push(sendCoursePurchaseBuyerEmail({
      to: buyer.email,
      name: buyer.name,
      role: buyer.role,
      course,
      subscription,
      amountPaid,
      renewed,
    }));
  }
  if (creator?.email) {
    sends.push(sendCourseSaleCreatorEmail({
      to: creator.email,
      name: creator.name,
      role: creator.role,
      course,
      subscriberName: buyer?.name || "A KIZ FARM member",
      earning: Number(course.price),
      activeSubscribers: activeSubscribers ?? 0,
      renewed,
    }));
  }
  sends.push(sendAdminCoursePurchaseEmail({
    course,
    buyer: { name: buyer?.name, email: buyer?.email },
    creatorName: creator?.name,
    subscription,
    amountPaid,
    renewed,
  }));

  const results = await Promise.allSettled(sends);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) {
    throw new Error(failed.map((r) => r.reason?.message || String(r.reason)).join("; "));
  }
}

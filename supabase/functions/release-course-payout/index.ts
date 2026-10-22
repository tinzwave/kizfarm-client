// Admin releases a course creator's payout, then the creator (and the
// admin team) are emailed. The release itself stays in the
// release_course_payout RPC, called with the admin's own session so its
// is_admin() check applies exactly as before; this function only adds the
// emails, which a database function can't send.
import { adminClient, callerClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import {
  notifyEmail,
  sendAdminCoursePayoutReleasedEmail,
  sendCoursePayoutReleasedCreatorEmail,
} from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { subscriptionId } = await req.json().catch(() => ({}));
    if (!subscriptionId) {
      return jsonResponse({ error: "subscriptionId is required." }, { status: 400 });
    }

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscription, error } = await caller.rpc("release_course_payout", {
      p_subscription_id: subscriptionId,
    });
    if (error) {
      const status = error.code === "42501" ? 403 : 400;
      return jsonResponse({ error: error.message }, { status });
    }

    notifyEmail("Course payout released notifications", sendReleaseEmails(subscriptionId, user.id));

    return jsonResponse({ ok: true, subscription });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

async function sendReleaseEmails(subscriptionId: string, adminId: string) {
  const admin = adminClient();
  // The ledger row holds the amount actually credited by this release.
  const [{ data: ledger }, { data: sub }, { data: releasedBy }] = await Promise.all([
    admin
      .from("course_payout_ledger")
      .select("amount")
      .eq("subscription_id", subscriptionId)
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select("user_id, courses(title, creator_id)")
      .eq("id", subscriptionId)
      .single(),
    admin.from("profiles").select("name, email").eq("id", adminId).single(),
  ]);
  // deno-lint-ignore no-explicit-any
  const course = (sub as any)?.courses as { title: string; creator_id: string } | null;
  if (!sub || !course?.creator_id) throw new Error(`Subscription ${subscriptionId} not found for payout emails`);

  const [{ data: creator }, { data: subscriber }] = await Promise.all([
    admin
      .from("profiles")
      .select("name, email, role, bank_name, account_number")
      .eq("id", course.creator_id)
      .single(),
    admin.from("profiles").select("name").eq("id", sub.user_id).single(),
  ]);

  const amount = Number(ledger?.amount ?? 0);
  const subscriberName = subscriber?.name || "A KIZ FARM member";
  const sends: Promise<unknown>[] = [
    sendAdminCoursePayoutReleasedEmail({
      courseTitle: course.title,
      amount,
      creator: { name: creator?.name, email: creator?.email },
      subscriberName,
      releasedBy: releasedBy?.name || releasedBy?.email,
    }),
  ];
  if (creator?.email) {
    sends.push(sendCoursePayoutReleasedCreatorEmail({
      to: creator.email,
      name: creator.name,
      role: creator.role,
      courseTitle: course.title,
      amount,
      subscriberName,
      bank: { bankName: creator.bank_name, accountNumber: creator.account_number },
    }));
  }

  const results = await Promise.allSettled(sends);
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length) throw new Error(failed.map((r) => r.reason?.message || String(r.reason)).join("; "));
}

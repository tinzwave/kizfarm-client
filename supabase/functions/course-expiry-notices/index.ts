// Daily course-access emails: "ends in N days" (within the renewal
// window) and "access ended". Called only by the course-expiry-notices
// pg_cron job (0046) with the x-cron-secret header. Deploy with
// --no-verify-jwt: the shared secret is the authentication.
//
// claim_course_expiry_notices marks the rows (and creates the in-app
// notifications) before returning them, so a rerun never emails anyone
// twice.
import { adminClient } from "../_shared/supabase-admin.ts";
import { sendCourseExpiredEmail, sendCourseExpiringSoonEmail } from "../_shared/mailer.ts";

const COURSE_CRON_SECRET = Deno.env.get("COURSE_CRON_SECRET") ?? "";

function timingSafeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (!COURSE_CRON_SECRET || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

type Notice = { subscriptionId: string; userId: string; courseId: string; expiresAt: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!timingSafeEqual(req.headers.get("x-cron-secret") ?? "", COURSE_CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const admin = adminClient();
    const { data, error } = await admin.rpc("claim_course_expiry_notices");
    if (error) throw error;
    const reminders = (data?.reminders ?? []) as Notice[];
    const expired = (data?.expired ?? []) as Notice[];
    const all = [...reminders, ...expired];
    if (all.length === 0) return Response.json({ ok: true, reminders: 0, expired: 0 });

    const userIds = [...new Set(all.map((n) => n.userId))];
    const courseIds = [...new Set(all.map((n) => n.courseId))];
    const [{ data: users }, { data: courses }] = await Promise.all([
      admin.from("profiles").select("id, name, email, role").in("id", userIds),
      admin.from("courses").select("id, title, source").in("id", courseIds),
    ]);
    const userById = new Map((users ?? []).map((u) => [u.id, u]));
    const courseById = new Map((courses ?? []).map((c) => [c.id, c]));

    const send = (notice: Notice, kind: "reminder" | "expired") => {
      const user = userById.get(notice.userId);
      const course = courseById.get(notice.courseId);
      if (!user?.email || !course) return Promise.resolve();
      const params = { to: user.email, name: user.name, role: user.role, course, expiresAt: notice.expiresAt };
      return kind === "reminder" ? sendCourseExpiringSoonEmail(params) : sendCourseExpiredEmail(params);
    };

    const results = await Promise.allSettled([
      ...reminders.map((n) => send(n, "reminder")),
      ...expired.map((n) => send(n, "expired")),
    ]);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    for (const f of failed) console.error("[email] course expiry notice:", f.reason?.message || f.reason);

    return Response.json({ ok: true, reminders: reminders.length, expired: expired.length, failed: failed.length });
  } catch (err) {
    console.error("course-expiry-notices error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
});

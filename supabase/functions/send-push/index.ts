// Delivers a stored notification to the user's phones via the Expo Push
// Service (which hands it to FCM on Android / APNs on iOS), so it shows
// even when the app is closed.
//
// Called only by the notifications_forward_push database trigger (pg_net)
// with { notification_id } and the x-push-secret header. Deploy with
// --no-verify-jwt: the shared secret is the authentication, and the
// notification itself is re-read here with the service role -- the
// request body is never trusted for content or recipients.
import { adminClient } from "../_shared/supabase-admin.ts";

const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function timingSafeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (!PUSH_WEBHOOK_SECRET || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!timingSafeEqual(req.headers.get("x-push-secret") ?? "", PUSH_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { notification_id } = await req.json().catch(() => ({}));
    if (!notification_id) return new Response("Bad request", { status: 400 });

    const admin = adminClient();
    const { data: n } = await admin.from("notifications").select("*").eq("id", notification_id).maybeSingle();
    if (!n || n.read_at) return Response.json({ ok: true, skipped: true });

    const { data: tokens } = await admin.from("push_tokens").select("token").eq("user_id", n.user_id);
    if (!tokens?.length) return Response.json({ ok: true, sent: 0 });

    const messages = tokens.map(({ token }) => ({
      to: token,
      title: n.title,
      body: n.body ?? undefined,
      sound: "default",
      priority: "high",
      channelId: "default",
      data: { notificationId: n.id, linkType: n.link_type, linkId: n.link_id },
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const result = await res.json().catch(() => null);

    // Forget phones that uninstalled the app / revoked permission.
    const dead: string[] = [];
    (result?.data || []).forEach((ticket: any, i: number) => {
      if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") dead.push(messages[i].to);
      else if (ticket?.status === "error") console.error("push error:", ticket.message);
    });
    if (dead.length) await admin.from("push_tokens").delete().in("token", dead);

    return Response.json({ ok: true, sent: messages.length - dead.length, removed: dead.length });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response("Server error", { status: 500 });
  }
});

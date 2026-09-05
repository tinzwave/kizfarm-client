// Admin-initiated outbound email: single recipient, a custom pasted list,
// or every approved+active farmer / every active buyer. Unlike the other
// Edge Functions in this project, this one is admin-only, so it gates on
// is_admin() via the caller's own JWT-carrying client before touching
// anything with the service-role client.
import { callerClient, adminClient } from "../_shared/supabase-admin.ts";
import { handleCorsPreflight, jsonResponse } from "../_shared/cors.ts";
import { sendBulkEmail, layout, escapeHtml } from "../_shared/mailer.ts";

// Edge Functions run under a wall-clock execution limit. At ~1 Resend batch
// call per 100 recipients this comfortably completes synchronously for this
// marketplace's realistic farmer/buyer counts. This cap exists so a much
// larger future audience fails loudly with a clear message instead of
// silently timing out mid-send -- it is not a real capacity number. If
// audience sizes are ever expected to reach into the thousands, sending
// needs to become async/queued instead of inline in the request/response
// cycle.
const MAX_RECIPIENTS = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AudienceType = "single" | "all_farmers" | "all_buyers" | "custom_list";

function dedupeEmails(list: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const raw of list) {
    const email = (raw || "").trim().toLowerCase();
    if (email && EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { audienceType, singleEmail, customEmails, subject, body } = await req.json();

    const caller = callerClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: isAdmin } = await caller.rpc("is_admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Admin required" }, { status: 403 });
    }

    if (!subject?.trim() || !body?.trim()) {
      return jsonResponse({ error: "Subject and body are required." }, { status: 400 });
    }
    const validAudiences: AudienceType[] = ["single", "all_farmers", "all_buyers", "custom_list"];
    if (!validAudiences.includes(audienceType)) {
      return jsonResponse({ error: "Invalid audience type." }, { status: 400 });
    }

    const admin = adminClient();
    let recipients: string[] = [];

    if (audienceType === "single") {
      recipients = dedupeEmails([singleEmail]);
    } else if (audienceType === "custom_list") {
      const raw = Array.isArray(customEmails) ? customEmails : String(customEmails || "").split(/[\n,;]+/);
      recipients = dedupeEmails(raw);
    } else if (audienceType === "all_farmers") {
      // farmers.status is the KYC/listing state; profiles.status is account
      // standing. Suspension (0025_enforce_suspension) only ever touches
      // profiles.status, so an approved farmer can still be a suspended
      // account -- both checks are required to exclude them from a
      // broadcast.
      const { data, error } = await admin
        .from("farmers")
        .select("profiles!user_id(email, status)")
        .eq("status", "approved");
      if (error) return jsonResponse({ error: error.message }, { status: 500 });
      // deno-lint-ignore no-explicit-any
      const active = (data || []).filter((f: any) => f.profiles?.status === "active");
      // deno-lint-ignore no-explicit-any
      recipients = dedupeEmails(active.map((f: any) => f.profiles?.email));
    } else {
      const { data, error } = await admin.from("profiles").select("email").eq("role", "user").eq("status", "active");
      if (error) return jsonResponse({ error: error.message }, { status: 500 });
      // deno-lint-ignore no-explicit-any
      recipients = dedupeEmails((data || []).map((p: any) => p.email));
    }

    if (recipients.length === 0) {
      return jsonResponse({ error: "No valid recipients found for this audience." }, { status: 400 });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return jsonResponse(
        { error: `This audience has ${recipients.length} recipients, above the ${MAX_RECIPIENTS} synchronous send limit. Narrow the audience.` },
        { status: 400 },
      );
    }

    const { data: campaign, error: campaignErr } = await admin
      .from("admin_email_campaigns")
      .insert({ subject, body, audience_type: audienceType, recipient_count: recipients.length, sent_by: user.id })
      .select()
      .single();
    if (campaignErr) return jsonResponse({ error: campaignErr.message }, { status: 500 });

    const html = layout(subject, `<div style="white-space:pre-wrap">${escapeHtml(body)}</div>`);
    const results = await sendBulkEmail(recipients, subject, html);
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.length - sentCount;

    await admin.from("admin_email_recipients").insert(
      results.map((r) => ({ campaign_id: campaign.id, email: r.email, status: r.status, error: r.error ?? null })),
    );
    await admin
      .from("admin_email_campaigns")
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        status: failedCount === 0 ? "sent" : sentCount === 0 ? "failed" : "partial",
      })
      .eq("id", campaign.id);

    return jsonResponse({ ok: true, campaignId: campaign.id, recipientCount: recipients.length, sentCount, failedCount });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Server error" }, { status: 500 });
  }
});

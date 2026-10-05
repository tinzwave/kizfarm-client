// Port of src/lib/mailer.mjs from kizfarm-server — only the templates
// needed so far are included; more are added as each RPC/Edge Function
// chunk of the migration needs them.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
// Optional: a real, monitored inbox for replies. Mail from a bare
// noreply@ address with nowhere to reply scores worse with spam filters.
const REPLY_TO_EMAIL = Deno.env.get("REPLY_TO_EMAIL");
const SENDER_NAME = "KIZ FARM";

// Gives the From header a display name ("KIZ FARM <noreply@kizfarm.com>")
// unless FROM_EMAIL already carries one -- a bare address with no name is
// a small but real spam signal.
function fromHeader(): string {
  const from = FROM_EMAIL ?? "";
  return from.includes("<") ? from : `${SENDER_NAME} <${from}>`;
}

// Plain-text alternative generated from the HTML body. HTML-only mail is
// one of the more common reasons transactional email lands in spam.
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<(br|\/p|\/h[1-6]|\/div|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, i, all) => line || (i > 0 && all[i - 1]))
    .join("\n")
    .trim();
}

function emailPayload(to: string | string[], subject: string, html: string) {
  return {
    from: fromHeader(),
    to,
    subject,
    html,
    text: htmlToText(html),
    ...(REPLY_TO_EMAIL ? { reply_to: REPLY_TO_EMAIL } : {}),
  };
}
const ADMIN_NOTIFICATION_EMAILS = (
  Deno.env.get("ADMIN_NOTIFICATION_EMAILS") ||
  Deno.env.get("ADMIN_DEMO_EMAIL") ||
  ""
)
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function money(amount: number | null | undefined): string {
  return `NGN ${Number(amount || 0).toLocaleString("en-NG")}`;
}

export function orderRef(order: { master_order_id?: string | null; id?: string }): string {
  return order?.master_order_id || `KF-${String(order?.id || "").slice(-6).toUpperCase()}`;
}

// A complete HTML document (doctype, lang, charset, title) rather than a
// bare <div> fragment -- malformed/fragment HTML is scored as spammy. The
// footer says why the recipient is getting this, which filters also like.
export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc">
<div style="max-width:560px;margin:0 auto;padding:24px;background:#ffffff;font-family:Arial,sans-serif;color:#1f2937;line-height:1.55">
<h2 style="color:#166534;margin:0 0 16px">${escapeHtml(title)}</h2>
${body}
<p style="margin-top:24px;color:#64748b;font-size:13px">KIZ FARM</p>
<p style="color:#94a3b8;font-size:12px">You are receiving this email because of activity on your KIZ FARM account.</p>
</div>
</body>
</html>`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | (string | null | undefined)[];
  subject: string;
  html: string;
}) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean) as string[];
  if (recipients.length === 0) return { skipped: true, reason: "No recipient" };
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.warn("[email] Missing RESEND_API_KEY/FROM_EMAIL. Skipping:", subject);
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailPayload(recipients, subject, html)),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Email send failed (${response.status}): ${text}`);
  }
  return response.json().catch(() => ({ ok: true }));
}

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_CHUNK_SIZE = 100;

export type BulkSendResult = { email: string; status: "sent" | "failed"; error?: string };

// Sends the same subject/html to many independent recipients without ever
// putting more than one address in a single `to` field -- Resend's normal
// multi-recipient `to` array exposes every recipient's address to every
// other recipient on that same call, which is unacceptable for an admin
// broadcast to farmers/buyers. The batch endpoint accepts up to 100
// independent single-recipient emails per HTTP call; this chunks
// accordingly and treats each chunk as pass/fail atomically, since Resend
// doesn't give a reliable per-address error within a batch response.
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
): Promise<BulkSendResult[]> {
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.warn("[email] Missing RESEND_API_KEY/FROM_EMAIL. Skipping bulk send:", subject);
    return recipients.map((email) => ({ email, status: "failed" as const, error: "Email not configured" }));
  }

  const results: BulkSendResult[] = [];
  for (let i = 0; i < recipients.length; i += BATCH_CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_CHUNK_SIZE);
    try {
      const response = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(chunk.map((to) => emailPayload(to, subject, html))),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const error = `Batch send failed (${response.status}): ${text}`.slice(0, 500);
        for (const email of chunk) results.push({ email, status: "failed", error });
        continue;
      }

      for (const email of chunk) results.push({ email, status: "sent" });
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      for (const email of chunk) results.push({ email, status: "failed", error: message });
    }
  }
  return results;
}

// Fire-and-forget, matching the original's non-blocking notifyEmail — kept
// alive past the response via EdgeRuntime.waitUntil where available.
export function notifyEmail(label: string, promise: Promise<unknown>) {
  const tracked = promise.catch((err) => console.error(`[email] ${label}:`, err?.message || err));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(tracked);
}

export function adminEmails(): string[] {
  return ADMIN_NOTIFICATION_EMAILS;
}

export function sendBuyerPaymentSuccessfulEmail(order: any, buyerEmail: string) {
  return sendEmail({
    to: buyerEmail,
    subject: `KIZ FARM: payment received for order ${orderRef(order)}`,
    html: layout(
      "Payment received",
      `
        <p>Your payment for order <strong>${escapeHtml(orderRef(order))}</strong> was successful.</p>
        <p>The farmer has been notified and will accept or reject the order.</p>
        <p>Total paid: <strong>${money(order.total)}</strong></p>
      `,
    ),
  });
}

export function sendFarmerNewPaidOrderEmail(order: any, farmerEmail: string) {
  return sendEmail({
    to: farmerEmail,
    subject: `KIZ FARM: new paid order ${orderRef(order)}`,
    html: layout(
      "New paid order",
      `
        <p>You have a new paid order <strong>${escapeHtml(orderRef(order))}</strong>.</p>
        <p>Please open your farmer orders page to accept or reject it.</p>
      `,
    ),
  });
}

export function sendAdminOrderPaidEmail(order: any) {
  return sendEmail({
    to: adminEmails(),
    subject: `KIZ FARM: order ${orderRef(order)} paid, awaiting farmer`,
    html: layout(
      "Order paid",
      `
        <p>Order <strong>${escapeHtml(orderRef(order))}</strong> has been paid.</p>
        <p>Total: <strong>${money(order.total)}</strong></p>
        <p>The farmer should now accept or reject the order.</p>
      `,
    ),
  });
}

export function sendCoursePurchaseBuyerEmail(courseTitle: string, amount: number, buyerEmail: string) {
  return sendEmail({
    to: buyerEmail,
    subject: `KIZ FARM: you now have access to ${courseTitle}`,
    html: layout(
      "Course purchase successful",
      `<p>You now have access to <strong>${escapeHtml(courseTitle)}</strong>.</p><p>Amount paid: <strong>${money(amount)}</strong></p>`,
    ),
  });
}

export function sendCourseSaleCreatorEmail(courseTitle: string, creatorEmail: string) {
  return sendEmail({
    to: creatorEmail,
    subject: `KIZ FARM: new sale of your course ${courseTitle}`,
    html: layout(
      "New course sale",
      `<p>Your course <strong>${escapeHtml(courseTitle)}</strong> was purchased.</p><p>Your payout is pending admin release.</p>`,
    ),
  });
}

export function sendAdminCoursePurchaseEmail(courseTitle: string, amount: number) {
  return sendEmail({
    to: adminEmails(),
    subject: `KIZ FARM: new course purchase (${courseTitle})`,
    html: layout(
      "New course purchase",
      `<p><strong>${escapeHtml(courseTitle)}</strong> was purchased for ${money(amount)}.</p>`,
    ),
  });
}

// `orders` is every sub-order from one checkout (create_split_orders returns
// one row per farmer in the cart, all sharing master_order_id) -- summarized
// into a single email rather than one per sub-order, so a multi-farmer
// checkout doesn't spam the buyer.
export function sendBuyerTransportFareRequestedEmail(orders: any[], buyerEmail: string) {
  const ref = orderRef(orders[0]);
  const subtotal = orders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const splitNote = orders.length > 1 ? ` (split across ${orders.length} farmers)` : "";
  return sendEmail({
    to: buyerEmail,
    subject: "We've received your order — transport fare review in progress",
    html: layout(
      "Transport fare request received",
      `
        <p>Thanks for your order <strong>${escapeHtml(ref)}</strong>${splitNote}.</p>
        <p>Subtotal: <strong>${money(subtotal)}</strong></p>
        <p>Our team will review your goods and delivery address, then get back to you with the transport fare <strong>within 60 minutes during working hours</strong>.</p>
        <p>You'll get another email (and an update in the app) the moment the fare is added, so you can complete payment.</p>
      `,
    ),
  });
}

export function sendAdminTransportFareRequestEmail(orders: any[]) {
  const ref = orderRef(orders[0]);
  const splitNote = orders.length > 1 ? ` (${orders.length} sub-orders)` : "";
  return sendEmail({
    to: adminEmails(),
    subject: `New transport fare request — ${ref}`,
    html: layout(
      "Transport fare request",
      `
        <p>Order <strong>${escapeHtml(ref)}</strong>${splitNote} is awaiting a transport fare.</p>
        <p>The buyer has been told to expect it within 60 minutes during working hours — please add it from the order control page.</p>
      `,
    ),
  });
}

export function sendBuyerTransportFareAddedEmail(order: any, buyerEmail: string) {
  return sendEmail({
    to: buyerEmail,
    subject: "Your transport fare is ready — complete your payment",
    html: layout(
      "Transport fare added",
      `
        <p>The transport fare for your order <strong>${escapeHtml(orderRef(order))}</strong> has been added.</p>
        <p>Transport fare: <strong>${money(order.delivery_fee)}</strong></p>
        <p>New total: <strong>${money(order.total)}</strong></p>
        <p>Open your order to complete payment.</p>
      `,
    ),
  });
}

// Port of src/lib/mailer.mjs from kizfarm-server — only the templates
// needed so far are included; more are added as each RPC/Edge Function
// chunk of the migration needs them.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
// Optional: a real, monitored inbox for replies. Mail from a bare
// noreply@ address with nowhere to reply scores worse with spam filters.
const REPLY_TO_EMAIL = Deno.env.get("REPLY_TO_EMAIL");
const SENDER_NAME = "KIZ FARM";
// Public web app address, for buttons that take the reader straight to the
// order/page the email is about.
const SITE_URL = (Deno.env.get("SITE_URL") || "https://www.kizfarm.com").replace(/\/+$/, "");

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
    // Keep link targets in the plain-text part: "Complete payment: https://..."
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${label.replace(/<[^>]+>/g, "").trim()}: ${href}`)
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

// Email-client-safe call-to-action button (a single-cell table renders
// consistently in Gmail/Outlook/Apple Mail, unlike a styled <a> alone).
export function actionButton(path: string, label: string): string {
  const href = `${SITE_URL}${path}`;
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0">
      <tr><td style="border-radius:8px;background:#166534">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

const buyerOrderPath = (order: { id?: string }) => `/buyer/track-order?id=${encodeURIComponent(String(order?.id || ""))}`;
const farmerOrderPath = (order: { id?: string }) => `/farmer/orders/${encodeURIComponent(String(order?.id || ""))}`;

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
        ${actionButton(buyerOrderPath(order), "Track your order")}
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
        <p>Please accept or reject it as soon as possible.</p>
        ${actionButton(farmerOrderPath(order), "View order")}
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

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export function courseDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

// Buyers browse courses at /buyer/courses, farmers at /learning/my-courses;
// links land them back on the list they actually use.
export function courseListPath(role: string | null | undefined, tab?: string): string {
  const base = role === "farmer" ? "/learning/my-courses" : "/buyer/courses";
  return tab ? `${base}?tab=${tab}` : base;
}

export function coursePath(course: { id: string; source?: string | null }, role: string | null | undefined): string {
  const source = course.source === "buyer" ? "buyer" : "admin";
  return `/learning/course?courseId=${encodeURIComponent(course.id)}&access=1&source=${source}&returnTo=${encodeURIComponent(courseListPath(role))}`;
}

function detailRows(rows: [string, string][]): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:16px 0;border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b">${escapeHtml(label)}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">${escapeHtml(value)}</td></tr>`,
      )
      .join("")}
  </table>`;
}

type CourseRef = { id: string; title: string; source?: string | null };
type SubscriptionRef = {
  amount: number;
  creator_amount?: number | null;
  commission?: number | null;
  payment_reference?: string | null;
  expires_at: string;
};

export function sendCoursePurchaseBuyerEmail(params: {
  to: string;
  name?: string | null;
  role?: string | null;
  course: CourseRef;
  subscription: SubscriptionRef;
  amountPaid: number;
  renewed: boolean;
}) {
  const { course, subscription } = params;
  return sendEmail({
    to: params.to,
    subject: params.renewed
      ? `KIZ FARM: your access to ${course.title} has been renewed`
      : `KIZ FARM: you now have access to ${course.title}`,
    html: layout(
      params.renewed ? "Course access renewed" : "Course purchase successful",
      `
        <p>Hi ${escapeHtml(params.name || "there")},</p>
        <p>${params.renewed ? "Your access to" : "You now have full access to"} <strong>${escapeHtml(course.title)}</strong>.</p>
        ${detailRows([
          ["Amount paid", money(params.amountPaid)],
          ["Access until", courseDate(subscription.expires_at)],
          ["Payment reference", subscription.payment_reference || "-"],
        ])}
        <p>Your access lasts 30 days. You'll find the course under <strong>My Subscriptions</strong>, with the days you have left, and we'll remind you before it ends.</p>
        ${actionButton(coursePath(course, params.role), "Start learning")}
      `,
    ),
  });
}

export function sendCourseSaleCreatorEmail(params: {
  to: string;
  name?: string | null;
  role?: string | null;
  course: CourseRef;
  subscriberName: string;
  earning: number;
  activeSubscribers: number;
  renewed: boolean;
}) {
  return sendEmail({
    to: params.to,
    subject: `KIZ FARM: ${params.renewed ? "a subscriber renewed" : "new subscriber for"} ${params.course.title}`,
    html: layout(
      params.renewed ? "Course subscription renewed" : "New course subscriber",
      `
        <p>Hi ${escapeHtml(params.name || "there")},</p>
        <p><strong>${escapeHtml(params.subscriberName)}</strong> ${params.renewed ? "renewed their subscription to" : "subscribed to"} your course <strong>${escapeHtml(params.course.title)}</strong>.</p>
        ${detailRows([
          ["Your earning from this sale", money(params.earning)],
          ["Payout status", "Pending admin release"],
          ["Active subscribers", String(params.activeSubscribers)],
        ])}
        <p>We'll email you as soon as an admin releases this payout to your bank account. You can follow every subscriber and payout under <strong>My Created Courses</strong>.</p>
        ${actionButton(courseListPath(params.role, "teaching"), "View subscribers and payouts")}
      `,
    ),
  });
}

export function sendAdminCoursePurchaseEmail(params: {
  course: CourseRef;
  buyer: { name?: string | null; email?: string | null };
  creatorName?: string | null;
  subscription: SubscriptionRef;
  amountPaid: number;
  renewed: boolean;
}) {
  const { course, subscription } = params;
  const community = course.source === "buyer";
  return sendEmail({
    to: adminEmails(),
    subject: `KIZ FARM: ${params.renewed ? "course renewed" : "new course subscription"} (${course.title})`,
    html: layout(
      params.renewed ? "Course subscription renewed" : "New course subscription",
      `
        <p><strong>${escapeHtml(course.title)}</strong> ${params.renewed ? "was renewed" : "was purchased"}.</p>
        ${detailRows([
          ["Subscriber", [params.buyer.name, params.buyer.email].filter(Boolean).join(" · ") || "-"],
          ["Course type", community ? `Community course by ${params.creatorName || "a creator"}` : "KIZ FARM course"],
          ["Amount paid", money(params.amountPaid)],
          ...(community
            ? ([
                ["Creator payout (pending)", money(subscription.creator_amount)],
                ["KIZ FARM commission", money(subscription.commission)],
              ] as [string, string][])
            : []),
          ["Access until", courseDate(subscription.expires_at)],
          ["Payment reference", subscription.payment_reference || "-"],
        ])}
        ${community ? "<p>The creator's payout is waiting for you to release it.</p>" : ""}
        ${actionButton("/learning/admin?tab=purchases", community ? "Review and release payout" : "View subscriptions")}
      `,
    ),
  });
}

export function sendCoursePayoutReleasedCreatorEmail(params: {
  to: string;
  name?: string | null;
  role?: string | null;
  courseTitle: string;
  amount: number;
  subscriberName: string;
  bank?: { bankName?: string | null; accountNumber?: string | null };
}) {
  const account = params.bank?.bankName && params.bank?.accountNumber
    ? `${params.bank.bankName} · ending ${params.bank.accountNumber.slice(-4)}`
    : "Your bank details on file";
  return sendEmail({
    to: params.to,
    subject: `KIZ FARM: payout of ${money(params.amount)} released for ${params.courseTitle}`,
    html: layout(
      "Course payout released",
      `
        <p>Hi ${escapeHtml(params.name || "there")},</p>
        <p>Good news: an admin has released your payout for <strong>${escapeHtml(params.courseTitle)}</strong>.</p>
        ${detailRows([
          ["Amount", money(params.amount)],
          ["Subscriber", params.subscriberName],
          ["Paid to", account],
          ["Released on", courseDate(new Date())],
        ])}
        <p>If the money hasn't reached your account within 24 hours, reply to this email and we'll look into it.</p>
        ${actionButton(courseListPath(params.role, "teaching"), "View your payouts")}
      `,
    ),
  });
}

export function sendAdminCoursePayoutReleasedEmail(params: {
  courseTitle: string;
  amount: number;
  creator: { name?: string | null; email?: string | null };
  subscriberName: string;
  releasedBy?: string | null;
}) {
  return sendEmail({
    to: adminEmails(),
    subject: `KIZ FARM: course payout released (${params.courseTitle})`,
    html: layout(
      "Course payout released",
      `
        ${detailRows([
          ["Course", params.courseTitle],
          ["Creator", [params.creator.name, params.creator.email].filter(Boolean).join(" · ") || "-"],
          ["Subscriber", params.subscriberName],
          ["Amount", money(params.amount)],
          ["Released by", params.releasedBy || "-"],
        ])}
        ${actionButton("/learning/admin?tab=purchases", "View payouts")}
      `,
    ),
  });
}

export function sendCourseExpiringSoonEmail(params: {
  to: string;
  name?: string | null;
  role?: string | null;
  course: CourseRef;
  expiresAt: string;
}) {
  const days = Math.max(1, Math.ceil((new Date(params.expiresAt).getTime() - Date.now()) / 86_400_000));
  return sendEmail({
    to: params.to,
    subject: `KIZ FARM: ${days} day${days === 1 ? "" : "s"} left on ${params.course.title}`,
    html: layout(
      "Your course access ends soon",
      `
        <p>Hi ${escapeHtml(params.name || "there")},</p>
        <p>Your access to <strong>${escapeHtml(params.course.title)}</strong> ends on <strong>${escapeHtml(courseDate(params.expiresAt))}</strong> (${days} day${days === 1 ? "" : "s"} left).</p>
        <p>Renew now to keep learning. The new 30 days are added on top of the days you have left, so you lose nothing by renewing early.</p>
        ${actionButton(coursePath(params.course, params.role), "Open course and renew")}
      `,
    ),
  });
}

export function sendCourseExpiredEmail(params: {
  to: string;
  name?: string | null;
  role?: string | null;
  course: CourseRef;
  expiresAt: string;
}) {
  return sendEmail({
    to: params.to,
    subject: `KIZ FARM: your access to ${params.course.title} has ended`,
    html: layout(
      "Course access ended",
      `
        <p>Hi ${escapeHtml(params.name || "there")},</p>
        <p>Your 30-day access to <strong>${escapeHtml(params.course.title)}</strong> ended on ${escapeHtml(courseDate(params.expiresAt))}.</p>
        <p>You can renew any time from the course page to unlock the lessons for another 30 days.</p>
        ${actionButton(coursePath(params.course, params.role), "Renew access")}
      `,
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
        <p>You'll get another email (and a notification in the app) the moment the fare is added, so you can complete payment.</p>
        ${actionButton(buyerOrderPath(orders[0]), "View your order")}
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
        <p>Tap below to review your order and complete payment. You can also find it under <strong>Orders</strong> or on your dashboard in the KIZ FARM app.</p>
        ${actionButton(buyerOrderPath(order), "Complete payment")}
      `,
    ),
  });
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAdminFarmers, getAdminBuyers, getAdminEmailCampaigns } from "@/lib/kizfarm/supabase-data";
import { adminSendEmail } from "@/lib/kizfarm/supabase-mutations";

type AudienceType = "single" | "all_farmers" | "all_buyers" | "custom_list";

interface RecipientMatch {
  email: string;
  label: string;
  source: "Farmer" | "Buyer";
}

interface EmailCampaign {
  _id: string;
  subject: string;
  audienceType: AudienceType;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: "sent" | "partial" | "failed";
  createdAt: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUDIENCE_OPTIONS: { value: AudienceType; label: string }[] = [
  { value: "single", label: "Single person" },
  { value: "all_farmers", label: "All farmers" },
  { value: "all_buyers", label: "All buyers" },
  { value: "custom_list", label: "Custom list" },
];

const AUDIENCE_LABEL: Record<AudienceType, string> = {
  single: "Single recipient",
  all_farmers: "All farmers",
  all_buyers: "All buyers",
  custom_list: "Custom list",
};

const STATUS_STYLE: Record<EmailCampaign["status"], string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

function parseCustomEmails(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function dedupeValidEmails(list: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of list) {
    const email = raw.trim().toLowerCase();
    if (email && EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

export default function AdminEmailsPage() {
  const [audienceType, setAudienceType] = useState<AudienceType>("single");

  // Single-recipient search
  const [singleEmail, setSingleEmail] = useState("");
  const [matches, setMatches] = useState<RecipientMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRequestId = useRef(0);
  // Set right before setSingleEmail() when the value comes from picking a
  // match, so the search effect below doesn't immediately re-run and
  // re-open the dropdown with that same match.
  const justPickedMatch = useRef(false);

  // All-farmers / all-buyers live count preview
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const audienceCountRequestId = useRef(0);

  // Custom list
  const [customEmailsText, setCustomEmailsText] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { res, payload } = await getAdminEmailCampaigns();
    if (res.ok) setCampaigns((payload.campaigns as EmailCampaign[]) || []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchHistory());
  }, []);

  // Debounced search across farmers + buyers, guarded against out-of-order
  // responses the same way the farmer picker on the add-product page is.
  useEffect(() => {
    if (justPickedMatch.current) {
      justPickedMatch.current = false;
      return;
    }
    if (audienceType !== "single" || singleEmail.trim().length < 2) {
      void Promise.resolve().then(() => setMatches([]));
      return;
    }
    const timer = setTimeout(async () => {
      const requestId = ++searchRequestId.current;
      setSearching(true);
      try {
        const [farmersRes, buyersRes] = await Promise.all([
          getAdminFarmers({ status: "approved", search: singleEmail, limit: 5 }),
          getAdminBuyers({ status: "active", search: singleEmail, limit: 5 }),
        ]);
        if (requestId !== searchRequestId.current) return;

        const farmerMatches: RecipientMatch[] = (farmersRes.res.ok ? farmersRes.payload.farmers || [] : [])
          .filter((f: any) => f.userId?.email)
          .map((f: any) => ({ email: f.userId.email, label: `${f.fullName} · ${f.farmName}`, source: "Farmer" as const }));
        const buyerMatches: RecipientMatch[] = (buyersRes.res.ok ? buyersRes.payload.users || [] : [])
          .filter((u: any) => u.email)
          .map((u: any) => ({ email: u.email, label: u.name || u.email, source: "Buyer" as const }));

        setMatches([...farmerMatches, ...buyerMatches]);
      } finally {
        if (requestId === searchRequestId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [audienceType, singleEmail]);

  // Live "this will send to N farmers/buyers" preview.
  useEffect(() => {
    const requestId = ++audienceCountRequestId.current;
    void Promise.resolve().then(() => setAudienceCount(null));

    if (audienceType !== "all_farmers" && audienceType !== "all_buyers") return;

    void (async () => {
      const { res, payload } =
        audienceType === "all_farmers"
          ? await getAdminFarmers({ status: "approved", limit: 1 })
          : await getAdminBuyers({ status: "active", limit: 1 });
      if (requestId !== audienceCountRequestId.current) return;
      if (res.ok) setAudienceCount(payload.total || 0);
    })();
  }, [audienceType]);

  const customEmailPreview = useMemo(() => {
    const parsed = parseCustomEmails(customEmailsText);
    const valid = dedupeValidEmails(parsed);
    return { validCount: valid.length, ignoredCount: parsed.length - valid.length };
  }, [customEmailsText]);

  const canSubmit = useMemo(() => {
    if (!subject.trim() || !body.trim()) return false;
    if (audienceType === "single") return EMAIL_RE.test(singleEmail.trim());
    if (audienceType === "custom_list") return customEmailPreview.validCount > 0;
    return true;
  }, [audienceType, subject, body, singleEmail, customEmailPreview]);

  const recipientSummary = useMemo(() => {
    switch (audienceType) {
      case "single":
        return singleEmail.trim() ? `1 recipient (${singleEmail.trim()})` : "No recipient selected yet";
      case "all_farmers":
        return audienceCount === null ? "Counting approved farmers…" : `${audienceCount} approved farmer(s)`;
      case "all_buyers":
        return audienceCount === null ? "Counting active buyers…" : `${audienceCount} active buyer(s)`;
      case "custom_list":
        return `${customEmailPreview.validCount} valid, ${customEmailPreview.ignoredCount} ignored`;
    }
  }, [audienceType, singleEmail, audienceCount, customEmailPreview]);

  const handleSend = async () => {
    if (!canSubmit || submitting) return;

    const confirmText =
      audienceType === "single"
        ? `Send this email to ${singleEmail.trim()}?`
        : audienceType === "custom_list"
          ? `Send this email to ${customEmailPreview.validCount} recipient(s)? This cannot be undone.`
          : `Send this email to ${audienceCount ?? "all"} ${audienceType === "all_farmers" ? "farmers" : "buyers"}? This cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const { res, payload } = await adminSendEmail({
      audienceType,
      singleEmail: audienceType === "single" ? singleEmail.trim() : undefined,
      customEmails: audienceType === "custom_list" ? dedupeValidEmails(parseCustomEmails(customEmailsText)) : undefined,
      subject: subject.trim(),
      body: body.trim(),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError(payload?.error || "Failed to send email");
      return;
    }

    setSuccessMessage(`Sent to ${payload.sentCount} of ${payload.recipientCount} recipient(s)${payload.failedCount ? ` (${payload.failedCount} failed)` : ""}.`);
    setSubject("");
    setBody("");
    setSingleEmail("");
    setCustomEmailsText("");
    setMatches([]);
    void fetchHistory();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-emerald-950 tracking-tight">Emails</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Send email to a single person, all farmers, all buyers, or a custom list of addresses.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 md:p-7 space-y-5">
        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
        ) : null}
        {successMessage ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">{successMessage}</div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-semibold">Send to *</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAudienceType(opt.value)}
                className={`px-4 h-9 rounded-full text-sm font-medium border transition-colors ${
                  audienceType === opt.value
                    ? "bg-[#1B6D24] text-white border-[#1B6D24]"
                    : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {audienceType === "single" ? (
          <div className="space-y-1">
            <label className="text-sm font-semibold">Recipient email *</label>
            <input
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
              placeholder="Search a farmer/buyer by name, email, phone — or type any email"
            />
            {singleEmail.trim().length >= 2 && (searching || matches.length > 0) ? (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                {searching ? (
                  <div className="p-4 text-sm text-zinc-500">Searching…</div>
                ) : (
                  matches.map((m) => (
                    <button
                      type="button"
                      key={`${m.source}-${m.email}`}
                      onClick={() => {
                        justPickedMatch.current = true;
                        setSingleEmail(m.email);
                        setMatches([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between gap-2"
                    >
                      <span>
                        <span className="font-medium">{m.label}</span>
                        <span className="text-xs text-zinc-500 block">{m.email}</span>
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400 shrink-0">{m.source}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {audienceType === "custom_list" ? (
          <div className="space-y-1">
            <label className="text-sm font-semibold">Email addresses *</label>
            <textarea
              value={customEmailsText}
              onChange={(e) => setCustomEmailsText(e.target.value)}
              className="w-full min-h-24 p-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
              placeholder="One per line, or comma/semicolon separated"
            />
          </div>
        ) : null}

        {audienceType === "all_farmers" ? (
          <p className="text-xs text-zinc-500">Suspended or deactivated farmer accounts are excluded automatically when sending.</p>
        ) : null}

        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300">
          {recipientSummary}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold">Subject *</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
            placeholder="e.g., Platform update"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold">Message *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-40 p-4 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-2 focus:ring-[#1B6D24]/20"
            placeholder="Write your message…"
          />
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSubmit || submitting}
            className="px-6 h-11 rounded-lg bg-[#1B6D24] text-white font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Review & Send"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 md:p-7 space-y-4">
        <h2 className="text-lg font-bold text-emerald-950">Sent history</h2>
        {loadingHistory ? (
          <div className="text-sm text-zinc-500">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-sm text-zinc-500">No emails sent yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Audience</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Recipients</th>
                  <th className="py-2 pr-4">Sent</th>
                  <th className="py-2 pr-4">Failed</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id} className="border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{AUDIENCE_LABEL[c.audienceType]}</td>
                    <td className="py-2 pr-4 max-w-[240px] truncate">{c.subject}</td>
                    <td className="py-2 pr-4">{c.recipientCount}</td>
                    <td className="py-2 pr-4">{c.sentCount}</td>
                    <td className="py-2 pr-4">{c.failedCount}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

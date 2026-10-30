"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getFarmerApplicationMessages, type FarmerApplicationMessage } from "@/lib/kizfarm/supabase-data";
import { adminSendEmail, postFarmerApplicationMessage } from "@/lib/kizfarm/supabase-mutations";
import { formatDateTime } from "@/lib/kizfarm/farmer-application";

// The conversation between KIZ FARM admins and one applicant about their
// farmer application. Admins see it on the review page, the applicant on
// their verification page.
export default function FarmerApplicationMessages({
  farmerId,
  viewer,
  applicantEmail,
  applicantName,
  suggestions = [],
  onCountChange,
}: {
  farmerId: string;
  viewer: "admin" | "farmer";
  applicantEmail?: string | null;
  applicantName?: string | null;
  // Admin only: ready-made messages, e.g. built from the missing steps.
  suggestions?: string[];
  onCountChange?: (count: number) => void;
}) {
  const [messages, setMessages] = useState<FarmerApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [notice, setNotice] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { res, payload } = await getFarmerApplicationMessages(farmerId);
    if (res.ok) {
      setMessages(payload.messages || []);
      setLoadError("");
      onCountChange?.((payload.messages || []).length);
    } else {
      setLoadError(payload.error || "Could not load messages.");
    }
    setLoading(false);
  }, [farmerId, onCountChange]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    setNotice("");
    const { res, payload } = await postFarmerApplicationMessage(farmerId, body);
    if (!res.ok) {
      setSendError(payload.error || "Message could not be sent.");
      setSending(false);
      return;
    }

    let emailNote = "";
    if (viewer === "admin" && alsoEmail && applicantEmail) {
      const { res: emailRes } = await adminSendEmail({
        audienceType: "single",
        singleEmail: applicantEmail,
        subject: "About your KIZ FARM farmer application",
        body: `Hello ${applicantName || "there"},\n\n${body}\n\nYou can reply and update your application from your KIZ FARM account (Farmer Application page).\n\nKIZ FARM Team`,
      });
      emailNote = emailRes.ok ? " and emailed" : " (the email could not be sent, but the in-app message was delivered)";
    }

    setDraft("");
    setNotice(viewer === "admin" ? `Sent to the applicant${emailNote}.` : "Reply sent to the KIZ FARM team.");
    setSending(false);
    await load();
  };

  const mine = (m: FarmerApplicationMessage) => m.authorRole === viewer;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1B6D24]">forum</span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewer === "admin" ? "Messages with the applicant" : "Messages from KIZ FARM"}
          </h3>
        </div>
        {messages.length > 0 && <span className="text-xs text-slate-500">{messages.length} message{messages.length === 1 ? "" : "s"}</span>}
      </header>

      <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            {viewer === "admin"
              ? "No messages yet. Tell the applicant what to fix or what's missing — they get a notification straight away."
              : "No messages yet. If an admin needs anything from you, it will appear here and you'll get a notification."}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m._id} className={`flex ${mine(m) ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine(m) ? "rounded-br-sm bg-[#1B6D24] text-white" : "rounded-bl-sm bg-slate-100 text-slate-900"
                }`}
              >
                <p className={`mb-0.5 text-[11px] font-semibold ${mine(m) ? "text-white/80" : "text-slate-500"}`}>
                  {m.authorRole === "admin" ? "KIZ FARM Admin" : m.authorName || "Applicant"}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine(m) ? "text-white/70" : "text-slate-400"}`}>{formatDateTime(m.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-100 p-4">
        {viewer === "admin" && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDraft(s)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-left text-xs font-medium text-slate-700 hover:border-[#1B6D24] hover:text-[#1B6D24]"
              >
                {s.length > 70 ? `${s.slice(0, 70)}…` : s}
              </button>
            ))}
          </div>
        )}
        <label htmlFor={`msg-${farmerId}`} className="sr-only">
          Message
        </label>
        <textarea
          id={`msg-${farmerId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          rows={3}
          maxLength={2000}
          placeholder={viewer === "admin" ? "Write feedback for the applicant…" : "Reply to the KIZ FARM team…"}
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1B6D24] focus:ring-2 focus:ring-[#1B6D24]/15"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          {viewer === "admin" && applicantEmail ? (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} className="rounded border-slate-300" />
              Also email it to {applicantEmail}
            </label>
          ) : (
            <span className="text-xs text-slate-400">{draft.length}/2000</span>
          )}
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B6D24] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">{sending ? "progress_activity" : "send"}</span>
            {sending ? "Sending…" : viewer === "admin" ? "Send to applicant" : "Send reply"}
          </button>
        </div>
        {sendError && <p className="mt-2 text-sm text-red-600">{sendError}</p>}
        {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
      </div>
    </section>
  );
}

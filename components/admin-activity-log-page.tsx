"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAdminActivityLog, type AdminActivityEntry } from "@/lib/kizfarm/supabase-data";
import { ACTIVITY_FILTERS, activityDescription, activityLink, activityMeta } from "@/lib/kizfarm/admin-activity";
import { formatDateTime, timeAgo } from "@/lib/kizfarm/farmer-application";

const PAGE_SIZE = 50;

// Who did what in the admin, and when. Entries are written by the database
// and the delete-account function -- never by this page -- and can't be
// edited or removed.
export default function AdminActivityLogPage() {
  const [entries, setEntries] = useState<AdminActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { res, payload } = await getAdminActivityLog({ action: filter, search: appliedSearch, offset: 0, limit: PAGE_SIZE });
    if (res.ok) {
      setEntries(payload.entries || []);
      setTotal(payload.total || 0);
    } else {
      setError(payload.error || "Could not load the activity log.");
    }
    setLoading(false);
  }, [filter, appliedSearch]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadMore = async () => {
    setLoadingMore(true);
    const { res, payload } = await getAdminActivityLog({ action: filter, search: appliedSearch, offset: entries.length, limit: PAGE_SIZE });
    if (res.ok) setEntries((cur) => [...cur, ...(payload.entries || [])]);
    setLoadingMore(false);
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <nav className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/dashboard" className="hover:text-[#1B6D24]">
          Admin
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="font-medium text-emerald-700">Activity log</span>
      </nav>
      <h1 className="text-2xl font-bold text-slate-900">Activity log</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        A permanent record of admin decisions and account changes: farmer approvals and rejections, messages to applicants, suspensions, deletions (including users deleting their own account) and course reviews. Entries can&apos;t be edited or removed.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-1.5">
            {ACTIVITY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  filter === f.value ? "bg-[#1B6D24] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, person or farm"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1B6D24] focus:ring-2 focus:ring-[#1B6D24]/15"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
            Loading activity…
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-600">{error}</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <span className="material-symbols-outlined mb-2 text-4xl">history</span>
            <p className="text-sm font-medium">{appliedSearch || filter !== "all" ? "Nothing matches these filters." : "No activity recorded yet."}</p>
            <p className="mt-1 text-xs">Recording started with this update — earlier actions weren&apos;t logged.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((a) => {
              const meta = activityMeta(a.action);
              const href = activityLink(a);
              return (
                <li key={a._id} className="flex items-start gap-3 px-4 py-3.5">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                    <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{a.actorName || a.actorEmail || "Unknown"}</span> {activityDescription(a)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span> · {formatDateTime(a.createdAt)}
                      {a.actorEmail && a.actorName ? ` · ${a.actorEmail}` : ""}
                    </p>
                  </div>
                  <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${meta.tone}`}>{meta.label}</span>
                  {href && (
                    <Link href={href} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Open
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && entries.length < total && (
          <div className="flex justify-center border-t border-slate-100 py-4">
            <button onClick={loadMore} disabled={loadingMore} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#1B6D24] hover:bg-green-50 disabled:opacity-60">
              {loadingMore ? "Loading…" : `Load more (${entries.length} of ${total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

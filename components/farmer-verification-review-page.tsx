"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getAdminFarmerStatusCounts, getAdminFarmerVerifications } from "@/lib/kizfarm/supabase-data";
import {
  FARM_IMAGE_COUNT,
  formatDateTime,
  statusMeta,
  timeAgo,
  type ApplicationStep,
  type FarmerApplicationStatus,
} from "@/lib/kizfarm/farmer-application";

type Tab = Exclude<FarmerApplicationStatus, never>;

const TABS: { key: Tab; label: string; empty: string }[] = [
  { key: "pending", label: "Pending review", empty: "No applications are waiting for review." },
  { key: "draft", label: "Incomplete", empty: "No one has an unfinished application." },
  { key: "rejected", label: "Needs changes", empty: "No rejected applications." },
  { key: "approved", label: "Verified", empty: "No verified farmers yet." },
];

type Row = {
  _id: string;
  fullName?: string;
  farmName?: string;
  phone?: string;
  location?: string;
  status: Tab;
  selfieUrl?: string;
  farmerImageUrl?: string;
  farmImageUrls?: (string | null)[];
  rejectionReason?: string;
  createdAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  missing: ApplicationStep[];
  userId?: { name?: string; email?: string; phone?: string } | null;
};

export default function FarmerVerificationReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (TABS.find((t) => t.key === searchParams.get("tab"))?.key ?? "pending") as Tab;

  const [tab, setTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [listRes, countRes] = await Promise.all([
      getAdminFarmerVerifications({ status: tab, search: appliedSearch }),
      getAdminFarmerStatusCounts(),
    ]);
    if (listRes.res.ok) setRows((listRes.payload.list || []) as Row[]);
    else setError(listRes.payload.error || "Could not load applications.");
    if (countRes.res.ok) setCounts(countRes.payload.counts || {});
    setLoading(false);
  }, [tab, appliedSearch]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const switchTab = (next: Tab) => {
    setTab(next);
    router.replace(`/admin/verify-farmers?tab=${next}`, { scroll: false });
  };

  const current = TABS.find((t) => t.key === tab)!;

  return (
    <div className="mx-auto max-w-[1440px]">
      <nav className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/admin/dashboard" className="hover:text-[#1B6D24]">
          Admin
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="font-medium text-emerald-700">Farmer applications</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Farmer applications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every request to become a farmer, from first step to decision. Open one to see all details, message the applicant, and approve or reject.
          </p>
        </div>
        <Link href="/admin/activity" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <span className="material-symbols-outlined text-[18px]">history</span>
          Activity log
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 pt-3">
          <div className="flex flex-wrap gap-1" role="tablist">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(t.key)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active ? "border-[#1B6D24] text-[#1B6D24]" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.key === "pending" && (counts.pending || 0) > 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {counts[t.key] ?? "–"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, farm or phone"
              className="w-64 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1B6D24] focus:ring-2 focus:ring-[#1B6D24]/15"
            />
          </div>
        </div>

        {tab === "draft" && (
          <p className="flex items-start gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="material-symbols-outlined text-[18px] text-slate-500">info</span>
            These people started an application but haven&apos;t submitted it. They can&apos;t be approved until it&apos;s complete — open one to see what&apos;s missing and send them a reminder.
          </p>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">
              <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
              Loading applications…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-red-600">
              {error}
              <button onClick={load} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">
                Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-500">
              <span className="material-symbols-outlined mb-2 text-4xl">agriculture</span>
              <p className="text-sm font-medium">{appliedSearch ? `No ${current.label.toLowerCase()} applications match “${appliedSearch}”.` : current.empty}</p>
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-slate-50 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">{tab === "draft" ? "Still missing" : tab === "rejected" ? "Reason" : "Application"}</th>
                  <th className="px-4 py-3">{tab === "pending" ? "Submitted" : tab === "draft" ? "Started" : "Decided"}</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((f) => {
                  const avatar = f.farmerImageUrl || f.selfieUrl;
                  const photos = (f.farmImageUrls || []).filter(Boolean).length;
                  const meta = statusMeta(f.status);
                  return (
                    <tr
                      key={f._id}
                      onClick={() => router.push(`/admin/verify-farmers/${f._id}`)}
                      className="cursor-pointer hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (f.fullName || f.userId?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{f.fullName || f.userId?.name || "Unnamed"}</p>
                            <p className="truncate text-xs text-slate-500">
                              {f.farmName || "No farm name yet"}
                              {f.location ? ` · ${f.location}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        <p className="truncate">{f.userId?.email || "—"}</p>
                        <p className="text-xs text-slate-500">{f.phone || f.userId?.phone || "—"}</p>
                      </td>
                      <td className="max-w-[320px] px-4 py-3.5 text-sm">
                        {tab === "draft" ? (
                          f.missing.length === 0 ? (
                            <span className="text-emerald-700">All filled in — not submitted yet</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {f.missing.map((m) => (
                                <span key={m.key} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                  {m.key === "farm_images" ? `${photos}/${FARM_IMAGE_COUNT} farm photos` : m.label}
                                </span>
                              ))}
                            </div>
                          )
                        ) : tab === "rejected" ? (
                          <p className="line-clamp-2 text-slate-600">{f.rejectionReason || "—"}</p>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.adminLabel}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                        {tab === "pending" ? (
                          <>
                            <p>{formatDateTime(f.submittedAt || f.createdAt)}</p>
                            <p className="text-xs font-semibold text-amber-700">Waiting {timeAgo(f.submittedAt || f.createdAt).replace(" ago", "")}</p>
                          </>
                        ) : tab === "draft" ? (
                          <p>{timeAgo(f.createdAt)}</p>
                        ) : (
                          <>
                            <p>{formatDateTime(f.reviewedAt)}</p>
                            {f.reviewedByName && <p className="text-xs text-slate-500">by {f.reviewedByName}</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/admin/verify-farmers/${f._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                            tab === "pending" ? "bg-[#1B6D24] text-white hover:brightness-110" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {tab === "pending" ? "Review" : tab === "draft" ? "View & message" : "View"}
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {!loading && rows.length >= 200 && (
          <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing the first 200. Use search to find a specific applicant.</p>
        )}
      </div>
    </div>
  );
}

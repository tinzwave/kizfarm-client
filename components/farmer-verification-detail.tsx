"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getAdminFarmerActivity,
  getAdminFarmerVerificationById,
  type AdminActivityEntry,
} from "@/lib/kizfarm/supabase-data";
import { adminReviewFarmer } from "@/lib/kizfarm/supabase-mutations";
import {
  FARM_IMAGE_COUNT,
  applicationChecklist,
  farmTypeLabel,
  formatDateTime,
  statusMeta,
  timeAgo,
} from "@/lib/kizfarm/farmer-application";
import { activityDescription } from "@/lib/kizfarm/admin-activity";
import FarmerApplicationMessages from "@/components/farmer-application-messages";

const REJECT_REASONS = [
  "The ID you uploaded is not clear enough to read. Please upload a clear photo of a valid ID.",
  "The farm photos don't clearly show a farm. Please upload 5 clear photos of your farm from different angles.",
  "The name on your ID doesn't match the name on your account.",
  "We couldn't confirm the farm address. Please enter the full address, including town and LGA.",
];

export default function FarmerVerificationDetail({ id }: { id?: string }) {
  const params = useParams();
  const farmerId = id || ((params as { id?: string } | null)?.id ?? "");

  const [farmer, setFarmer] = useState<any | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!farmerId) {
      setLoadError("Invalid application link.");
      setLoading(false);
      return;
    }
    const { res, payload } = await getAdminFarmerVerificationById(farmerId);
    if (!res.ok || !payload?.farmer) {
      // .single() on a missing row errors, so "not found" arrives either way.
      setLoadError(
        res.ok || /not found|0 rows|no rows/i.test(payload?.error || "")
          ? "This application no longer exists. The account may have been deleted — check the activity log."
          : payload?.error || "Could not load this application.",
      );
      setLoading(false);
      return;
    }
    setFarmer(payload.farmer);
    setLoadError("");
    const act = await getAdminFarmerActivity(payload.farmer._id, payload.farmer.userId?._id);
    if (act.res.ok) setActivity(act.payload.entries || []);
    setLoading(false);
  }, [farmerId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const checklist = useMemo(() => (farmer ? applicationChecklist(farmer) : []), [farmer]);
  const missing = checklist.filter((s) => !s.done);

  const firstName = (farmer?.fullName || farmer?.userId?.name || "").split(" ")[0];
  const messageSuggestions = useMemo(() => {
    if (!farmer) return [];
    const list: string[] = [];
    if (farmer.status === "draft") {
      list.push(
        missing.length > 0
          ? `Hello ${firstName || "there"}, your farmer application isn't complete yet. Please add: ${missing
              .map((m) => m.label)
              .join(", ")}. Then press "Submit for review" so we can verify your farm.`
          : `Hello ${firstName || "there"}, your farmer application is filled in but hasn't been submitted. Please open it and press "Submit for review".`,
      );
    }
    list.push(
      "Please upload a clearer photo of your valid ID — the current one is hard to read.",
      "Please upload 5 clear photos showing your farm from different angles.",
    );
    return list;
  }, [farmer, missing, firstName]);

  const decide = async (approved: boolean) => {
    if (!farmer || submitting) return;
    if (!approved && !reason.trim()) {
      setDecisionError("Write a reason — the applicant sees it and needs it to fix their application.");
      return;
    }
    setSubmitting(true);
    setDecisionError("");
    const { res, payload } = await adminReviewFarmer(farmer._id, approved, approved ? undefined : reason.trim());
    setSubmitting(false);
    if (!res.ok) {
      setDecisionError(payload?.error || "The decision could not be saved.");
      await load();
      return;
    }
    setMode("idle");
    setReason("");
    setNotice(
      approved
        ? `${farmer.fullName || "The applicant"} is now a verified farmer. They've been notified and can open their Farmer Dashboard.`
        : "Application rejected. The applicant has been notified with your reason and can resubmit.",
    );
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
        Loading application…
      </div>
    );
  }
  if (loadError || !farmer) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-400">search_off</span>
        <p className="mt-2 text-sm text-slate-700">{loadError || "Application not found."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/admin/verify-farmers" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
            Back to applications
          </Link>
          <Link href="/admin/activity" className="rounded-lg bg-[#1B6D24] px-4 py-2 text-sm font-semibold text-white">
            Open activity log
          </Link>
        </div>
      </div>
    );
  }

  const meta = statusMeta(farmer.status);
  const avatar = farmer.farmerImageUrl || farmer.selfieUrl;
  const idImage = farmer.validIdImageUrl || farmer.govIdUrl;
  const farmPhotos: (string | null)[] = Array.from({ length: FARM_IMAGE_COUNT }, (_, i) => farmer.farmImageUrls?.[i] || null);
  const accountInactive = farmer.userId?.status && farmer.userId.status !== "active";

  const details: [string, React.ReactNode][] = [
    ["Full name", farmer.fullName || farmer.userId?.name],
    ["Farm name", farmer.farmName],
    ["Farm type", farmer.farmType ? farmTypeLabel(farmer.farmType) : null],
    ["Farm state", farmer.location],
    ["Farm address", farmer.farmAddress],
    ["Phone", farmer.phone],
    ["Account email", farmer.userId?.email],
    ["Account phone", farmer.userId?.phone],
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <Link href={`/admin/verify-farmers?tab=${farmer.status}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#1B6D24]">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Farmer applications
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-emerald-50 text-xl font-bold text-emerald-700">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : (farmer.fullName || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{farmer.fullName || farmer.userId?.name || "Unnamed applicant"}</h1>
            <p className="text-sm text-slate-500">
              {farmer.farmName || "No farm name yet"}
              {farmer.location ? ` · ${farmer.location}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
                <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                {meta.adminLabel}
              </span>
              {accountInactive && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">Account {farmer.userId.status}</span>
              )}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Started</dt>
            <dd className="font-medium">{formatDateTime(farmer.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Submitted</dt>
            <dd className="font-medium">{farmer.submittedAt ? formatDateTime(farmer.submittedAt) : "Not yet"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Decision</dt>
            <dd className="font-medium">
              {farmer.reviewedAt ? `${formatDateTime(farmer.reviewedAt)}${farmer.reviewedByName ? ` · ${farmer.reviewedByName}` : ""}` : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {notice && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {notice}
        </div>
      )}

      {/* What state is this in, and what can the admin do */}
      <div className="mb-5">
        {farmer.status === "pending" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">Waiting for a decision</p>
            <p>
              Submitted {timeAgo(farmer.submittedAt || farmer.createdAt)}. Check the details and photos below, then approve or reject. If something small is unclear, you can message the applicant first.
            </p>
          </div>
        )}
        {farmer.status === "draft" && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800">
            <p className="font-bold">Incomplete — the applicant hasn&apos;t submitted this yet</p>
            <p>
              {missing.length > 0
                ? `It can't be approved until it's complete. Still missing: ${missing.map((m) => m.label).join(", ")}.`
                : "Everything is filled in, but the applicant hasn't pressed “Submit for review”."}{" "}
              Use the message box to tell them what to do — they get a notification straight away.
            </p>
          </div>
        )}
        {farmer.status === "rejected" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-bold">
              Rejected{farmer.reviewedAt ? ` ${timeAgo(farmer.reviewedAt)}` : ""}
              {farmer.reviewedByName ? ` by ${farmer.reviewedByName}` : ""} — waiting for the applicant to resubmit
            </p>
            <p className="mt-1">
              <span className="font-semibold">Reason given: </span>
              {farmer.rejectionReason || "—"}
            </p>
          </div>
        )}
        {farmer.status === "approved" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-bold">
              Verified farmer{farmer.reviewedAt ? ` since ${formatDateTime(farmer.reviewedAt)}` : ""}
              {farmer.reviewedByName ? ` · approved by ${farmer.reviewedByName}` : ""}
            </p>
            <p>
              Manage their account (suspend, deactivate) from{" "}
              <Link href="/admin/farmers" className="font-semibold underline">
                Farmers
              </Link>
              .
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Checklist */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Application checklist</h2>
              <span className={`text-sm font-bold ${missing.length ? "text-rose-600" : "text-emerald-700"}`}>
                {checklist.length - missing.length}/{checklist.length} complete
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {checklist.map((step) => (
                <li
                  key={step.key}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${step.done ? "border-slate-100 text-slate-700" : "border-rose-200 bg-rose-50 font-semibold text-rose-700"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{step.done ? "check_circle" : "cancel"}</span>
                  {step.label}
                  {step.key === "farm_images" && <span className="ml-auto text-xs font-medium">{step.hint}</span>}
                </li>
              ))}
            </ul>
          </section>

          {/* Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Farm &amp; contact details</h2>
            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className={`mt-1 whitespace-pre-wrap text-sm ${value ? "font-medium text-slate-900" : "italic text-rose-600"}`}>{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Identity */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Identity</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Applicant's photo", url: avatar },
                { label: "Valid ID", url: idImage },
              ].map((item) => (
                <figure key={item.label} className="overflow-hidden rounded-lg border border-slate-200">
                  <figcaption className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    {item.label}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#1B6D24] underline">
                        Open full size
                      </a>
                    )}
                  </figcaption>
                  <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                    {item.url ? (
                      <img src={item.url} alt={item.label} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-sm font-medium text-rose-600">Not uploaded</span>
                    )}
                  </div>
                </figure>
              ))}
            </div>
          </section>

          {/* Farm photos */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Farm photos</h2>
              <span className="text-xs font-semibold text-slate-600">
                {farmPhotos.filter(Boolean).length}/{FARM_IMAGE_COUNT} uploaded
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {farmPhotos.map((url, i) =>
                url ? (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img src={url} alt={`Farm photo ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 text-xs font-semibold text-white">{i + 1}</span>
                  </a>
                ) : (
                  <div key={i} className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-rose-200 bg-rose-50 text-xs font-medium text-rose-600">
                    Photo {i + 1} missing
                  </div>
                ),
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {/* Decision */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Decision</h2>
            {farmer.status !== "pending" ? (
              <p className="text-sm text-slate-600">
                {farmer.status === "draft"
                  ? "Available once the applicant submits a complete application."
                  : farmer.status === "rejected"
                    ? "Available again when the applicant resubmits."
                    : "This farmer is already verified."}
              </p>
            ) : mode === "idle" ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setMode("approve");
                    setDecisionError("");
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1B6D24] text-sm font-semibold text-white hover:brightness-110"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Approve as farmer
                </button>
                <button
                  onClick={() => {
                    setMode("reject");
                    setDecisionError("");
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  Reject with reason
                </button>
              </div>
            ) : mode === "approve" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Approve <span className="font-semibold">{farmer.farmName || farmer.fullName}</span>? They&apos;ll be able to list products and receive orders right away.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setMode("idle")} disabled={submitting} className="h-10 flex-1 rounded-lg border border-slate-200 text-sm font-semibold">
                    Cancel
                  </button>
                  <button onClick={() => decide(true)} disabled={submitting} className="h-10 flex-1 rounded-lg bg-[#1B6D24] text-sm font-semibold text-white disabled:opacity-60">
                    {submitting ? "Approving…" : "Yes, approve"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label htmlFor="reject-reason" className="block text-sm font-semibold text-slate-700">
                  Reason (the applicant sees this)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REJECT_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-xs text-slate-700 hover:border-rose-300">
                      {r.split(".")[0]}
                    </button>
                  ))}
                </div>
                <textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                  placeholder="Explain what's wrong and what they need to change…"
                />
                <div className="flex gap-2">
                  <button onClick={() => setMode("idle")} disabled={submitting} className="h-10 flex-1 rounded-lg border border-slate-200 text-sm font-semibold">
                    Cancel
                  </button>
                  <button onClick={() => decide(false)} disabled={submitting} className="h-10 flex-1 rounded-lg bg-rose-600 text-sm font-semibold text-white disabled:opacity-60">
                    {submitting ? "Rejecting…" : "Reject application"}
                  </button>
                </div>
              </div>
            )}
            {decisionError && <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{decisionError}</p>}
          </section>

          <FarmerApplicationMessages
            farmerId={farmer._id}
            viewer="admin"
            applicantEmail={farmer.userId?.email}
            applicantName={firstName}
            suggestions={messageSuggestions}
          />

          {/* History */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">History</h2>
            <ol className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a._id} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <div>
                    <p className="text-slate-800">
                      <span className="font-semibold">{a.actorName || a.actorEmail || "Someone"}</span> {activityDescription(a)}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(a.createdAt)}</p>
                  </div>
                </li>
              ))}
              {farmer.submittedAt && (
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-slate-800">Applicant {farmer.status === "draft" ? "last submitted" : "submitted the application"}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(farmer.submittedAt)}</p>
                  </div>
                </li>
              )}
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-slate-800">Applicant started the application</p>
                  <p className="text-xs text-slate-500">{formatDateTime(farmer.createdAt)}</p>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

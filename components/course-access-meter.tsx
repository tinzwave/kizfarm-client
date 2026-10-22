"use client";

import { courseAccessState, daysLeftLabel, formatCourseDate } from "@/lib/kizfarm/course-access";

function tone(expiresAt?: string | null) {
  const state = courseAccessState(expiresAt);
  if (state.expired) return { state, pill: "bg-red-50 text-red-700 ring-red-200", bar: "bg-red-500", icon: "event_busy" };
  if (state.endingSoon) return { state, pill: "bg-amber-50 text-amber-800 ring-amber-200", bar: "bg-amber-500", icon: "hourglass_bottom" };
  return { state, pill: "bg-green-50 text-green-800 ring-green-200", bar: "bg-green-600", icon: "verified" };
}

// "Subscribed · 12 days left" / "Expired" pill for course cards.
export function AccessBadge({ expiresAt, className = "" }: { expiresAt?: string | null; className?: string }) {
  const { state, pill, icon } = tone(expiresAt);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${pill} ${className}`}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {state.expired ? "Subscription expired" : `Subscribed · ${daysLeftLabel(state)}`}
    </span>
  );
}

// Days-left countdown with a bar that empties over the 30-day period.
export function AccessMeter({ paidAt, expiresAt }: { paidAt?: string | null; expiresAt?: string | null }) {
  const { state, bar } = tone(expiresAt);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-sm font-bold ${state.expired ? "text-red-700" : state.endingSoon ? "text-amber-800" : "text-green-800"}`}>
          {state.expired ? "Access expired" : daysLeftLabel(state)}
        </p>
        <p className="text-xs text-slate-500">
          {state.expired ? "Ended" : "Ends"} {formatCourseDate(expiresAt)}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Course access remaining"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(state.remainingRatio * 100)}
      >
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${state.remainingRatio * 100}%` }} />
      </div>
      {paidAt && <p className="mt-1.5 text-xs text-slate-500">Subscribed {formatCourseDate(paidAt)}</p>}
    </div>
  );
}

export function PayoutBadge({ status, releasedAt }: { status?: string | null; releasedAt?: string | null }) {
  if (status === "released") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200">
        <span className="material-symbols-outlined text-[14px]">payments</span>
        Released{releasedAt ? ` ${formatCourseDate(releasedAt)}` : ""}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
        <span className="material-symbols-outlined text-[14px]">schedule</span>
        Awaiting release
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">No payout</span>
  );
}

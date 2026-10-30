import type { AdminActivityEntry } from "./supabase-data";

// Human wording for admin_activity_log.action values (migration 0047 and
// the delete-account Edge Function). Unknown actions fall back to the raw
// key so a new action type is still visible before it's added here.
export const ACTIVITY_ACTIONS: Record<string, { label: string; icon: string; tone: string }> = {
  farmer_approved: { label: "Farmer approved", icon: "verified", tone: "bg-emerald-100 text-emerald-800" },
  farmer_rejected: { label: "Farmer rejected", icon: "block", tone: "bg-rose-100 text-rose-700" },
  farmer_message_sent: { label: "Message to applicant", icon: "forum", tone: "bg-sky-100 text-sky-800" },
  account_suspended: { label: "Account suspended", icon: "pause_circle", tone: "bg-amber-100 text-amber-800" },
  account_reactivated: { label: "Account reactivated", icon: "play_circle", tone: "bg-emerald-100 text-emerald-800" },
  account_deactivated: { label: "Account deactivated", icon: "person_off", tone: "bg-rose-100 text-rose-700" },
  account_status_changed: { label: "Account status changed", icon: "manage_accounts", tone: "bg-slate-100 text-slate-700" },
  account_deleted: { label: "Account deleted by admin", icon: "delete_forever", tone: "bg-red-100 text-red-800" },
  account_self_deleted: { label: "User deleted own account", icon: "person_remove", tone: "bg-slate-200 text-slate-800" },
  course_approved: { label: "Course approved", icon: "school", tone: "bg-emerald-100 text-emerald-800" },
  course_rejected: { label: "Course rejected", icon: "school", tone: "bg-rose-100 text-rose-700" },
};

// Filter groups for the log page; each matches action keys by prefix.
export const ACTIVITY_FILTERS = [
  { value: "all", label: "All activity" },
  { value: "farmer_", label: "Farmer applications" },
  { value: "account_", label: "Accounts" },
  { value: "course_", label: "Courses" },
];

export function activityMeta(action: string) {
  return ACTIVITY_ACTIONS[action] ?? { label: action.replace(/_/g, " "), icon: "history", tone: "bg-slate-100 text-slate-700" };
}

// "<actor> {description}" -- the sentence after the actor's name.
export function activityDescription(a: AdminActivityEntry) {
  const target = a.targetLabel || "an account";
  const d = a.details || {};
  switch (a.action) {
    case "farmer_approved":
      return `approved the farmer application for ${target}`;
    case "farmer_rejected":
      return `rejected the farmer application for ${target}${d.reason ? ` — “${d.reason}”` : ""}`;
    case "farmer_message_sent":
      return `messaged the applicant for ${target}${d.message ? `: “${String(d.message).slice(0, 140)}”` : ""}`;
    case "account_suspended":
      return `suspended ${target}${d.reason ? ` — “${d.reason}”` : ""}`;
    case "account_reactivated":
      return `reactivated ${target}`;
    case "account_deactivated":
      return `deactivated ${target}`;
    case "account_deleted":
      return `deleted the account of ${target}${d.email ? ` (${d.email})` : ""}`;
    case "account_self_deleted":
      return `deleted their own account${d.farm_name ? ` (farm: ${d.farm_name}, application ${d.farmer_status})` : ""}`;
    case "course_approved":
      return `approved the course “${target}”`;
    case "course_rejected":
      return `rejected the course “${target}”${d.reason ? ` — “${d.reason}”` : ""}`;
    default:
      return `${activityMeta(a.action).label.toLowerCase()} · ${target}`;
  }
}

// Where an entry's target can be opened in the admin, if anywhere.
export function activityLink(a: AdminActivityEntry): string | null {
  if (!a.targetId) return null;
  if (a.action === "account_deleted" || a.action === "account_self_deleted") return null;
  if (a.targetType === "farmer") return `/admin/verify-farmers/${a.targetId}`;
  if (a.targetType === "user" || a.targetType === "farmer_account") return `/admin/users/${a.targetId}`;
  if (a.targetType === "course") return "/learning/admin?tab=buyerCourses";
  return null;
}

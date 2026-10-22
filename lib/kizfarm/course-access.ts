// Course access lasts COURSE_ACCESS_DAYS from payment (subscriptions.expires_at,
// 0046). Keep both numbers in step with course_access_days() and
// course_renewal_window_days() in the database.
export const COURSE_ACCESS_DAYS = 30;
export const RENEWAL_WINDOW_DAYS = 3;

const DAY_MS = 86_400_000;

export interface CourseAccessState {
  expired: boolean;
  // Whole days left, rounded up: access ending in 2h still shows "1 day left".
  daysLeft: number;
  // 0..1 share of the access period still remaining, for progress bars.
  remainingRatio: number;
  // Renewal is open in the last RENEWAL_WINDOW_DAYS and after expiry.
  canRenew: boolean;
  endingSoon: boolean;
}

export function courseAccessState(expiresAt?: string | null, now = Date.now()): CourseAccessState {
  if (!expiresAt) return { expired: false, daysLeft: COURSE_ACCESS_DAYS, remainingRatio: 1, canRenew: false, endingSoon: false };
  const msLeft = new Date(expiresAt).getTime() - now;
  const expired = msLeft <= 0;
  const daysLeft = expired ? 0 : Math.ceil(msLeft / DAY_MS);
  const endingSoon = !expired && msLeft <= RENEWAL_WINDOW_DAYS * DAY_MS;
  return {
    expired,
    daysLeft,
    remainingRatio: Math.min(1, Math.max(0, msLeft / (COURSE_ACCESS_DAYS * DAY_MS))),
    canRenew: expired || endingSoon,
    endingSoon,
  };
}

export function formatCourseDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function daysLeftLabel(state: CourseAccessState) {
  if (state.expired) return "Expired";
  return `${state.daysLeft} day${state.daysLeft === 1 ? "" : "s"} left`;
}

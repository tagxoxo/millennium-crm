import type { Lead, Policy } from "@/lib/types";
import { daysUntilRenewal, formatDate, parseLocalDate } from "@/lib/utils";

/** Call them this many months after they cancelled or lapsed. */
export const WIN_BACK_MONTHS = 6;

export function todayYmd(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarMonths(dateString: string, months: number): string {
  const date = parseLocalDate(dateString);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${d}`;
}

export function winBackCallDate(leftOn: string): string {
  return addCalendarMonths(leftOn.slice(0, 10), WIN_BACK_MONTHS);
}

export function isWinBackCandidate(
  policy: Pick<Policy, "stage" | "cancelled_on" | "is_historical">
): boolean {
  if (policy.is_historical) return false;
  return policy.stage === "lapsed" || Boolean(policy.cancelled_on);
}

export function policyLeftOn(
  policy: Pick<Policy, "cancelled_on" | "renewal_date">
): string {
  return (policy.cancelled_on || policy.renewal_date).slice(0, 10);
}

export function leadLeftOn(lead: Pick<Lead, "left_on" | "created_at">): string {
  return (lead.left_on || lead.created_at).slice(0, 10);
}

export type WinBackTone = "ready" | "soon" | "later";

export function winBackTiming(callOn: string): { label: string; tone: WinBackTone } {
  const days = daysUntilRenewal(callOn);
  if (days <= 0) return { label: "Ready to call", tone: "ready" };
  if (days === 1) return { label: "Call in 1 day", tone: "soon" };
  if (days <= 30) return { label: `Call in ${days} days`, tone: "soon" };
  return { label: "Upcoming", tone: "later" };
}

export function policyWinBackReason(
  policy: Pick<Policy, "cancelled_on" | "renewal_date">
): string {
  if (policy.cancelled_on) return `Cancelled ${formatDate(policy.cancelled_on)}`;
  return `Lapsed ${formatDate(policy.renewal_date)}`;
}

export function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

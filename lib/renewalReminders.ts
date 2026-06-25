import type { Policy } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";
import type { Carrier } from "@/lib/types";
import { daysUntilRenewal, parseLocalDate } from "@/lib/utils";

export const RENEWAL_REMINDER_DAYS = 45;
export const RENEWAL_REMINDER_LOOKBACK_DAYS = 50;
export const RENEWAL_REMINDER_STATS_DAYS = 30;

export type RenewalEmailStatus = "sent" | "needed" | "none";

export const EMAIL_COMMUNICATION_TYPES = [
  "renewal_reminder_45",
  "non_pay_alert",
  "manual_policy_review",
  "welcome_email",
  "email",
] as const;

export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function carrierDisplayName(carrier: string): string {
  if (carrier in CARRIER_LABELS) {
    return CARRIER_LABELS[carrier as Carrier];
  }
  return carrier;
}

export function getTargetRenewalDate45DaysFromToday(): string {
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + RENEWAL_REMINDER_DAYS);
  return formatDateYMD(target);
}

export function isActiveForRenewalReminder(stage: Policy["stage"]): boolean {
  return stage !== "lapsed";
}

export function getRenewalEmailStatus(
  policy: Policy,
  recentReminderPolicyIds: Set<string>
): RenewalEmailStatus {
  const days = daysUntilRenewal(policy.renewal_date);
  if (days > RENEWAL_REMINDER_DAYS) return "none";
  if (recentReminderPolicyIds.has(policy.id)) return "sent";
  return "needed";
}

export function countPoliciesNeedingOutreach(
  policies: Policy[],
  recentReminderPolicyIds: Set<string>
): number {
  return policies.filter((policy) => {
    if (!isActiveForRenewalReminder(policy.stage)) return false;
    const days = daysUntilRenewal(policy.renewal_date);
    if (days < 0 || days > RENEWAL_REMINDER_DAYS) return false;
    return !recentReminderPolicyIds.has(policy.id);
  }).length;
}

export function languageFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  if (/spanish/i.test(notes)) return "Spanish";
  if (/english/i.test(notes)) return "English";
  return null;
}

export function formatContactDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function isWithinRenewalWindow(policy: Policy): boolean {
  const days = daysUntilRenewal(policy.renewal_date);
  return days >= 0 && days <= RENEWAL_REMINDER_DAYS;
}

export function renewalDateMatches(dateString: string, targetYMD: string): boolean {
  return dateString.split("T")[0] === targetYMD;
}

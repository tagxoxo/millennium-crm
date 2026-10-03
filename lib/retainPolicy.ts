import type { Carrier, Policy, TermMonths } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";
import { formatCurrency, formatDate, normalizeTermMonths, parseLocalDate } from "@/lib/utils";

/** How long a renewed policy stays in the Retained column. */
export const RETAINED_HOLD_DAYS = 14;

export function addCalendarMonths(dateString: string, months: number): string {
  const date = parseLocalDate(dateString);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayText = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayText}`;
}

export function nextRenewalDate(
  policy: Pick<Policy, "renewal_date" | "term_months">
): string {
  return addCalendarMonths(policy.renewal_date, normalizeTermMonths(policy.term_months));
}

export function isWithinRetainedHold(
  policy: Pick<Policy, "stage" | "retained_at">,
  now = new Date()
): boolean {
  if (policy.stage !== "retained" || !policy.retained_at) return false;
  const retainedAt = new Date(policy.retained_at);
  if (Number.isNaN(retainedAt.getTime())) return false;
  const ageMs = now.getTime() - retainedAt.getTime();
  return ageMs <= RETAINED_HOLD_DAYS * 24 * 60 * 60 * 1000;
}

export function isRetainedHoldExpired(
  policy: Pick<Policy, "stage" | "retained_at">,
  now = new Date()
): boolean {
  if (policy.stage !== "retained" || !policy.retained_at) return false;
  return !isWithinRetainedHold(policy, now);
}

export function buildRenewedNotes(input: {
  oldRenewalDate: string;
  newRenewalDate: string;
  oldPremium: number;
  newPremium: number;
  oldCarrier?: Carrier | null;
  newCarrier?: Carrier | null;
}): string {
  const note = `Renewed: ${formatDate(input.oldRenewalDate)} → ${formatDate(input.newRenewalDate)}, ${formatCurrency(input.oldPremium)} → ${formatCurrency(input.newPremium)}`;
  if (
    input.oldCarrier &&
    input.newCarrier &&
    input.oldCarrier !== input.newCarrier
  ) {
    return `${note}, ${CARRIER_LABELS[input.oldCarrier]} → ${CARRIER_LABELS[input.newCarrier]}`;
  }
  return note;
}

export function termLabel(termMonths: TermMonths | number | null | undefined): string {
  return normalizeTermMonths(termMonths) === 6 ? "6 months" : "12 months";
}

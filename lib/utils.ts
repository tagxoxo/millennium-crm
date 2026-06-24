export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse YYYY-MM-DD (or ISO date prefix) as local calendar date — avoids UTC off-by-one. */
export function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntilRenewal(renewalDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = parseLocalDate(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  const diffMs = renewal.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function renewalColor(days: number): string {
  if (days < 7) return "text-red-400";
  if (days < 14) return "text-yellow-400";
  return "text-green-400";
}

export function normalizeTermMonths(value?: number | null): 6 | 12 {
  return value === 6 ? 6 : 12;
}

/** Convert written premium to annual equivalent (6-month policies × 2). */
export function annualizedPremium(
  premium: number,
  termMonths?: number | null
): number {
  return normalizeTermMonths(termMonths) === 6 ? premium * 2 : premium;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

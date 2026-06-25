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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

/** Safe folder name from client name for R2 paths (e.g. "Maria Garcia" → "Maria_Garcia") */
export function sanitizeClientFolder(clientName: string): string {
  const cleaned = clientName
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u2028\u2029\u00A0]/g, "")
    .replace(/[^a-zA-Z0-9\s._-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);

  return cleaned || "Unknown_Client";
}

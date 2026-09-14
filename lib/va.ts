export const VA_ACCESS_COOKIE = "va_access_token";
export const AGENCY_TZ = "America/Chicago";

/** CRM metrics page — never a /va-* URL, so VAs cannot confuse it with the portal. */
export const TICKET_CENTER_INSIGHTS_PATH = "/ticket-center/insights";

export function isVaPortalPath(pathname: string): boolean {
  return (
    pathname === "/va" ||
    pathname.startsWith("/va/") ||
    pathname === "/api/va" ||
    pathname.startsWith("/api/va/")
  );
}

/** Old CRM URL that looked like the VA portal. Always send people to /va. */
export function isConfusableVaInsightsPath(pathname: string): boolean {
  return pathname === "/va-insights" || pathname.startsWith("/va-insights/");
}

export const VA_FORM_REQUEST_TYPES = [
  "payment",
  "policy_change",
  "new_quote",
] as const;

export const VA_REQUEST_TYPES = [
  ...VA_FORM_REQUEST_TYPES,
  "add_vehicle",
  "remove_vehicle",
  "add_a_driver",
  "add_remove_driver",
  "payment_question",
  "other",
] as const;

export const VA_CARRIERS = ["trexis", "progressive", "safeway"] as const;

export type VaRequestType = (typeof VA_REQUEST_TYPES)[number];
export type VaFormRequestType = (typeof VA_FORM_REQUEST_TYPES)[number];
export type VaCarrier = (typeof VA_CARRIERS)[number];

export type VaLanguage = "english" | "spanish";

export type VaStatus = "pending" | "sent_to_agent" | "completed";

export type VaRequest = {
  id: string;
  created_at: string;
  caller_name: string;
  policy_number: string | null;
  phone_number: string | null;
  email: string | null;
  request_type: VaRequestType;
  carrier: VaCarrier | null;
  language: VaLanguage;
  notes: string | null;
  intake: { label: string; answer: string }[];
  status: VaStatus;
  completed_at: string | null;
  submitted_by: string | null;
};

export const VA_REQUEST_TYPE_LABELS: Record<VaRequestType, string> = {
  payment: "Payment",
  policy_change: "Policy change",
  new_quote: "New quote",
  add_vehicle: "Add vehicle",
  remove_vehicle: "Remove vehicle",
  add_a_driver: "Add a driver",
  add_remove_driver: "Add/remove driver",
  payment_question: "Payment question",
  other: "Other",
};

export const VA_CARRIER_LABELS: Record<VaCarrier, string> = {
  trexis: "Trexis",
  progressive: "Progressive",
  safeway: "Safeway",
};

export const VA_STATUS_LABELS: Record<VaStatus, string> = {
  pending: "Pending",
  sent_to_agent: "Sent to agent",
  completed: "Completed",
};

export function isVaRequestType(value: string): value is VaRequestType {
  return (VA_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isVaFormRequestType(value: string): value is VaFormRequestType {
  return (VA_FORM_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isVaCarrier(value: string): value is VaCarrier {
  return (VA_CARRIERS as readonly string[]).includes(value);
}

export function todayInAgencyTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: AGENCY_TZ });
}

export function isTodayInAgencyTz(iso: string): boolean {
  return (
    new Date(iso).toLocaleDateString("en-CA", { timeZone: AGENCY_TZ }) ===
    todayInAgencyTz()
  );
}

export function formatVaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: AGENCY_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatVaDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatVaDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: AGENCY_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

import type { Carrier, ContactType, OutreachStatus, Stage } from "@/lib/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { daysAgoISO, RENEWAL_REMINDER_STATS_DAYS } from "@/lib/renewalReminders";
import { daysUntilRenewal } from "@/lib/utils";

export const OUTREACH_TYPE_LABELS: Record<ContactType, string> = {
  call: "Call",
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  non_pay_alert: "Non-Pay Alert",
  non_pay_resolved: "Non-Pay Resolved",
  renewal_reminder_45: "45-Day Renewal Reminder",
  manual_policy_review: "Policy Review",
  policy_review_response: "Policy Review Response",
  welcome_email: "Welcome Email",
};

export interface OutreachActivity {
  id: string;
  contact_date: string;
  contact_type: ContactType;
  outcome: string | null;
  notes: string | null;
  status: OutreachStatus;
  policy_id: string;
  client_name: string;
  client_id: string | null;
  carrier: Carrier;
  policy_number: string | null;
  email: string | null;
  stage: Stage;
  renewal_date: string;
  spanish_speaker: boolean;
}

export interface ServiceCenterStats {
  totalLast30Days: number;
  nonPayAlerts30: number;
  renewalReminders30: number;
  welcomeEmails30: number;
  resolvedNonPay30: number;
}

function normalizeStatus(
  status: string | null | undefined,
  outcome: string | null,
  notes: string | null
): OutreachStatus {
  if (status === "sent" || status === "failed" || status === "pending") {
    return status;
  }
  const text = `${outcome ?? ""} ${notes ?? ""}`.toLowerCase();
  if (text.includes("fail")) return "failed";
  if (text.includes("pending")) return "pending";
  return "sent";
}

export function outreachLanguage(activity: OutreachActivity): "English" | "Spanish" | "—" {
  if (activity.spanish_speaker) return "Spanish";
  if (activity.notes && /english/i.test(activity.notes)) return "English";
  if (activity.notes && /spanish/i.test(activity.notes)) return "Spanish";
  return "English";
}

export function daysSinceContact(contactDate: string): number {
  const sent = new Date(contactDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sent.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
}

export function isNonPayAlertResolved(
  alert: OutreachActivity,
  activities: OutreachActivity[]
): boolean {
  return activities.some(
    (a) =>
      a.contact_type === "non_pay_resolved" &&
      a.policy_id === alert.policy_id &&
      a.contact_date >= alert.contact_date
  );
}

export function getPolicyReviewResponses(
  review: OutreachActivity,
  activities: OutreachActivity[]
): OutreachActivity[] {
  return activities.filter(
    (a) =>
      a.contact_type === "policy_review_response" &&
      a.policy_id === review.policy_id &&
      a.contact_date >= review.contact_date
  );
}

export type RenewalOutcomeColor = "green" | "red" | "yellow";

export function getRenewalOutcomeColor(activity: OutreachActivity): RenewalOutcomeColor {
  if (activity.stage === "retained") return "green";
  if (activity.stage === "lapsed") return "red";
  const days = daysUntilRenewal(activity.renewal_date);
  if (days >= 0) return "yellow";
  return "red";
}

export async function fetchOutreachActivity(): Promise<{
  activities: OutreachActivity[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const pageSize = 1000;
    let from = 0;
    const all: OutreachActivity[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("contact_log")
        .select(
          `
          id,
          contact_date,
          contact_type,
          outcome,
          notes,
          status,
          policy_id,
          policies (
            client_name,
            client_id,
            carrier,
            policy_number,
            email,
            stage,
            renewal_date,
            spanish_speaker
          )
        `
        )
        .order("contact_date", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) return { activities: [], error: error.message };
      if (!data || data.length === 0) break;

      for (const row of data) {
        const rawPolicy = row.policies;
        const policy = Array.isArray(rawPolicy) ? rawPolicy[0] : rawPolicy;
        if (!policy) continue;
        all.push({
          id: row.id,
          contact_date: row.contact_date,
          contact_type: row.contact_type as ContactType,
          outcome: row.outcome,
          notes: row.notes,
          status: normalizeStatus(row.status, row.outcome, row.notes),
          policy_id: row.policy_id,
          client_name: policy.client_name,
          client_id: policy.client_id,
          carrier: policy.carrier as Carrier,
          policy_number: policy.policy_number,
          email: policy.email,
          stage: policy.stage as Stage,
          renewal_date: policy.renewal_date,
          spanish_speaker: Boolean(policy.spanish_speaker),
        });
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return { activities: all, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { activities: [], error: message };
  }
}

export function computeServiceCenterStats(
  activities: OutreachActivity[]
): ServiceCenterStats {
  const cutoff = daysAgoISO(RENEWAL_REMINDER_STATS_DAYS);
  const recent = activities.filter((a) => a.contact_date >= cutoff);

  return {
    totalLast30Days: recent.length,
    nonPayAlerts30: recent.filter((a) => a.contact_type === "non_pay_alert").length,
    renewalReminders30: recent.filter(
      (a) => a.contact_type === "renewal_reminder_45"
    ).length,
    welcomeEmails30: recent.filter((a) => a.contact_type === "welcome_email")
      .length,
    resolvedNonPay30: recent.filter((a) => a.contact_type === "non_pay_resolved")
      .length,
  };
}

export function exportActivitiesCsv(
  rows: OutreachActivity[],
  extraColumns: string[] = []
): string {
  const baseHeaders = [
    "Date",
    "Client",
    "Carrier",
    "Policy Number",
    "Type",
    "Language",
    "Status",
    "Notes",
    ...extraColumns,
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const lines = [
    baseHeaders.join(","),
    ...rows.map((a) => {
      const cols = [
        a.contact_date,
        a.client_name,
        a.carrier,
        a.policy_number ?? "",
        OUTREACH_TYPE_LABELS[a.contact_type],
        outreachLanguage(a),
        a.status,
        a.notes ?? a.outcome ?? "",
      ];
      return cols.map(escape).join(",");
    }),
  ];

  return lines.join("\n");
}

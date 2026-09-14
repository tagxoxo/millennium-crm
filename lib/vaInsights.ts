import { getSupabaseServer } from "@/lib/supabase/server";
import {
  AGENCY_TZ,
  todayInAgencyTz,
  VA_CARRIER_LABELS,
  VA_REQUEST_TYPE_LABELS,
  type VaRequest,
} from "@/lib/va";

export const VA_INSIGHT_RANGES = ["today", "7d", "30d", "all"] as const;
export type VaInsightRange = (typeof VA_INSIGHT_RANGES)[number];

export const VA_INSIGHT_RANGE_LABELS: Record<VaInsightRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

const UNKNOWN_VA_ID = "00000000-0000-0000-0000-000000000000";

export type VaCountSlice = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

export type VaDailyMetricRow = {
  metric_date: string;
  va_user_id: string;
  va_email: string | null;
  tickets_submitted: number;
  tickets_completed: number;
  tickets_open_eod: number;
  spanish_count: number;
  english_count: number;
  by_request_type: Record<string, number>;
  by_carrier: Record<string, number>;
  avg_complete_minutes: number | null;
  updated_at: string;
};

export type VaPersonStats = {
  vaUserId: string;
  email: string;
  submitted: number;
  completed: number;
  open: number;
  spanish: number;
};

export type VaInsights = {
  range: VaInsightRange;
  submitted: number;
  completed: number;
  open: number;
  spanishPercent: number;
  avgCompleteLabel: string;
  byVa: VaPersonStats[];
  byType: VaCountSlice[];
  byCarrier: VaCountSlice[];
  byLanguage: VaCountSlice[];
  tickets: VaRequest[];
};

function agencyDateOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: AGENCY_TZ });
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day) + days * 24 * 60 * 60 * 1000;
  return new Date(utc).toISOString().slice(0, 10);
}

export function isVaInsightRange(value: string | undefined): value is VaInsightRange {
  return (VA_INSIGHT_RANGES as readonly string[]).includes(value ?? "");
}

export function rangeStartDate(range: VaInsightRange): string | null {
  const today = todayInAgencyTz();
  if (range === "all") return null;
  if (range === "today") return today;
  if (range === "7d") return shiftDate(today, -6);
  return shiftDate(today, -29);
}

function inRange(dateStr: string, start: string | null): boolean {
  if (!start) return true;
  return dateStr >= start;
}

function vaKey(ticket: VaRequest): string {
  return ticket.submitted_by || UNKNOWN_VA_ID;
}

function toSlices(counts: Record<string, number>, labels: Record<string, string>): VaCountSlice[] {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));
}

function formatAvgMinutes(minutes: number | null): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours >= 10 ? 0 : 1)} hr`;
}

export function computeVaInsights(
  tickets: VaRequest[],
  range: VaInsightRange,
  emailById: Record<string, string>
): VaInsights {
  const start = rangeStartDate(range);
  const submittedTickets = tickets.filter((ticket) =>
    inRange(agencyDateOf(ticket.created_at), start)
  );
  const completedTickets = tickets.filter(
    (ticket) =>
      ticket.completed_at && inRange(agencyDateOf(ticket.completed_at), start)
  );
  const openTickets = tickets.filter((ticket) => ticket.status !== "completed");

  const spanish = submittedTickets.filter((ticket) => ticket.language === "spanish").length;
  const english = submittedTickets.filter((ticket) => ticket.language === "english").length;

  const completeMinutes = completedTickets
    .map((ticket) => {
      if (!ticket.completed_at) return null;
      return (
        (new Date(ticket.completed_at).getTime() -
          new Date(ticket.created_at).getTime()) /
        60000
      );
    })
    .filter((n): n is number => n != null && n >= 0);
  const avgMinutes =
    completeMinutes.length > 0
      ? completeMinutes.reduce((sum, n) => sum + n, 0) / completeMinutes.length
      : null;

  const byTypeCounts: Record<string, number> = {};
  const byCarrierCounts: Record<string, number> = {};
  for (const ticket of submittedTickets) {
    byTypeCounts[ticket.request_type] = (byTypeCounts[ticket.request_type] ?? 0) + 1;
    if (ticket.carrier) {
      byCarrierCounts[ticket.carrier] = (byCarrierCounts[ticket.carrier] ?? 0) + 1;
    }
  }

  const vaIds = new Set<string>();
  for (const ticket of tickets) vaIds.add(vaKey(ticket));
  for (const id of Object.keys(emailById)) vaIds.add(id);

  const byVa: VaPersonStats[] = [...vaIds].map((id) => {
    const submitted = submittedTickets.filter((ticket) => vaKey(ticket) === id);
    const completed = completedTickets.filter((ticket) => vaKey(ticket) === id);
    const open = openTickets.filter((ticket) => vaKey(ticket) === id);
    return {
      vaUserId: id,
      email: emailById[id] || (id === UNKNOWN_VA_ID ? "Unknown VA" : id),
      submitted: submitted.length,
      completed: completed.length,
      open: open.length,
      spanish: submitted.filter((ticket) => ticket.language === "spanish").length,
    };
  }).sort((a, b) => b.submitted - a.submitted);

  return {
    range,
    submitted: submittedTickets.length,
    completed: completedTickets.length,
    open: openTickets.length,
    spanishPercent:
      submittedTickets.length > 0 ? (spanish / submittedTickets.length) * 100 : 0,
    avgCompleteLabel: formatAvgMinutes(avgMinutes),
    byVa,
    byType: toSlices(byTypeCounts, VA_REQUEST_TYPE_LABELS),
    byCarrier: toSlices(byCarrierCounts, VA_CARRIER_LABELS),
    byLanguage: toSlices(
      { english, spanish },
      { english: "English", spanish: "Spanish" }
    ),
    tickets: submittedTickets,
  };
}

function buildDailyRows(
  tickets: VaRequest[],
  emailById: Record<string, string>
): VaDailyMetricRow[] {
  const dates = new Set<string>();
  for (const ticket of tickets) {
    dates.add(agencyDateOf(ticket.created_at));
    if (ticket.completed_at) dates.add(agencyDateOf(ticket.completed_at));
  }
  dates.add(todayInAgencyTz());

  const vaIds = new Set<string>([UNKNOWN_VA_ID]);
  for (const ticket of tickets) vaIds.add(vaKey(ticket));
  for (const id of Object.keys(emailById)) vaIds.add(id);

  const rows: VaDailyMetricRow[] = [];

  for (const date of [...dates].sort()) {
    for (const vaId of vaIds) {
      const submitted = tickets.filter(
        (ticket) => vaKey(ticket) === vaId && agencyDateOf(ticket.created_at) === date
      );
      const completed = tickets.filter(
        (ticket) =>
          vaKey(ticket) === vaId &&
          ticket.completed_at &&
          agencyDateOf(ticket.completed_at) === date
      );
      const openEod = tickets.filter((ticket) => {
        if (vaKey(ticket) !== vaId) return false;
        if (agencyDateOf(ticket.created_at) > date) return false;
        if (!ticket.completed_at) return true;
        return agencyDateOf(ticket.completed_at) > date;
      });

      if (
        submitted.length === 0 &&
        completed.length === 0 &&
        openEod.length === 0 &&
        !emailById[vaId]
      ) {
        continue;
      }
      if (
        submitted.length === 0 &&
        completed.length === 0 &&
        vaId !== UNKNOWN_VA_ID &&
        openEod.length === 0
      ) {
        // Keep a row for known VAs on days with activity only
        continue;
      }
      if (submitted.length === 0 && completed.length === 0) continue;

      const byType: Record<string, number> = {};
      const byCarrier: Record<string, number> = {};
      let spanish = 0;
      let english = 0;
      for (const ticket of submitted) {
        byType[ticket.request_type] = (byType[ticket.request_type] ?? 0) + 1;
        if (ticket.carrier) {
          byCarrier[ticket.carrier] = (byCarrier[ticket.carrier] ?? 0) + 1;
        }
        if (ticket.language === "spanish") spanish += 1;
        else english += 1;
      }

      const minutes = completed
        .map((ticket) =>
          ticket.completed_at
            ? (new Date(ticket.completed_at).getTime() -
                new Date(ticket.created_at).getTime()) /
              60000
            : null
        )
        .filter((n): n is number => n != null && n >= 0);
      const avg =
        minutes.length > 0
          ? minutes.reduce((sum, n) => sum + n, 0) / minutes.length
          : null;

      rows.push({
        metric_date: date,
        va_user_id: vaId,
        va_email: emailById[vaId] ?? (vaId === UNKNOWN_VA_ID ? "unknown" : null),
        tickets_submitted: submitted.length,
        tickets_completed: completed.length,
        tickets_open_eod: openEod.length,
        spanish_count: spanish,
        english_count: english,
        by_request_type: byType,
        by_carrier: byCarrier,
        avg_complete_minutes: avg,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return rows;
}

export async function fetchVaEmailMap(): Promise<Record<string, string>> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from("users").select("id, email, role");
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.email) map[row.id] = row.email;
  }
  return map;
}

export async function syncVaDailyMetrics(
  tickets: VaRequest[],
  emailById: Record<string, string>
): Promise<{ error: string | null }> {
  const rows = buildDailyRows(tickets, emailById);
  if (rows.length === 0) return { error: null };

  const supabase = getSupabaseServer();
  const payload = rows.map((row) => ({
    metric_date: row.metric_date,
    va_user_id: row.va_user_id,
    va_email: row.va_email,
    tickets_submitted: row.tickets_submitted,
    tickets_completed: row.tickets_completed,
    tickets_open_eod: row.tickets_open_eod,
    spanish_count: row.spanish_count,
    english_count: row.english_count,
    by_request_type: row.by_request_type,
    by_carrier: row.by_carrier,
    avg_complete_minutes: row.avg_complete_minutes,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("va_daily_metrics")
    .upsert(payload, { onConflict: "metric_date,va_user_id" });

  return { error: error?.message ?? null };
}

export async function fetchVaDailyMetrics(): Promise<{
  rows: VaDailyMetricRow[];
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("va_daily_metrics")
    .select(
      "metric_date, va_user_id, va_email, tickets_submitted, tickets_completed, tickets_open_eod, spanish_count, english_count, by_request_type, by_carrier, avg_complete_minutes, updated_at"
    )
    .order("metric_date", { ascending: false })
    .limit(90);

  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []).map((row) => ({
    ...row,
    metric_date:
      typeof row.metric_date === "string"
        ? row.metric_date.slice(0, 10)
        : row.metric_date,
    by_request_type: (row.by_request_type ?? {}) as Record<string, number>,
    by_carrier: (row.by_carrier ?? {}) as Record<string, number>,
    avg_complete_minutes:
      row.avg_complete_minutes == null ? null : Number(row.avg_complete_minutes),
  })) as VaDailyMetricRow[];

  return { rows, error: null };
}

export async function refreshSavedVaMetrics(): Promise<{ error: string | null }> {
  const supabaseTickets = getSupabaseServer();
  const { data, error } = await supabaseTickets
    .from("va_requests")
    .select(
      "id, created_at, caller_name, policy_number, phone_number, request_type, carrier, language, notes, status, completed_at, submitted_by"
    );

  if (error) return { error: error.message };
  const emailById = await fetchVaEmailMap();
  return syncVaDailyMetrics((data ?? []) as VaRequest[], emailById);
}

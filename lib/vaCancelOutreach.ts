import { formatVaDate, todayInAgencyTz } from "@/lib/va";
import { parseLocalDate } from "@/lib/utils";

export const CANCEL_CADENCE = [
  { day: 1, label: "Call + Leave Voicemail", needsCall: true, needsVm: true },
  { day: 2, label: "Only Call", needsCall: true, needsVm: false },
  { day: 3, label: "Leave VM", needsCall: false, needsVm: true },
  { day: 5, label: "Only Call", needsCall: true, needsVm: false },
  { day: 8, label: "Call + Leave VM", needsCall: true, needsVm: true },
] as const;

export type CancelCadenceDay = (typeof CANCEL_CADENCE)[number]["day"];
export type CancelCadenceStep = (typeof CANCEL_CADENCE)[number];
export type CancelAttemptKind = "call" | "vm" | "spoke";
export type CancelOutreachStatus = "active" | "reinstated" | "closed";
export type CancelLogAction =
  | "call"
  | "vm"
  | "call_vm"
  | "spoke"
  | "reinstated"
  | "closed"
  | "reopen";

export type CancelAttempt = {
  day: CancelCadenceDay;
  kind: CancelAttemptKind;
  at: string;
  note?: string;
};

export type CancelOutreach = {
  id: string;
  created_at: string;
  client_name: string;
  phone_number: string;
  policy_number: string;
  cancelled_date: string;
  start_date: string;
  amount_due: number;
  status: CancelOutreachStatus;
  attempts: CancelAttempt[];
  notes: string | null;
  submitted_by: string | null;
};

export type CancelStepState = "done" | "due" | "overdue" | "upcoming" | "rest";

export type CancelTrackerKind =
  | "due_today"
  | "overdue"
  | "rest_day"
  | "weekend"
  | "cadence_complete"
  | "not_started"
  | "reinstated"
  | "closed";

export type CancelTrackerState = {
  kind: CancelTrackerKind;
  dayNumber: number;
  dueStep: CancelCadenceStep | null;
  nextStep: CancelCadenceStep | null;
  nextDate: string | null;
  headline: string;
  detail: string;
};

const CADENCE_DAYS = new Set<number>(CANCEL_CADENCE.map((step) => step.day));

export function isCancelCadenceDay(value: number): value is CancelCadenceDay {
  return CADENCE_DAYS.has(value);
}

export function isCancelOutreachStatus(
  value: string
): value is CancelOutreachStatus {
  return value === "active" || value === "reinstated" || value === "closed";
}

export function parseAmountDue(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function formatAmountDue(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function addDaysYmd(ymd: string, days: number): string {
  const date = parseLocalDate(ymd);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function yesterdayInAgencyTz(): string {
  return addDaysYmd(todayInAgencyTz(), -1);
}

export function isWeekendYmd(ymd: string): boolean {
  const weekday = parseLocalDate(ymd).getDay();
  return weekday === 0 || weekday === 6;
}

export function nextWeekday(ymd: string): string {
  let date = ymd;
  while (isWeekendYmd(date)) {
    date = addDaysYmd(date, 1);
  }
  return date;
}

export function nextWeekdayAfter(ymd: string): string {
  return nextWeekday(addDaysYmd(ymd, 1));
}

/** Move forward by N weekdays. 0 keeps the first weekday on or after the date. */
export function addBusinessDays(ymd: string, days: number): string {
  let date = nextWeekday(ymd);
  for (let i = 0; i < days; i++) {
    date = addDaysYmd(date, 1);
    date = nextWeekday(date);
  }
  return date;
}

export function cadenceStartDate(
  row: Pick<CancelOutreach, "start_date" | "cancelled_date">
): string {
  return row.start_date || row.cancelled_date;
}

export function cadenceDayNumber(
  startDate: string,
  todayYmd = todayInAgencyTz()
): number {
  const start = nextWeekday(startDate);
  if (parseLocalDate(todayYmd) < parseLocalDate(start)) return 0;

  let count = 0;
  let date = start;
  while (parseLocalDate(date) <= parseLocalDate(todayYmd)) {
    if (!isWeekendYmd(date)) count += 1;
    date = addDaysYmd(date, 1);
  }
  return count;
}

export function stepDate(startDate: string, day: number): string {
  return addBusinessDays(startDate, day - 1);
}

export function parseAttempts(value: unknown): CancelAttempt[] {
  if (!Array.isArray(value)) return [];
  const rows: CancelAttempt[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const day = Number(row.day);
    const kind = String(row.kind ?? "");
    const at = String(row.at ?? "");
    if (!isCancelCadenceDay(day)) continue;
    if (kind !== "call" && kind !== "vm" && kind !== "spoke") continue;
    if (!at) continue;
    const note = String(row.note ?? "").trim();
    rows.push({
      day,
      kind,
      at,
      note: note || undefined,
    });
  }
  return rows;
}

export function mapCancelRow(row: Record<string, unknown>): CancelOutreach {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    client_name: String(row.client_name ?? ""),
    phone_number: String(row.phone_number ?? ""),
    policy_number: String(row.policy_number ?? ""),
    cancelled_date: String(row.cancelled_date ?? "").slice(0, 10),
    start_date: String(row.start_date ?? row.cancelled_date ?? "").slice(0, 10),
    amount_due: Number(row.amount_due ?? 0) || 0,
    status: isCancelOutreachStatus(String(row.status ?? "active"))
      ? (row.status as CancelOutreachStatus)
      : "active",
    attempts: parseAttempts(row.attempts),
    notes: row.notes == null ? null : String(row.notes),
    submitted_by: row.submitted_by == null ? null : String(row.submitted_by),
  };
}

export function dueStepProgress(
  step: CancelCadenceStep,
  attempts: CancelAttempt[]
): { called: boolean; vm: boolean; spoke: boolean } {
  const dayAttempts = attempts.filter((item) => item.day === step.day);
  const spoke = dayAttempts.some((item) => item.kind === "spoke");
  return {
    spoke,
    called: spoke || dayAttempts.some((item) => item.kind === "call"),
    vm: spoke || dayAttempts.some((item) => item.kind === "vm"),
  };
}

export function stepIsComplete(
  step: CancelCadenceStep,
  attempts: CancelAttempt[]
): boolean {
  const progress = dueStepProgress(step, attempts);
  if (progress.spoke) return true;
  if (step.needsCall && !progress.called) return false;
  if (step.needsVm && !progress.vm) return false;
  return true;
}

export function stepState(
  step: CancelCadenceStep,
  row: Pick<CancelOutreach, "start_date" | "cancelled_date" | "attempts" | "status">,
  todayYmd = todayInAgencyTz()
): CancelStepState {
  if (stepIsComplete(step, row.attempts)) return "done";
  const date = stepDate(cadenceStartDate(row), step.day);
  if (todayYmd < date) return "upcoming";
  if (todayYmd === date) return "due";
  return "overdue";
}

export function getTrackerState(
  row: Pick<
    CancelOutreach,
    "start_date" | "cancelled_date" | "attempts" | "status"
  >,
  todayYmd = todayInAgencyTz()
): CancelTrackerState {
  const startDate = cadenceStartDate(row);
  const dayNumber = cadenceDayNumber(startDate, todayYmd);

  if (row.status === "reinstated") {
    return {
      kind: "reinstated",
      dayNumber,
      dueStep: null,
      nextStep: null,
      nextDate: null,
      headline: "Reinstated",
      detail: "They came back — no more calls on this cadence.",
    };
  }

  if (row.status === "closed") {
    return {
      kind: "closed",
      dayNumber,
      dueStep: null,
      nextStep: null,
      nextDate: null,
      headline: "Stopped",
      detail: "Taken off the call list.",
    };
  }

  if (dayNumber < 1) {
    const first = CANCEL_CADENCE[0];
    return {
      kind: "not_started",
      dayNumber,
      dueStep: null,
      nextStep: first,
      nextDate: stepDate(startDate, first.day),
      headline: "Not started yet",
      detail: `First call is ${formatVaDate(stepDate(startDate, first.day))}.`,
    };
  }

  const dueStep =
    CANCEL_CADENCE.find(
      (step) => step.day <= dayNumber && !stepIsComplete(step, row.attempts)
    ) ?? null;

  const nextStep =
    CANCEL_CADENCE.find((step) => step.day > dayNumber) ?? null;

  if (isWeekendYmd(todayYmd)) {
    const nextBiz = nextWeekdayAfter(todayYmd);
    if (dueStep) {
      return {
        kind: "weekend",
        dayNumber,
        dueStep,
        nextStep: dueStep,
        nextDate: nextBiz,
        headline: "Weekend — no call today",
        detail: `Next weekday ${formatVaDate(nextBiz)}: Day ${dueStep.day} · ${dueStep.label}`,
      };
    }
    if (!nextStep) {
      return {
        kind: "cadence_complete",
        dayNumber,
        dueStep: null,
        nextStep: null,
        nextDate: null,
        headline: "Cadence complete",
        detail: "All 5 call days are done.",
      };
    }
    return {
      kind: "weekend",
      dayNumber,
      dueStep: null,
      nextStep,
      nextDate: stepDate(startDate, nextStep.day),
      headline: "Weekend — no call today",
      detail: `Next: Day ${nextStep.day} · ${nextStep.label} · ${formatVaDate(
        stepDate(startDate, nextStep.day)
      )}`,
    };
  }

  if (dueStep) {
    const overdue = dueStep.day < dayNumber;
    return {
      kind: overdue ? "overdue" : "due_today",
      dayNumber,
      dueStep,
      nextStep: dueStep,
      nextDate: stepDate(startDate, dueStep.day),
      headline: overdue
        ? `Catch up — Day ${dueStep.day}`
        : `Today — Day ${dueStep.day}`,
      detail: dueStep.label,
    };
  }

  if (!nextStep) {
    return {
      kind: "cadence_complete",
      dayNumber,
      dueStep: null,
      nextStep: null,
      nextDate: null,
      headline: "Cadence complete",
      detail: "All 5 call days are done.",
    };
  }

  return {
    kind: "rest_day",
    dayNumber,
    dueStep: null,
    nextStep,
    nextDate: stepDate(startDate, nextStep.day),
    headline: "All caught up today",
    detail: `Next: Day ${nextStep.day} · ${nextStep.label} · ${formatVaDate(
      stepDate(startDate, nextStep.day)
    )}`,
  };
}

export function applyCancelAction(
  row: CancelOutreach,
  action: CancelLogAction,
  note?: string
): { attempts: CancelAttempt[]; status: CancelOutreachStatus } | { error: string } {
  if (action === "reopen") {
    return { attempts: row.attempts, status: "active" };
  }

  if (action === "reinstated") {
    return { attempts: row.attempts, status: "reinstated" };
  }

  if (action === "closed") {
    return { attempts: row.attempts, status: "closed" };
  }

  if (row.status !== "active") {
    return { error: "This person is already closed. Reopen them first." };
  }

  const state = getTrackerState(row);
  if (!state.dueStep || state.kind === "weekend") {
    return { error: "No call is due on this cadence today." };
  }

  const kinds: CancelAttemptKind[] =
    action === "call_vm"
      ? [
          ...(state.dueStep.needsCall ? (["call"] as const) : []),
          ...(state.dueStep.needsVm ? (["vm"] as const) : []),
        ]
      : action === "call" || action === "vm" || action === "spoke"
        ? [action]
        : [];

  if (kinds.length === 0) {
    return { error: "Invalid call action." };
  }

  const trimmed = note?.trim();
  const next = [...row.attempts];
  const at = new Date().toISOString();

  for (const kind of kinds) {
    const exists = next.some(
      (item) => item.day === state.dueStep!.day && item.kind === kind
    );
    if (exists) continue;
    next.push({
      day: state.dueStep.day,
      kind,
      at,
      note: trimmed || undefined,
    });
  }

  return { attempts: next, status: row.status };
}

export function groupCancelRows(rows: CancelOutreach[]): {
  dueNow: CancelOutreach[];
  rest: CancelOutreach[];
  finished: CancelOutreach[];
  reinstated: CancelOutreach[];
  closed: CancelOutreach[];
} {
  const dueNow: CancelOutreach[] = [];
  const rest: CancelOutreach[] = [];
  const finished: CancelOutreach[] = [];
  const reinstated: CancelOutreach[] = [];
  const closed: CancelOutreach[] = [];

  for (const row of rows) {
    const state = getTrackerState(row);
    if (state.kind === "reinstated") {
      reinstated.push(row);
      continue;
    }
    if (state.kind === "closed") {
      closed.push(row);
      continue;
    }
    if (state.kind === "due_today" || state.kind === "overdue") {
      dueNow.push(row);
      continue;
    }
    if (state.kind === "cadence_complete") {
      finished.push(row);
      continue;
    }
    rest.push(row);
  }

  const rank = (row: CancelOutreach) => {
    const state = getTrackerState(row);
    if (state.kind === "overdue") return 0;
    if (state.kind === "due_today") return 1;
    return 2;
  };

  dueNow.sort((a, b) => rank(a) - rank(b) || a.client_name.localeCompare(b.client_name));
  rest.sort((a, b) => a.client_name.localeCompare(b.client_name));
  finished.sort((a, b) => b.start_date.localeCompare(a.start_date));
  reinstated.sort((a, b) => b.start_date.localeCompare(a.start_date));
  closed.sort((a, b) => b.start_date.localeCompare(a.start_date));

  return { dueNow, rest, finished, reinstated, closed };
}

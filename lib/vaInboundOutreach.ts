import { formatVaDate, formatVaDateTime, todayInAgencyTz } from "@/lib/va";
import {
  cadenceDayNumber,
  isWeekendYmd,
  nextWeekdayAfter,
  stepDate,
} from "@/lib/vaCancelOutreach";

export const INBOUND_CADENCE = [
  {
    day: 1,
    label: "Call + double dial, VM #1",
    needsCall: true,
    needsDoubleDial: true,
    needsVm: true,
    vmNumber: 1,
  },
  {
    day: 2,
    label: "Call",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: false,
    vmNumber: null,
  },
  {
    day: 3,
    label: "Call + VM #2",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: true,
    vmNumber: 2,
  },
  {
    day: 4,
    label: "Call",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: false,
    vmNumber: null,
  },
  {
    day: 5,
    label: "Call",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: false,
    vmNumber: null,
  },
  {
    day: 6,
    label: "Call + VM #3",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: true,
    vmNumber: 3,
  },
  {
    day: 7,
    label: "Call",
    needsCall: true,
    needsDoubleDial: false,
    needsVm: false,
    vmNumber: null,
  },
] as const;

export type InboundCadenceDay = (typeof INBOUND_CADENCE)[number]["day"];
export type InboundCadenceStep = (typeof INBOUND_CADENCE)[number];
export type InboundAttemptKind = "call" | "double_dial" | "vm" | "spoke";
export type InboundLeadStatus =
  | "active"
  | "transferred"
  | "callback"
  | "closed";
export type InboundLogAction =
  | "call"
  | "double_dial"
  | "vm"
  | "call_vm"
  | "spoke"
  | "transferred"
  | "callback"
  | "closed"
  | "reopen";

export type InboundAttempt = {
  day: InboundCadenceDay;
  kind: InboundAttemptKind;
  at: string;
  note?: string;
};

export type InboundLead = {
  id: string;
  created_at: string;
  client_name: string;
  phone_number: string;
  start_date: string;
  status: InboundLeadStatus;
  callback_at: string | null;
  attempts: InboundAttempt[];
  notes: string | null;
  submitted_by: string | null;
};

export type InboundStepState = "done" | "due" | "overdue" | "upcoming";

export type InboundTrackerKind =
  | "due_today"
  | "overdue"
  | "rest_day"
  | "weekend"
  | "cadence_complete"
  | "not_started"
  | "callback"
  | "transferred"
  | "closed";

export type InboundTrackerState = {
  kind: InboundTrackerKind;
  dayNumber: number;
  dueStep: InboundCadenceStep | null;
  nextStep: InboundCadenceStep | null;
  nextDate: string | null;
  headline: string;
  detail: string;
};

const CADENCE_DAYS = new Set<number>(INBOUND_CADENCE.map((step) => step.day));

export function isInboundCadenceDay(value: number): value is InboundCadenceDay {
  return CADENCE_DAYS.has(value);
}

export function isInboundLeadStatus(value: string): value is InboundLeadStatus {
  return (
    value === "active" ||
    value === "transferred" ||
    value === "callback" ||
    value === "closed"
  );
}

export function inboundFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

export function inboundPickupScript(fullName: string): {
  pickup: string;
  yes: string;
  no: string;
} {
  const name = inboundFirstName(fullName);
  return {
    pickup: `Hi, is this ${name}? Hey ${name}, this is Luis with Millennium Insurance. You put in a request on our website for a free car insurance quote. Do you have a quick minute?`,
    yes: "Perfect. I'm going to connect you with Jacob, our licensed agent.",
    no: "No problem — book a callback time below.",
  };
}

export function parseInboundAttempts(value: unknown): InboundAttempt[] {
  if (!Array.isArray(value)) return [];
  const rows: InboundAttempt[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const day = Number(row.day);
    const kind = String(row.kind ?? "");
    const at = String(row.at ?? "");
    if (!isInboundCadenceDay(day)) continue;
    if (
      kind !== "call" &&
      kind !== "double_dial" &&
      kind !== "vm" &&
      kind !== "spoke"
    ) {
      continue;
    }
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

export function mapInboundRow(row: Record<string, unknown>): InboundLead {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    client_name: String(row.client_name ?? ""),
    phone_number: String(row.phone_number ?? ""),
    start_date: String(row.start_date ?? "").slice(0, 10),
    status: isInboundLeadStatus(String(row.status ?? "active"))
      ? (row.status as InboundLeadStatus)
      : "active",
    callback_at: row.callback_at == null ? null : String(row.callback_at),
    attempts: parseInboundAttempts(row.attempts),
    notes: row.notes == null ? null : String(row.notes),
    submitted_by: row.submitted_by == null ? null : String(row.submitted_by),
  };
}

export function inboundStepProgress(
  step: InboundCadenceStep,
  attempts: InboundAttempt[]
): { called: boolean; doubleDialed: boolean; vm: boolean; spoke: boolean } {
  const dayAttempts = attempts.filter((item) => item.day === step.day);
  const spoke = dayAttempts.some((item) => item.kind === "spoke");
  const doubleDialed =
    spoke || dayAttempts.some((item) => item.kind === "double_dial");
  return {
    spoke,
    doubleDialed,
    called:
      spoke ||
      doubleDialed ||
      dayAttempts.some((item) => item.kind === "call"),
    vm: spoke || dayAttempts.some((item) => item.kind === "vm"),
  };
}

export function inboundStepIsComplete(
  step: InboundCadenceStep,
  attempts: InboundAttempt[]
): boolean {
  const progress = inboundStepProgress(step, attempts);
  if (progress.spoke) return true;
  if (step.needsCall && !progress.called) return false;
  if (step.needsDoubleDial && !progress.doubleDialed) return false;
  if (step.needsVm && !progress.vm) return false;
  return true;
}

export function inboundStepState(
  step: InboundCadenceStep,
  row: Pick<InboundLead, "start_date" | "attempts">,
  todayYmd = todayInAgencyTz()
): InboundStepState {
  if (inboundStepIsComplete(step, row.attempts)) return "done";
  const date = stepDate(row.start_date, step.day);
  if (todayYmd < date) return "upcoming";
  if (todayYmd === date) return "due";
  return "overdue";
}

export function getInboundTrackerState(
  row: Pick<InboundLead, "start_date" | "attempts" | "status" | "callback_at">,
  todayYmd = todayInAgencyTz()
): InboundTrackerState {
  const dayNumber = cadenceDayNumber(row.start_date, todayYmd);

  if (row.status === "transferred") {
    return {
      kind: "transferred",
      dayNumber,
      dueStep: null,
      nextStep: null,
      nextDate: null,
      headline: "Transferred to Jacob",
      detail: "Live transfer done — no more calls on this cadence.",
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
      detail: "Taken off the inbound list.",
    };
  }

  if (row.status === "callback" && row.callback_at) {
    const callbackMs = new Date(row.callback_at).getTime();
    if (Number.isFinite(callbackMs) && callbackMs > Date.now()) {
      return {
        kind: "callback",
        dayNumber,
        dueStep: null,
        nextStep: null,
        nextDate: null,
        headline: "Callback booked",
        detail: `Call back ${formatVaDateTime(row.callback_at)}.`,
      };
    }
  }

  if (dayNumber < 1) {
    const first = INBOUND_CADENCE[0];
    return {
      kind: "not_started",
      dayNumber,
      dueStep: null,
      nextStep: first,
      nextDate: stepDate(row.start_date, first.day),
      headline: "Not started yet",
      detail: `First call is ${formatVaDate(stepDate(row.start_date, first.day))}.`,
    };
  }

  const dueStep =
    INBOUND_CADENCE.find(
      (step) =>
        step.day <= dayNumber && !inboundStepIsComplete(step, row.attempts)
    ) ?? null;
  const nextStep =
    INBOUND_CADENCE.find((step) => step.day > dayNumber) ?? null;

  const callbackNow =
    row.status === "callback" &&
    row.callback_at &&
    new Date(row.callback_at).getTime() <= Date.now();

  if (isWeekendYmd(todayYmd) && !callbackNow) {
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
        detail: "All 7 call days are done.",
      };
    }
    return {
      kind: "weekend",
      dayNumber,
      dueStep: null,
      nextStep,
      nextDate: stepDate(row.start_date, nextStep.day),
      headline: "Weekend — no call today",
      detail: `Next: Day ${nextStep.day} · ${nextStep.label} · ${formatVaDate(
        stepDate(row.start_date, nextStep.day)
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
      nextDate: stepDate(row.start_date, dueStep.day),
      headline: callbackNow
        ? "Callback now"
        : overdue
          ? `Catch up — Day ${dueStep.day}`
          : `Today — Day ${dueStep.day}`,
      detail: callbackNow
        ? `${dueStep.label}. Live transfer if they have a minute.`
        : dueStep.label,
    };
  }

  if (callbackNow) {
    return {
      kind: "due_today",
      dayNumber,
      dueStep: null,
      nextStep: nextStep,
      nextDate: nextStep ? stepDate(row.start_date, nextStep.day) : null,
      headline: "Callback now",
      detail: "They asked you to call back now. Live transfer if they have a minute.",
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
      detail: "All 7 call days are done.",
    };
  }

  return {
    kind: "rest_day",
    dayNumber,
    dueStep: null,
    nextStep,
    nextDate: stepDate(row.start_date, nextStep.day),
    headline: "All caught up today",
    detail: `Next: Day ${nextStep.day} · ${nextStep.label} · ${formatVaDate(
      stepDate(row.start_date, nextStep.day)
    )}`,
  };
}

export function applyInboundAction(
  row: InboundLead,
  action: InboundLogAction,
  extra?: { note?: string; callbackAt?: string }
):
  | {
      attempts: InboundAttempt[];
      status: InboundLeadStatus;
      callback_at: string | null;
    }
  | { error: string } {
  if (action === "reopen") {
    return { attempts: row.attempts, status: "active", callback_at: null };
  }

  if (action === "transferred") {
    return {
      attempts: row.attempts,
      status: "transferred",
      callback_at: row.callback_at,
    };
  }

  if (action === "closed") {
    return {
      attempts: row.attempts,
      status: "closed",
      callback_at: row.callback_at,
    };
  }

  if (action === "callback") {
    const callbackAt = extra?.callbackAt?.trim() ?? "";
    const when = new Date(callbackAt);
    if (!callbackAt || Number.isNaN(when.getTime())) {
      return { error: "Pick a callback date and time." };
    }
    return {
      attempts: row.attempts,
      status: "callback",
      callback_at: when.toISOString(),
    };
  }

  if (row.status === "closed" || row.status === "transferred") {
    return { error: "This lead is already closed. Reopen them first." };
  }

  const state = getInboundTrackerState(row);
  if (!state.dueStep || state.kind === "weekend") {
    return { error: "No call is due on this cadence today." };
  }

  const kinds: InboundAttemptKind[] =
    action === "call_vm"
      ? [
          ...(state.dueStep.needsCall ? (["call"] as const) : []),
          ...(state.dueStep.needsDoubleDial ? (["double_dial"] as const) : []),
          ...(state.dueStep.needsVm ? (["vm"] as const) : []),
        ]
      : action === "call" ||
          action === "double_dial" ||
          action === "vm" ||
          action === "spoke"
        ? [action]
        : [];

  if (kinds.length === 0) {
    return { error: "Invalid call action." };
  }

  const trimmed = extra?.note?.trim();
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

  return {
    attempts: next,
    status: row.status === "callback" ? "active" : row.status,
    callback_at: row.status === "callback" ? null : row.callback_at,
  };
}

export function groupInboundRows(rows: InboundLead[]): {
  dueNow: InboundLead[];
  rest: InboundLead[];
  callbacks: InboundLead[];
  finished: InboundLead[];
  transferred: InboundLead[];
  closed: InboundLead[];
} {
  const dueNow: InboundLead[] = [];
  const rest: InboundLead[] = [];
  const callbacks: InboundLead[] = [];
  const finished: InboundLead[] = [];
  const transferred: InboundLead[] = [];
  const closed: InboundLead[] = [];

  for (const row of rows) {
    const state = getInboundTrackerState(row);
    if (state.kind === "transferred") {
      transferred.push(row);
      continue;
    }
    if (state.kind === "closed") {
      closed.push(row);
      continue;
    }
    if (state.kind === "callback") {
      callbacks.push(row);
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

  const rank = (row: InboundLead) => {
    const state = getInboundTrackerState(row);
    if (state.kind === "overdue") return 0;
    if (state.headline === "Callback now") return 1;
    if (state.kind === "due_today") return 2;
    return 3;
  };

  dueNow.sort((a, b) => rank(a) - rank(b) || a.client_name.localeCompare(b.client_name));
  rest.sort((a, b) => a.client_name.localeCompare(b.client_name));
  callbacks.sort((a, b) =>
    String(a.callback_at ?? "").localeCompare(String(b.callback_at ?? ""))
  );
  finished.sort((a, b) => b.start_date.localeCompare(a.start_date));
  transferred.sort((a, b) => b.start_date.localeCompare(a.start_date));
  closed.sort((a, b) => b.start_date.localeCompare(a.start_date));

  return { dueNow, rest, callbacks, finished, transferred, closed };
}

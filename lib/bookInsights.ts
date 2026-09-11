import { isCommercialPolicy } from "./dashboard";
import type { Carrier, ClientState, Policy, Stage } from "./types";
import {
  CARRIER_LABELS,
  CARRIERS,
  CLIENT_STATE_LABELS,
  CLIENT_STATES,
  STAGE_LABELS,
  STAGES,
  normalizeClientState,
} from "./types";
import { parseLocalDate } from "./utils";

export interface BreakdownSlice {
  key: string;
  label: string;
  premium: number;
  policyCount: number;
  percent: number;
}

export interface ExpiringPremiumBucket {
  label: string;
  days: number;
  premium: number;
  policyCount: number;
}

export interface StateRetentionSlice {
  state: ClientState;
  label: string;
  total: number;
  retained: number;
  rate: number;
}

export interface BookInsightsSummary {
  totalPremium: number;
  activePolicies: number;
  carrierCount: number;
  stateCount: number;
  spanishPercent: number;
  personalPremium: number;
  commercialPremium: number;
}

export interface ProductionSummary {
  monthKey: string;
  monthLabel: string;
  totalPremium: number;
  policyCount: number;
  personalPremium: number;
  commercialPremium: number;
  avgPremium: number;
  carrierCount: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatProductionMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function formatProductionMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function getPolicyProductionDate(policy: Policy): Date {
  const raw = policy.effective_date || policy.created_at.slice(0, 10);
  const date = parseLocalDate(raw);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getPolicyProductionMonthKey(policy: Policy): string {
  const date = getPolicyProductionDate(policy);
  return formatProductionMonthKey(date.getFullYear(), date.getMonth());
}

export function filterProductionByMonth(
  policies: Policy[],
  monthKey: string
): Policy[] {
  return policies.filter(
    (policy) => getPolicyProductionMonthKey(policy) === monthKey
  );
}

/** Newest effective date first; within the same day, most recently added first. */
export function sortProductionPolicies(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => {
    const effectiveDiff =
      getPolicyProductionDate(b).getTime() - getPolicyProductionDate(a).getTime();
    if (effectiveDiff !== 0) return effectiveDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function listProductionMonths(policies: Policy[]): string[] {
  const keys = new Set<string>();
  for (const policy of policies) {
    keys.add(getPolicyProductionMonthKey(policy));
  }
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

export function computeProductionSummary(
  policies: Policy[],
  monthKey: string
): ProductionSummary {
  const monthPolicies = filterProductionByMonth(policies, monthKey);
  let personalPremium = 0;
  let commercialPremium = 0;
  const carriers = new Set<Carrier>();

  for (const policy of monthPolicies) {
    const amount = policyPremium(policy);
    if (isCommercialPolicy(policy)) commercialPremium += amount;
    else personalPremium += amount;
    carriers.add(policy.carrier);
  }

  const totalPremium = personalPremium + commercialPremium;

  return {
    monthKey,
    monthLabel: formatProductionMonthLabel(monthKey),
    totalPremium,
    policyCount: monthPolicies.length,
    personalPremium,
    commercialPremium,
    avgPremium: monthPolicies.length > 0 ? totalPremium / monthPolicies.length : 0,
    carrierCount: carriers.size,
  };
}

function activePolicies(policies: Policy[]): Policy[] {
  return policies.filter((p) => p.stage !== "lapsed");
}

function policyPremium(policy: Policy): number {
  return Number(policy.premium) || 0;
}

function totalPremium(policies: Policy[]): number {
  return policies.reduce((sum, p) => sum + policyPremium(p), 0);
}

function buildBreakdown(
  entries: { key: string; label: string; premium: number; policyCount: number }[]
): BreakdownSlice[] {
  const total = entries.reduce((sum, e) => sum + e.premium, 0);
  return entries
    .map((entry) => ({
      ...entry,
      percent: total > 0 ? (entry.premium / total) * 100 : 0,
    }))
    .sort((a, b) => b.premium - a.premium);
}

export function computeBookInsightsSummary(policies: Policy[]): BookInsightsSummary {
  const active = activePolicies(policies);
  const premium = totalPremium(active);
  let personalPremium = 0;
  let commercialPremium = 0;
  let spanishPremium = 0;
  const carriers = new Set<Carrier>();
  const states = new Set<ClientState>();

  for (const policy of active) {
    const amount = policyPremium(policy);
    if (isCommercialPolicy(policy)) commercialPremium += amount;
    else personalPremium += amount;
    if (policy.spanish_speaker) spanishPremium += amount;
    carriers.add(policy.carrier);
    states.add(normalizeClientState(policy.client_state));
  }

  return {
    totalPremium: premium,
    activePolicies: active.length,
    carrierCount: carriers.size,
    stateCount: states.size,
    spanishPercent: premium > 0 ? (spanishPremium / premium) * 100 : 0,
    personalPremium,
    commercialPremium,
  };
}

export function computePremiumByCarrier(
  policies: Policy[],
  options?: { includeLapsed?: boolean }
): BreakdownSlice[] {
  const active = options?.includeLapsed ? policies : activePolicies(policies);
  const buckets = new Map<Carrier, { premium: number; policyCount: number }>();

  for (const carrier of CARRIERS) {
    buckets.set(carrier, { premium: 0, policyCount: 0 });
  }

  for (const policy of active) {
    const bucket = buckets.get(policy.carrier)!;
    bucket.premium += policyPremium(policy);
    bucket.policyCount += 1;
  }

  return buildBreakdown(
    CARRIERS.map((carrier) => ({
      key: carrier,
      label: CARRIER_LABELS[carrier],
      premium: buckets.get(carrier)!.premium,
      policyCount: buckets.get(carrier)!.policyCount,
    })).filter((entry) => entry.premium > 0 || entry.policyCount > 0)
  );
}

export function computePremiumByStage(policies: Policy[]): BreakdownSlice[] {
  const buckets = new Map<Stage, { premium: number; policyCount: number }>();

  for (const stage of STAGES) {
    buckets.set(stage, { premium: 0, policyCount: 0 });
  }

  for (const policy of policies) {
    const bucket = buckets.get(policy.stage)!;
    bucket.premium += policyPremium(policy);
    bucket.policyCount += 1;
  }

  return buildBreakdown(
    STAGES.map((stage) => ({
      key: stage,
      label: STAGE_LABELS[stage],
      premium: buckets.get(stage)!.premium,
      policyCount: buckets.get(stage)!.policyCount,
    })).filter((entry) => entry.policyCount > 0)
  );
}

export function computeExpiringPremium(
  policies: Policy[],
  windows: number[] = [30, 60, 90]
): ExpiringPremiumBucket[] {
  const active = activePolicies(policies);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return windows.map((days) => {
    const end = new Date(today);
    end.setDate(end.getDate() + days);

    let premium = 0;
    let policyCount = 0;

    for (const policy of active) {
      const renewal = parseLocalDate(policy.renewal_date);
      renewal.setHours(0, 0, 0, 0);
      if (renewal >= today && renewal <= end) {
        premium += policyPremium(policy);
        policyCount += 1;
      }
    }

    return {
      label: `Next ${days} days`,
      days,
      premium,
      policyCount,
    };
  });
}

export function computeTermSplit(policies: Policy[]): BreakdownSlice[] {
  const active = activePolicies(policies);
  let sixPremium = 0;
  let twelvePremium = 0;
  let sixCount = 0;
  let twelveCount = 0;

  for (const policy of active) {
    const amount = policyPremium(policy);
    if (policy.term_months === 6) {
      sixPremium += amount;
      sixCount += 1;
    } else {
      twelvePremium += amount;
      twelveCount += 1;
    }
  }

  return buildBreakdown([
    { key: "6", label: "6-month policies", premium: sixPremium, policyCount: sixCount },
    { key: "12", label: "12-month policies", premium: twelvePremium, policyCount: twelveCount },
  ]).filter((entry) => entry.policyCount > 0);
}

export function computeRetentionByState(policies: Policy[]): StateRetentionSlice[] {
  const buckets = new Map<ClientState, { total: number; retained: number }>();

  for (const state of CLIENT_STATES) {
    buckets.set(state, { total: 0, retained: 0 });
  }

  for (const policy of policies) {
    const state = normalizeClientState(policy.client_state);
    const bucket = buckets.get(state)!;
    bucket.total += 1;
    if (policy.stage === "retained" || policy.stage === "active") bucket.retained += 1;
  }

  return CLIENT_STATES.map((state) => {
    const bucket = buckets.get(state)!;
    return {
      state,
      label: CLIENT_STATE_LABELS[state],
      total: bucket.total,
      retained: bucket.retained,
      rate: bucket.total > 0 ? (bucket.retained / bucket.total) * 100 : 0,
    };
  }).filter((entry) => entry.total > 0);
}

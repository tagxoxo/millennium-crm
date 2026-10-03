import type { ClientState, Policy } from "./types";
import { CLIENT_STATE_LABELS, CLIENT_STATES, normalizeClientState } from "./types";
import { estimateBookMonthlyCommission } from "./commission";
import { getSupabaseServer } from "./supabase/server";
import { annualizedPremium, parseLocalDate } from "./utils";

export const URGENT_RENEWAL_DAYS = 30;
export const RETENTION_RATE_WINDOW_DAYS = 90;

export interface RetentionOutcomes {
  renewedLast90: number;
  lapsedLast90: number;
  error: string | null;
}

export interface DashboardStats {
  totalActive: number;
  retentionRate: number;
  retentionDecisions: number;
  renewalsDue30: number;
  commercialBookPremium: number;
  commercialPolicyCount: number;
  totalPremium: number;
  totalAnnualPremium: number;
  monthlyCommission: number;
}

function startOfDaysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Renewed contact logs and lapsed policies whose expiration fell in the last 90 days. */
export async function fetchRetentionOutcomes(): Promise<RetentionOutcomes> {
  try {
    const supabase = getSupabaseServer();
    const since = startOfDaysAgo(RETENTION_RATE_WINDOW_DAYS);
    const sinceDate = toDateOnly(since);
    const today = toDateOnly(new Date());

    const [renewed, lapsed] = await Promise.all([
      supabase
        .from("contact_log")
        .select("id", { count: "exact", head: true })
        .eq("contact_type", "renewed")
        .gte("contact_date", since.toISOString()),
      supabase
        .from("policies")
        .select("id", { count: "exact", head: true })
        .eq("stage", "lapsed")
        .eq("is_historical", false)
        .gte("renewal_date", sinceDate)
        .lte("renewal_date", today),
    ]);

    const error = renewed.error?.message ?? lapsed.error?.message ?? null;
    return {
      renewedLast90: renewed.count ?? 0,
      lapsedLast90: lapsed.count ?? 0,
      error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { renewedLast90: 0, lapsedLast90: 0, error: message };
  }
}

export function computeDashboardStats(
  policies: Policy[],
  outcomes: Pick<RetentionOutcomes, "renewedLast90" | "lapsedLast90"> = {
    renewedLast90: 0,
    lapsedLast90: 0,
  }
): DashboardStats {
  const active = policies.filter((p) => p.stage !== "lapsed");
  const retentionDecisions = outcomes.renewedLast90 + outcomes.lapsedLast90;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const renewalsDue30 = active.filter((p) => {
    const renewal = parseLocalDate(p.renewal_date);
    renewal.setHours(0, 0, 0, 0);
    return renewal >= today && renewal <= in30Days;
  }).length;

  const totalPremium = active.reduce((sum, p) => sum + Number(p.premium), 0);
  const totalAnnualPremium = active.reduce(
    (sum, p) => sum + annualizedPremium(Number(p.premium), p.term_months),
    0
  );
  const commercialActive = active.filter((p) => Boolean(p.commercial));
  const commercialBookPremium = commercialActive.reduce(
    (sum, p) => sum + annualizedPremium(Number(p.premium), p.term_months),
    0
  );
  const monthlyCommission = estimateBookMonthlyCommission(active);

  return {
    totalActive: active.length,
    retentionRate:
      retentionDecisions > 0
        ? (outcomes.renewedLast90 / retentionDecisions) * 100
        : 0,
    retentionDecisions,
    renewalsDue30,
    commercialBookPremium,
    commercialPolicyCount: commercialActive.length,
    totalPremium,
    totalAnnualPremium,
    monthlyCommission,
  };
}

export interface StatePremiumSlice {
  state: ClientState;
  label: string;
  premium: number;
  policyCount: number;
  percent: number;
  personalPremium: number;
  commercialPremium: number;
  personalCount: number;
  commercialCount: number;
}

export function isCommercialPolicy(policy: Policy): boolean {
  if (policy.commercial) return true;
  return (
    policy.policy_type === "commercial_auto" ||
    policy.policy_type === "commercial_general_liability"
  );
}

/** Sum written premium grouped by client state. */
export function computePremiumByState(
  policies: Policy[],
  includeLapsed = false
): StatePremiumSlice[] {
  const active = includeLapsed
    ? policies
    : policies.filter((p) => p.stage !== "lapsed");
  const buckets = new Map<
    ClientState,
    {
      premium: number;
      policyCount: number;
      personalPremium: number;
      commercialPremium: number;
      personalCount: number;
      commercialCount: number;
    }
  >();

  for (const state of CLIENT_STATES) {
    buckets.set(state, {
      premium: 0,
      policyCount: 0,
      personalPremium: 0,
      commercialPremium: 0,
      personalCount: 0,
      commercialCount: 0,
    });
  }

  for (const policy of active) {
    const state = normalizeClientState(policy.client_state);
    const bucket = buckets.get(state)!;
    const amount = Number(policy.premium) || 0;
    const commercial = isCommercialPolicy(policy);

    bucket.premium += amount;
    bucket.policyCount += 1;
    if (commercial) {
      bucket.commercialPremium += amount;
      bucket.commercialCount += 1;
    } else {
      bucket.personalPremium += amount;
      bucket.personalCount += 1;
    }
  }

  const totalPremium = active.reduce((sum, p) => sum + (Number(p.premium) || 0), 0);

  return CLIENT_STATES.map((state) => {
    const bucket = buckets.get(state)!;
    return {
      state,
      label: CLIENT_STATE_LABELS[state],
      premium: bucket.premium,
      policyCount: bucket.policyCount,
      percent: totalPremium > 0 ? (bucket.premium / totalPremium) * 100 : 0,
      personalPremium: bucket.personalPremium,
      commercialPremium: bucket.commercialPremium,
      personalCount: bucket.personalCount,
      commercialCount: bucket.commercialCount,
    };
  });
}

export function getUrgentRenewals(policies: Policy[]): Policy[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inWindow = new Date(today);
  inWindow.setDate(inWindow.getDate() + URGENT_RENEWAL_DAYS);

  return policies
    .filter((p) => {
      const renewal = parseLocalDate(p.renewal_date);
      renewal.setHours(0, 0, 0, 0);
      return renewal >= today && renewal <= inWindow;
    })
    .sort(
      (a, b) =>
        parseLocalDate(a.renewal_date).getTime() -
        parseLocalDate(b.renewal_date).getTime()
    );
}

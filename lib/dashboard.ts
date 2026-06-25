import type { ClientState, Policy } from "./types";
import { CLIENT_STATE_LABELS, CLIENT_STATES, normalizeClientState } from "./types";
import { annualizedPremium, parseLocalDate } from "./utils";

// Estimated annual commission rate — adjust here if your carriers pay differently
export const COMMISSION_RATE = 0.12;
export const URGENT_RENEWAL_DAYS = 30;

export interface DashboardStats {
  totalActive: number;
  retentionRate: number;
  renewalsDue30: number;
  commercialBookPremium: number;
  commercialPolicyCount: number;
  totalPremium: number;
  totalAnnualPremium: number;
  monthlyCommission: number;
}

export function computeDashboardStats(policies: Policy[]): DashboardStats {
  const total = policies.length;
  const retained = policies.filter((p) => p.stage === "retained").length;
  const active = policies.filter((p) => p.stage !== "lapsed");

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
  const monthlyCommission = (totalAnnualPremium * COMMISSION_RATE) / 12;

  return {
    totalActive: active.length,
    retentionRate: total > 0 ? (retained / total) * 100 : 0,
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

/** Sum written premium for active (non-lapsed) policies grouped by client state. */
export function computePremiumByState(policies: Policy[]): StatePremiumSlice[] {
  const active = policies.filter((p) => p.stage !== "lapsed");
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

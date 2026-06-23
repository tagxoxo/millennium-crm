import type { Policy } from "./types";

// Estimated annual commission rate — adjust here if your carriers pay differently
export const COMMISSION_RATE = 0.12;

export interface DashboardStats {
  totalActive: number;
  retentionRate: number;
  renewalsDue30: number;
  totalPremium: number;
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
    const renewal = new Date(p.renewal_date);
    renewal.setHours(0, 0, 0, 0);
    return renewal >= today && renewal <= in30Days;
  }).length;

  const totalPremium = active.reduce((sum, p) => sum + Number(p.premium), 0);
  const monthlyCommission = (totalPremium * COMMISSION_RATE) / 12;

  return {
    totalActive: active.length,
    retentionRate: total > 0 ? (retained / total) * 100 : 0,
    renewalsDue30,
    totalPremium,
    monthlyCommission,
  };
}

export function getUrgentRenewals(policies: Policy[]): Policy[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14Days = new Date(today);
  in14Days.setDate(in14Days.getDate() + 14);

  return policies
    .filter((p) => {
      const renewal = new Date(p.renewal_date);
      renewal.setHours(0, 0, 0, 0);
      return renewal >= today && renewal <= in14Days;
    })
    .sort(
      (a, b) =>
        new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime()
    );
}

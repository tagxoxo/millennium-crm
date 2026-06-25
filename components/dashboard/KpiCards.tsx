import KpiCard from "@/components/ui/KpiCard";
import type { DashboardStats } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

interface KpiCardsProps {
  stats: DashboardStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <KpiCard
        label="Commercial Book Premium"
        value={formatCurrency(stats.commercialBookPremium)}
        subtext={`${stats.commercialPolicyCount.toLocaleString()} commercial · annualized`}
      />
      <KpiCard
        label="Total Book Premium"
        value={formatCurrency(stats.totalPremium)}
        subtext="As written (6 & 12 mo mixed)"
      />
      <KpiCard
        label="Total Annual Premium Book"
        value={formatCurrency(stats.totalAnnualPremium)}
        subtext="6-month policies doubled"
      />
      <KpiCard
        label="Active Policies"
        value={stats.totalActive.toLocaleString()}
      />
      <KpiCard
        label="Retention Rate"
        value={`${stats.retentionRate.toFixed(1)}%`}
        subtext="Retained ÷ total policies"
      />
      <KpiCard
        label="Renewals (30 days)"
        value={stats.renewalsDue30.toLocaleString()}
      />
      <KpiCard
        label="Est. Monthly Commissions"
        value={formatCurrency(stats.monthlyCommission)}
        subtext="12% of annualized book"
      />
      <KpiCard
        label="Renewal Reminders Sent (Last 30 Days)"
        value={stats.renewalRemindersSent30.toLocaleString()}
        subtext="45-day reminder emails"
      />
      <KpiCard
        label="Policies Needing Outreach"
        value={stats.policiesNeedingOutreach.toLocaleString()}
        subtext="Renewing ≤45d, no reminder in 50d"
      />
    </div>
  );
}

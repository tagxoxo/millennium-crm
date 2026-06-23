import KpiCard from "@/components/ui/KpiCard";
import type { DashboardStats } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

interface KpiCardsProps {
  stats: DashboardStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
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
        label="Total Book Premium"
        value={formatCurrency(stats.totalPremium)}
        subtext="Annual, excl. lapsed"
      />
      <KpiCard
        label="Est. Monthly Commissions"
        value={formatCurrency(stats.monthlyCommission)}
        subtext="12% annual rate estimate"
        />
    </div>
  );
}

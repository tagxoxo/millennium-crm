import KpiCard from "@/components/ui/KpiCard";
import type { BookInsightsSummary } from "@/lib/bookInsights";
import { formatCurrency } from "@/lib/utils";

interface InsightsSummaryProps {
  summary: BookInsightsSummary;
}

export default function InsightsSummary({ summary }: InsightsSummaryProps) {
  const personalPct =
    summary.totalPremium > 0
      ? (summary.personalPremium / summary.totalPremium) * 100
      : 0;
  const commercialPct =
    summary.totalPremium > 0
      ? (summary.commercialPremium / summary.totalPremium) * 100
      : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <KpiCard
        label="Active Book Premium"
        value={formatCurrency(summary.totalPremium)}
        subtext={`${summary.activePolicies.toLocaleString()} active policies`}
      />
      <KpiCard
        label="Personal Lines"
        value={formatCurrency(summary.personalPremium)}
        subtext={`${personalPct.toFixed(1)}% of book`}
      />
      <KpiCard
        label="Commercial Lines"
        value={formatCurrency(summary.commercialPremium)}
        subtext={`${commercialPct.toFixed(1)}% of book`}
      />
      <KpiCard
        label="Spanish-Speaking Book"
        value={`${summary.spanishPercent.toFixed(1)}%`}
        subtext="Share of written premium"
      />
      <KpiCard
        label="Carriers in Book"
        value={summary.carrierCount.toLocaleString()}
      />
      <KpiCard
        label="States Represented"
        value={summary.stateCount.toLocaleString()}
        subtext="TN, TX, MA, RI"
      />
    </div>
  );
}

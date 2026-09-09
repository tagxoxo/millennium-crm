import KpiCard from "@/components/ui/KpiCard";
import type { ProductionSummary as ProductionSummaryData } from "@/lib/bookInsights";
import { formatCurrency } from "@/lib/utils";

interface ProductionSummaryProps {
  summary: ProductionSummaryData;
}

export default function ProductionSummary({ summary }: ProductionSummaryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Production · {summary.monthLabel}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          New business written based on policy effective dates
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Total Production"
          value={formatCurrency(summary.totalPremium)}
          subtext={`${summary.policyCount.toLocaleString()} polic${summary.policyCount === 1 ? "y" : "ies"}`}
        />
        <KpiCard
          label="Personal Lines"
          value={formatCurrency(summary.personalPremium)}
        />
        <KpiCard
          label="Commercial Lines"
          value={formatCurrency(summary.commercialPremium)}
        />
        <KpiCard
          label="Avg Premium"
          value={formatCurrency(summary.avgPremium)}
          subtext={`${summary.carrierCount} carrier${summary.carrierCount === 1 ? "" : "s"}`}
        />
      </div>
    </div>
  );
}

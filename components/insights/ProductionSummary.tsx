import KpiCard from "@/components/ui/KpiCard";
import type { ProductionSummary as ProductionSummaryData } from "@/lib/bookInsights";
import type { TrexisRenewalMonth } from "@/lib/trexisRenewals";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils";

interface ProductionSummaryProps {
  summary: ProductionSummaryData;
  trexis: TrexisRenewalMonth;
  trexisError: string | null;
}

export default function ProductionSummary({
  summary,
  trexis,
  trexisError,
}: ProductionSummaryProps) {
  const renewalPremium = trexisError ? 0 : trexis.annualPremium;
  const totalProduction = summary.totalPremium + renewalPremium;
  const hasRenewals = !trexisError && trexis.policyCount > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Production · {summary.monthLabel}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          New business plus Trexis renewals from the acquired book. Renewals are
          kept out of the new-business list.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <KpiCard
          label="Total Production"
          value={formatCurrency(totalProduction)}
          subtext={
            trexisError
              ? "New business only — renewals did not load"
              : `${formatCurrency(summary.totalPremium)} new + ${formatCurrency(renewalPremium)} renewals`
          }
        />
        <KpiCard
          label="New Business"
          value={formatCurrency(summary.totalPremium)}
          subtext={`${summary.policyCount.toLocaleString()} polic${summary.policyCount === 1 ? "y" : "ies"}`}
        />
        <KpiCard
          label="Trexis Renewals"
          value={trexisError ? "—" : formatCurrency(trexis.annualPremium)}
          subtext={
            trexisError
              ? "Could not load"
              : hasRenewals
                ? `${trexis.policyCount} renewal${trexis.policyCount === 1 ? "" : "s"} · ${formatCurrencyExact(trexis.commission)} commission`
                : "None recorded this month"
          }
          className={
            trexisError || !hasRenewals
              ? "border-amber-500/40"
              : "border-teal-500/40"
          }
        />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">New business breakdown</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
    </div>
  );
}

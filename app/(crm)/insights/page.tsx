import BookInsightsFilter from "@/components/insights/BookInsightsFilter";
import BreakdownChart from "@/components/insights/BreakdownChart";
import ExpiringPremiumChart from "@/components/insights/ExpiringPremiumChart";
import InsightsSummary from "@/components/insights/InsightsSummary";
import PremiumByStateChart from "@/components/insights/PremiumByStateChart";
import ProductionPolicyTable from "@/components/insights/ProductionPolicyTable";
import ProductionSummary from "@/components/insights/ProductionSummary";
import RetentionByStateChart from "@/components/insights/RetentionByStateChart";
import {
  computeBookInsightsSummary,
  computeExpiringPremium,
  computePremiumByCarrier,
  computePremiumByStage,
  computeProductionSummary,
  computeRetentionByState,
  computeTermSplit,
  filterProductionByMonth,
  formatProductionMonthLabel,
  listProductionMonths,
} from "@/lib/bookInsights";
import { computePremiumByState } from "@/lib/dashboard";
import { fetchAllPolicies } from "@/lib/policies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidMonthKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export default async function BookInsightsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const { policies, error } = await fetchAllPolicies();
  const availableMonths = listProductionMonths(policies);
  const selectedMonth = isValidMonthKey(searchParams.month)
    ? searchParams.month
    : null;

  if (selectedMonth) {
    const productionPolicies = filterProductionByMonth(policies, selectedMonth);
    const productionSummary = computeProductionSummary(policies, selectedMonth);
    const productionByCarrier = computePremiumByCarrier(productionPolicies, {
      includeLapsed: true,
    });
    const productionByState = computePremiumByState(productionPolicies, true);
    const monthLabel = formatProductionMonthLabel(selectedMonth);

    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Book Insights</h1>
            <p className="text-gray-400 text-sm mt-1">
              Monthly production and premium breakdowns across your book
            </p>
          </div>
          <BookInsightsFilter
            selectedMonth={selectedMonth}
            availableMonths={availableMonths}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
            <p className="text-red-400 font-medium">Could not load policies</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        )}

        <ProductionSummary summary={productionSummary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <BreakdownChart
            title="Production by Carrier"
            subtitle={`${monthLabel} · written premium`}
            slices={productionByCarrier}
            emptyMessage="No production for this month yet."
          />
          <PremiumByStateChart slices={productionByState} />
        </div>

        <ProductionPolicyTable
          policies={productionPolicies}
          monthLabel={monthLabel}
        />
      </div>
    );
  }

  const summary = computeBookInsightsSummary(policies);
  const premiumByState = computePremiumByState(policies);
  const premiumByCarrier = computePremiumByCarrier(policies);
  const premiumByStage = computePremiumByStage(policies);
  const expiringPremium = computeExpiringPremium(policies);
  const termSplit = computeTermSplit(policies);
  const retentionByState = computeRetentionByState(policies);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Book Insights</h1>
          <p className="text-gray-400 text-sm mt-1">
            Premium breakdowns, carrier mix, and renewal exposure across your book
          </p>
        </div>
        <BookInsightsFilter
          selectedMonth={null}
          availableMonths={availableMonths}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load policies</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}

      <InsightsSummary summary={summary} />

      <PremiumByStateChart slices={premiumByState} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <BreakdownChart
          title="Premium by Carrier"
          subtitle="Active policies · written premium"
          slices={premiumByCarrier}
          emptyMessage="No carrier premium data yet."
        />
        <BreakdownChart
          title="Premium by Pipeline Stage"
          subtitle="All policies including lapsed"
          slices={premiumByStage}
          emptyMessage="No pipeline data yet."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <ExpiringPremiumChart buckets={expiringPremium} />
        <BreakdownChart
          title="6-Month vs 12-Month Terms"
          subtitle="Active policies · written premium"
          slices={termSplit}
          emptyMessage="No term data yet."
        />
      </div>

      <RetentionByStateChart slices={retentionByState} />
    </div>
  );
}

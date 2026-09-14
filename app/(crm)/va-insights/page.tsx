import VaInsightsView from "@/components/va-insights/VaInsightsView";
import {
  computeVaInsights,
  fetchVaDailyMetrics,
  fetchVaEmailMap,
  isVaInsightRange,
  syncVaDailyMetrics,
  type VaInsightRange,
} from "@/lib/vaInsights";
import { fetchAllVaTickets } from "@/lib/va-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VaInsightsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range: VaInsightRange = isVaInsightRange(searchParams.range)
    ? searchParams.range
    : "today";

  const [{ tickets, error }, emailById] = await Promise.all([
    fetchAllVaTickets(),
    fetchVaEmailMap(),
  ]);

  if (!error) {
    await syncVaDailyMetrics(tickets, emailById);
  }

  const { rows: daily, error: dailyError } = await fetchVaDailyMetrics();
  const insights = computeVaInsights(tickets, range, emailById);
  const loadError = error ?? dailyError;

  return (
    <div>
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-medium">Could not refresh saved VA metrics</p>
          <p className="text-red-300/80 text-sm mt-1">{loadError}</p>
        </div>
      )}
      <VaInsightsView insights={insights} daily={daily} />
    </div>
  );
}

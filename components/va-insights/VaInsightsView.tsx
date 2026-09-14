import KpiCard from "@/components/ui/KpiCard";
import VaCountBars from "@/components/va-insights/VaCountBars";
import VaDailyHistory from "@/components/va-insights/VaDailyHistory";
import VaInsightsFilter from "@/components/va-insights/VaInsightsFilter";
import {
  formatVaDateTime,
  VA_CARRIER_LABELS,
  VA_REQUEST_TYPE_LABELS,
  VA_STATUS_LABELS,
} from "@/lib/va";
import {
  VA_INSIGHT_RANGE_LABELS,
  type VaDailyMetricRow,
  type VaInsights,
} from "@/lib/vaInsights";

export default function VaInsightsView({
  insights,
  daily,
}: {
  insights: VaInsights;
  daily: VaDailyMetricRow[];
}) {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">VA Insights</h1>
          <p className="text-gray-400 text-sm mt-1">
            Tickets, language mix, and daily history for every virtual assistant
          </p>
        </div>
        <VaInsightsFilter range={insights.range} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <KpiCard
          label="Tickets submitted"
          value={insights.submitted.toLocaleString()}
          subtext={VA_INSIGHT_RANGE_LABELS[insights.range]}
        />
        <KpiCard
          label="Tickets completed"
          value={insights.completed.toLocaleString()}
          subtext={VA_INSIGHT_RANGE_LABELS[insights.range]}
        />
        <KpiCard
          label="Open now"
          value={insights.open.toLocaleString()}
          subtext="Waiting in Ticket Center"
        />
        <KpiCard
          label="Spanish calls"
          value={`${insights.spanishPercent.toFixed(0)}%`}
          subtext="Of submitted tickets"
        />
        <KpiCard
          label="Avg. time to complete"
          value={insights.avgCompleteLabel}
          subtext="Submit to mark complete"
        />
      </div>

      <section className="bg-navy-light border border-navy-lighter rounded-xl overflow-x-auto">
        <div className="px-5 pt-5">
          <h2 className="text-lg font-semibold text-white">By virtual assistant</h2>
        </div>
        {insights.byVa.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No VA activity yet.</p>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b border-navy-lighter text-gray-400 text-left">
                <th className="px-5 py-2 font-medium">VA</th>
                <th className="px-5 py-2 font-medium">Submitted</th>
                <th className="px-5 py-2 font-medium">Completed</th>
                <th className="px-5 py-2 font-medium">Open</th>
                <th className="px-5 py-2 font-medium">Spanish</th>
              </tr>
            </thead>
            <tbody>
              {insights.byVa.map((person) => (
                <tr key={person.vaUserId} className="border-b border-navy-lighter/50 last:border-0">
                  <td className="px-5 py-3 text-white">{person.email}</td>
                  <td className="px-5 py-3 text-gray-200">{person.submitted}</td>
                  <td className="px-5 py-3 text-gray-200">{person.completed}</td>
                  <td className="px-5 py-3 text-gray-200">{person.open}</td>
                  <td className="px-5 py-3 text-gray-200">{person.spanish}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <VaCountBars title="By request type" slices={insights.byType} />
        <VaCountBars title="By carrier" slices={insights.byCarrier} />
        <VaCountBars title="By language" slices={insights.byLanguage} />
      </div>

      <VaDailyHistory rows={daily} />

      <section className="bg-navy-light border border-navy-lighter rounded-xl overflow-x-auto">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-lg font-semibold text-white">Ticket log</h2>
          <p className="text-xs text-gray-500 mt-1">
            Every ticket in this range — {insights.tickets.length}{" "}
            {insights.tickets.length === 1 ? "request" : "requests"}
          </p>
        </div>
        {insights.tickets.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No tickets in this range.</p>
        ) : (
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="border-b border-navy-lighter text-gray-400 text-left">
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-5 py-2 font-medium">VA</th>
                <th className="px-5 py-2 font-medium">Caller</th>
                <th className="px-5 py-2 font-medium">Policy</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Carrier</th>
                <th className="px-5 py-2 font-medium">Language</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {insights.tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-navy-lighter/50 last:border-0">
                  <td className="px-5 py-3 text-gray-300 whitespace-nowrap">
                    {formatVaDateTime(ticket.created_at)}
                  </td>
                  <td className="px-5 py-3 text-gray-200">
                    {insights.emailById[ticket.submitted_by ?? ""] ?? "Unknown VA"}
                  </td>
                  <td className="px-5 py-3 text-white">{ticket.caller_name}</td>
                  <td className="px-5 py-3 text-gray-200 whitespace-nowrap">
                    {ticket.policy_number || "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-200">
                    {VA_REQUEST_TYPE_LABELS[ticket.request_type] ?? ticket.request_type}
                  </td>
                  <td className="px-5 py-3 text-gray-200">
                    {ticket.carrier ? VA_CARRIER_LABELS[ticket.carrier] : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-200 capitalize">{ticket.language}</td>
                  <td className="px-5 py-3 text-gray-200">
                    {VA_STATUS_LABELS[ticket.status]}
                  </td>
                  <td className="px-5 py-3 text-gray-400 max-w-xs truncate">
                    {ticket.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

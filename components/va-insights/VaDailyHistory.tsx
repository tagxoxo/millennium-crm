import { formatVaDate } from "@/lib/va";
import type { VaDailyMetricRow } from "@/lib/vaInsights";

export default function VaDailyHistory({ rows }: { rows: VaDailyMetricRow[] }) {
  const days = rows
    .slice()
    .sort((a, b) => {
      if (a.metric_date === b.metric_date) {
        return (a.va_email ?? "").localeCompare(b.va_email ?? "");
      }
      return a.metric_date < b.metric_date ? 1 : -1;
    })
    .slice(0, 60);
  const vaCount = new Set(days.map((row) => row.va_user_id)).size;
  const maxSubmitted = days.reduce((n, row) => Math.max(n, row.tickets_submitted), 0);

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Daily history</h2>
      <p className="text-xs text-gray-500 mb-4">
        Saved each night and whenever a ticket is sent or completed
      </p>
      {days.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No saved days yet. Metrics start storing as tickets come in.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-lighter text-gray-400 text-left">
                <th className="px-3 py-2 font-medium">Day</th>
                {vaCount > 1 && <th className="px-3 py-2 font-medium">VA</th>}
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Spanish</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody>
              {days.map((row) => (
                <tr
                  key={`${row.metric_date}-${row.va_user_id}`}
                  className="border-b border-navy-lighter/50 last:border-0"
                >
                  <td className="px-3 py-2 text-white whitespace-nowrap">
                    {formatVaDate(row.metric_date)}
                  </td>
                  {vaCount > 1 && (
                    <td className="px-3 py-2 text-gray-200">
                      {row.va_email ?? "Unknown VA"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-gray-200">{row.tickets_submitted}</td>
                  <td className="px-3 py-2 text-gray-200">{row.tickets_completed}</td>
                  <td className="px-3 py-2 text-gray-200">{row.spanish_count}</td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <div className="h-2 bg-navy rounded-full overflow-hidden max-w-[160px]">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{
                          width: `${
                            maxSubmitted > 0
                              ? (row.tickets_submitted / maxSubmitted) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

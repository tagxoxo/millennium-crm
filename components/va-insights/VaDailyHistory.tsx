import { formatVaDate } from "@/lib/va";
import type { VaDailyMetricRow } from "@/lib/vaInsights";

export default function VaDailyHistory({ rows }: { rows: VaDailyMetricRow[] }) {
  const grouped = new Map<string, { submitted: number; completed: number; spanish: number }>();
  for (const row of rows) {
    const current = grouped.get(row.metric_date) ?? {
      submitted: 0,
      completed: 0,
      spanish: 0,
    };
    current.submitted += row.tickets_submitted;
    current.completed += row.tickets_completed;
    current.spanish += row.spanish_count;
    grouped.set(row.metric_date, current);
  }

  const days = [...grouped.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 30);

  const maxSubmitted = days.reduce((n, [, stats]) => Math.max(n, stats.submitted), 0);

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <h2 className="text-lg font-semibold text-white mb-1">Daily history</h2>
      <p className="text-xs text-gray-500 mb-4">
        Saved each day — last 30 days with activity
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
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Completed</th>
                <th className="px-3 py-2 font-medium">Spanish</th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Volume</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([date, stats]) => (
                <tr key={date} className="border-b border-navy-lighter/50 last:border-0">
                  <td className="px-3 py-2 text-white whitespace-nowrap">
                    {formatVaDate(date)}
                  </td>
                  <td className="px-3 py-2 text-gray-200">{stats.submitted}</td>
                  <td className="px-3 py-2 text-gray-200">{stats.completed}</td>
                  <td className="px-3 py-2 text-gray-200">{stats.spanish}</td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    <div className="h-2 bg-navy rounded-full overflow-hidden max-w-[160px]">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{
                          width: `${
                            maxSubmitted > 0 ? (stats.submitted / maxSubmitted) * 100 : 0
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

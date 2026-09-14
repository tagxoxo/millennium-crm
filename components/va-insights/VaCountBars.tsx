import type { VaCountSlice } from "@/lib/vaInsights";

const BAR_COLORS = ["#60a5fa", "#a855f7", "#f59e0b", "#34d399", "#f472b6", "#22d3ee"];

export default function VaCountBars({
  title,
  slices,
  emptyMessage = "No tickets in this range.",
}: {
  title: string;
  slices: VaCountSlice[];
  emptyMessage?: string;
}) {
  const max = slices.reduce((n, slice) => Math.max(n, slice.count), 0);

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6 h-full">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {slices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {slices.map((slice, index) => (
            <li key={slice.key}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm text-white truncate">{slice.label}</span>
                <span className="text-sm text-gray-300 shrink-0">{slice.count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-navy rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${max > 0 ? (slice.count / max) * 100 : 0}%`,
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 shrink-0 w-12 text-right">
                  {slice.percent.toFixed(0)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

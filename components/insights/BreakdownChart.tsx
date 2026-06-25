import type { BreakdownSlice } from "@/lib/bookInsights";
import { formatCurrency } from "@/lib/utils";

const BAR_COLORS = [
  "#3b82f6",
  "#22d3ee",
  "#a855f7",
  "#f59e0b",
  "#10b981",
  "#f472b6",
  "#6366f1",
  "#84cc16",
  "#ef4444",
  "#14b8a6",
];

interface BreakdownChartProps {
  title: string;
  subtitle?: string;
  slices: BreakdownSlice[];
  emptyMessage?: string;
}

export default function BreakdownChart({
  title,
  subtitle,
  slices,
  emptyMessage = "No data yet.",
}: BreakdownChartProps) {
  const totalPremium = slices.reduce((sum, slice) => sum + slice.premium, 0);
  const maxPremium = slices.reduce((max, slice) => Math.max(max, slice.premium), 0);

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6 h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {slices.length === 0 || totalPremium === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {slices.map((slice, index) => {
            const barWidth = maxPremium > 0 ? (slice.premium / maxPremium) * 100 : 0;
            const color = BAR_COLORS[index % BAR_COLORS.length];

            return (
              <li key={slice.key}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm text-white truncate">{slice.label}</span>
                  <span className="text-sm text-gray-300 shrink-0">
                    {formatCurrency(slice.premium)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-navy rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-20 text-right">
                    {slice.percent.toFixed(1)}% · {slice.policyCount}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

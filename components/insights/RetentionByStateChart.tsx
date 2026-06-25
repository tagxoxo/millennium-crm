import { STATE_COLORS } from "@/components/insights/stateColors";
import type { StateRetentionSlice } from "@/lib/bookInsights";

interface RetentionByStateChartProps {
  slices: StateRetentionSlice[];
}

export default function RetentionByStateChart({ slices }: RetentionByStateChartProps) {
  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6 h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Retention by State</h2>
        <p className="text-xs text-gray-500 mt-1">
          Retained policies ÷ all policies in each state
        </p>
      </div>

      {slices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No policy data yet.</p>
      ) : (
        <ul className="space-y-3">
          {slices.map((slice) => (
            <li key={slice.state}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm text-white">
                  {slice.state}
                  <span className="text-gray-500 font-normal ml-1.5 hidden sm:inline">
                    {slice.label}
                  </span>
                </span>
                <span className="text-sm text-gray-300">
                  {slice.rate.toFixed(1)}%
                  <span className="text-gray-500 ml-1.5">
                    ({slice.retained}/{slice.total})
                  </span>
                </span>
              </div>
              <div className="h-2 bg-navy rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${slice.rate}%`,
                    backgroundColor: STATE_COLORS[slice.state],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

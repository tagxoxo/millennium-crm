"use client";

import { useRouter } from "next/navigation";
import {
  VA_INSIGHT_RANGE_LABELS,
  VA_INSIGHT_RANGES,
  type VaInsightRange,
} from "@/lib/vaInsights";

export default function VaInsightsFilter({ range }: { range: VaInsightRange }) {
  const router = useRouter();

  return (
    <div className="min-w-[180px]">
      <label htmlFor="va-insights-range" className="block text-xs text-gray-400 mb-1">
        Time range
      </label>
      <select
        id="va-insights-range"
        value={range}
        onChange={(e) => {
          const value = e.target.value;
          router.push(value === "today" ? "/va-insights" : `/va-insights?range=${value}`);
        }}
        className="w-full px-4 py-2.5 bg-navy-light border border-navy-lighter rounded-lg text-white text-sm focus:outline-none focus:border-accent"
      >
        {VA_INSIGHT_RANGES.map((value) => (
          <option key={value} value={value}>
            {VA_INSIGHT_RANGE_LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  );
}

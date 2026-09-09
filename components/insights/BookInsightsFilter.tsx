"use client";

import { useRouter } from "next/navigation";
import { formatProductionMonthLabel } from "@/lib/bookInsights";

interface BookInsightsFilterProps {
  selectedMonth: string | null;
  availableMonths: string[];
}

export default function BookInsightsFilter({
  selectedMonth,
  availableMonths,
}: BookInsightsFilterProps) {
  const router = useRouter();

  function handleChange(value: string) {
    if (value === "book") {
      router.push("/insights");
      return;
    }
    router.push(`/insights?month=${value}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
      <div className="min-w-[220px]">
        <label htmlFor="insights-view" className="block text-xs text-gray-400 mb-1">
          View
        </label>
        <select
          id="insights-view"
          value={selectedMonth ?? "book"}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-navy-light border border-navy-lighter rounded-lg text-white text-sm focus:outline-none focus:border-accent"
        >
          <option value="book">Full book (active policies)</option>
          {availableMonths.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              Production · {formatProductionMonthLabel(monthKey)}
            </option>
          ))}
        </select>
      </div>
      {selectedMonth && (
        <p className="text-xs text-gray-500 sm:pb-3">
          Production uses each policy&apos;s effective date (or date added if missing).
        </p>
      )}
    </div>
  );
}

import type { ExpiringPremiumBucket } from "@/lib/bookInsights";
import { formatCurrency } from "@/lib/utils";

const BUCKET_COLORS = ["#ef4444", "#f59e0b", "#3b82f6"];

interface ExpiringPremiumChartProps {
  buckets: ExpiringPremiumBucket[];
}

export default function ExpiringPremiumChart({ buckets }: ExpiringPremiumChartProps) {
  const maxPremium = buckets.reduce((max, b) => Math.max(max, b.premium), 0);

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6 h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Expiring Premium</h2>
        <p className="text-xs text-gray-500 mt-1">
          Written premium on policies renewing soon (active book only)
        </p>
      </div>

      {maxPremium === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No renewals in the next 90 days.
        </p>
      ) : (
        <ul className="space-y-4">
          {buckets.map((bucket, index) => {
            const barWidth = maxPremium > 0 ? (bucket.premium / maxPremium) * 100 : 0;
            const color = BUCKET_COLORS[index] ?? BUCKET_COLORS[0];

            return (
              <li key={bucket.days}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm text-white">{bucket.label}</span>
                  <span className="text-sm text-gray-300">{formatCurrency(bucket.premium)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-3 bg-navy rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
                    {bucket.policyCount} pol.
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

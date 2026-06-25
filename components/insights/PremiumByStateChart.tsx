import { STATE_COLORS } from "@/components/insights/stateColors";
import type { StatePremiumSlice } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

const PERSONAL_COLOR = "#38bdf8";
const COMMERCIAL_COLOR = "#fb923c";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    return [
      `M ${cx} ${cy - r}`,
      `A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`,
      "Z",
    ].join(" ");
  }

  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function LineMixBar({
  personalPremium,
  commercialPremium,
  heightClass = "h-2",
}: {
  personalPremium: number;
  commercialPremium: number;
  heightClass?: string;
}) {
  const total = personalPremium + commercialPremium;
  if (total <= 0) {
    return <div className={`w-full ${heightClass} bg-navy rounded-full`} />;
  }

  const personalPct = (personalPremium / total) * 100;
  const commercialPct = (commercialPremium / total) * 100;

  return (
    <div className={`w-full ${heightClass} bg-navy rounded-full overflow-hidden flex`}>
      {personalPct > 0 && (
        <div
          className="h-full"
          style={{ width: `${personalPct}%`, backgroundColor: PERSONAL_COLOR }}
          title={`Personal: ${formatCurrency(personalPremium)}`}
        />
      )}
      {commercialPct > 0 && (
        <div
          className="h-full"
          style={{ width: `${commercialPct}%`, backgroundColor: COMMERCIAL_COLOR }}
          title={`Commercial: ${formatCurrency(commercialPremium)}`}
        />
      )}
    </div>
  );
}

interface PremiumByStateChartProps {
  slices: StatePremiumSlice[];
}

export default function PremiumByStateChart({ slices }: PremiumByStateChartProps) {
  const totalPremium = slices.reduce((sum, slice) => sum + slice.premium, 0);
  const totalPolicies = slices.reduce((sum, slice) => sum + slice.policyCount, 0);
  const personalPremium = slices.reduce((sum, slice) => sum + slice.personalPremium, 0);
  const commercialPremium = slices.reduce((sum, slice) => sum + slice.commercialPremium, 0);
  const personalCount = slices.reduce((sum, slice) => sum + slice.personalCount, 0);
  const commercialCount = slices.reduce((sum, slice) => sum + slice.commercialCount, 0);
  const chartSlices = slices.filter((slice) => slice.premium > 0);

  const personalPercent = totalPremium > 0 ? (personalPremium / totalPremium) * 100 : 0;
  const commercialPercent = totalPremium > 0 ? (commercialPremium / totalPremium) * 100 : 0;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 82;

  let angle = -90;

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Premium by State</h2>
          <p className="text-xs text-gray-500 mt-1">
            Active policies · written premium (6 & 12 mo mixed)
          </p>
        </div>
        {totalPremium > 0 && (
          <div className="text-right">
            <p className="text-xl font-bold text-white">{formatCurrency(totalPremium)}</p>
            <p className="text-xs text-gray-400">{totalPolicies.toLocaleString()} policies</p>
          </div>
        )}
      </div>

      {totalPremium === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No active premium to display yet.
        </p>
      ) : (
        <>
          <div className="mb-6 p-4 bg-navy/50 border border-navy-lighter rounded-lg space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Personal vs Commercial Lines
            </p>
            <LineMixBar
              personalPremium={personalPremium}
              commercialPremium={commercialPremium}
              heightClass="h-3"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                  style={{ backgroundColor: PERSONAL_COLOR }}
                />
                <div>
                  <p className="text-white font-medium">Personal Lines</p>
                  <p className="text-xs text-gray-400">Auto, home, renters &amp; other</p>
                  <p className="text-sm text-white mt-1">
                    {formatCurrency(personalPremium)}
                    <span className="text-gray-400 ml-1.5">
                      · {personalPercent.toFixed(1)}% · {personalCount} policies
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                  style={{ backgroundColor: COMMERCIAL_COLOR }}
                />
                <div>
                  <p className="text-white font-medium">Commercial Lines</p>
                  <p className="text-xs text-gray-400">Commercial auto &amp; GL</p>
                  <p className="text-sm text-white mt-1">
                    {formatCurrency(commercialPremium)}
                    <span className="text-gray-400 ml-1.5">
                      · {commercialPercent.toFixed(1)}% · {commercialCount} policies
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative shrink-0">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-44 h-44 md:w-52 md:h-52"
                role="img"
                aria-label="Pie chart of premium by state"
              >
                {chartSlices.map((slice) => {
                  const sweep = (slice.premium / totalPremium) * 360;
                  const start = angle;
                  const end = angle + sweep;
                  angle = end;
                  return (
                    <path
                      key={slice.state}
                      d={slicePath(cx, cy, radius, start, end)}
                      fill={STATE_COLORS[slice.state]}
                      stroke="#0f1117"
                      strokeWidth={2}
                    />
                  );
                })}
                <circle cx={cx} cy={cy} r={46} fill="#0f1117" />
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={600}
                >
                  Total
                </text>
                <text
                  x={cx}
                  y={cy + 12}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={9}
                >
                  {formatCurrency(totalPremium)}
                </text>
              </svg>
            </div>

            <ul className="flex-1 w-full space-y-4">
              {slices.map((slice) => {
                const personalPct =
                  slice.premium > 0 ? (slice.personalPremium / slice.premium) * 100 : 0;
                const commercialPct =
                  slice.premium > 0 ? (slice.commercialPremium / slice.premium) * 100 : 0;

                return (
                  <li key={slice.state} className="flex items-start gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: STATE_COLORS[slice.state] }}
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-white">
                          {slice.state}
                          <span className="text-gray-500 font-normal ml-1.5 hidden sm:inline">
                            {slice.label}
                          </span>
                        </span>
                        <span className="text-sm text-white shrink-0">
                          {formatCurrency(slice.premium)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 h-1.5 bg-navy rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${slice.percent}%`,
                              backgroundColor: STATE_COLORS[slice.state],
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
                          {slice.percent.toFixed(1)}% · {slice.policyCount}
                        </span>
                      </div>

                      {slice.premium > 0 && (
                        <div className="space-y-1.5">
                          <LineMixBar
                            personalPremium={slice.personalPremium}
                            commercialPremium={slice.commercialPremium}
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                            <span>
                              <span style={{ color: PERSONAL_COLOR }}>Personal</span>{" "}
                              {formatCurrency(slice.personalPremium)} ({personalPct.toFixed(0)}%)
                            </span>
                            <span>
                              <span style={{ color: COMMERCIAL_COLOR }}>Commercial</span>{" "}
                              {formatCurrency(slice.commercialPremium)} ({commercialPct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

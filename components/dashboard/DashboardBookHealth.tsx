import Link from "next/link";
import type { BookHealthSummary } from "@/lib/dashboardHub";

interface DashboardBookHealthProps {
  health: BookHealthSummary;
}

const CARD_CLASS =
  "border border-red-400/30 bg-gradient-to-br from-red-500/12 to-navy-light hover:border-red-400/50 transition-colors shadow-md shadow-black/10";

export default function DashboardBookHealth({ health }: DashboardBookHealthProps) {
  const items = [
    {
      label: "Missing email",
      value: health.missingEmail,
      href: "/policies",
      note: "Needed for renewal & non-pay alerts",
    },
    {
      label: "Missing phone",
      value: health.missingPhone,
      href: "/clients",
      note: "Harder to reach at renewal",
    },
    {
      label: "Spanish-speaking",
      value: health.spanishPolicies,
      href: "/insights",
      note: "Use Spanish templates",
    },
  ];

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-white">Book Health</h2>
        <Link href="/insights" className="text-sm text-accent hover:text-sky-300 hover:underline">
          Full analytics →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-xl p-4 ${CARD_CLASS}`}
          >
            <p className="text-2xl font-bold text-red-200">{item.value.toLocaleString()}</p>
            <p className="text-sm text-gray-200 mt-1">{item.label}</p>
            <p className="text-xs text-gray-400 mt-1">{item.note}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

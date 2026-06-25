import Link from "next/link";
import type { FocusAlert } from "@/lib/dashboardHub";

interface DashboardFocusBannerProps {
  alerts: FocusAlert[];
}

export default function DashboardFocusBanner({ alerts }: DashboardFocusBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <section className="bg-gradient-to-r from-amber-500/10 via-navy-light to-navy-light border border-amber-500/25 rounded-xl p-4 md:p-5 shadow-lg shadow-black/10">
      <h2 className="text-sm font-semibold text-amber-200 mb-3">Needs Your Attention</h2>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li key={alert.message}>
            <Link
              href={alert.href}
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 transition-colors ${
                alert.urgent
                  ? "text-orange-100 bg-orange-500/20 border border-orange-400/40 hover:bg-orange-500/30"
                  : "text-sky-100 bg-sky-500/15 border border-sky-400/30 hover:bg-sky-500/25"
              }`}
            >
              <span aria-hidden>{alert.urgent ? "⚠️" : "→"}</span>
              <span>{alert.message}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

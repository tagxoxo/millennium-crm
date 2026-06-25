import Link from "next/link";
import type { DashboardHubData } from "@/lib/dashboardHub";
import { formatCurrency } from "@/lib/utils";

interface DashboardHubCardsProps {
  hub: DashboardHubData;
}

type HubTheme = "sky" | "amber" | "emerald";

const THEME_STYLES: Record<
  HubTheme,
  { card: string; title: string; link: string; icon: string }
> = {
  sky: {
    card: "border-sky-500/30 bg-gradient-to-br from-sky-500/15 via-navy-light to-navy-light hover:border-sky-400/50 hover:from-sky-500/20",
    title: "text-sky-300",
    link: "text-sky-300 group-hover:text-sky-200",
    icon: "bg-sky-500/20",
  },
  amber: {
    card: "border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-navy-light to-navy-light hover:border-amber-400/50 hover:from-amber-500/20",
    title: "text-amber-300",
    link: "text-amber-300 group-hover:text-amber-200",
    icon: "bg-amber-500/20",
  },
  emerald: {
    card: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-navy-light to-navy-light hover:border-emerald-400/50 hover:from-emerald-500/20",
    title: "text-emerald-300",
    link: "text-emerald-300 group-hover:text-emerald-200",
    icon: "bg-emerald-500/20",
  },
};

function HubCard({
  href,
  icon,
  title,
  primaryValue,
  primaryLabel,
  metrics,
  footer,
  theme,
}: {
  href: string;
  icon: string;
  title: string;
  primaryValue: string;
  primaryLabel: string;
  metrics: { label: string; value: string; tone?: "default" | "warn" | "good" }[];
  footer?: string;
  theme: HubTheme;
}) {
  const styles = THEME_STYLES[theme];

  return (
    <Link
      href={href}
      className={`group block border rounded-xl p-5 md:p-6 transition-all shadow-lg shadow-black/20 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
          <p className="text-3xl md:text-4xl font-bold text-white mt-1">{primaryValue}</p>
          <p className="text-xs text-gray-300 mt-1">{primaryLabel}</p>
        </div>
        <span
          className={`text-2xl rounded-lg p-2 ${styles.icon}`}
          aria-hidden
        >
          {icon}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <p
              className={`text-lg font-semibold ${
                metric.tone === "warn"
                  ? "text-amber-300"
                  : metric.tone === "good"
                    ? "text-emerald-300"
                    : "text-white"
              }`}
            >
              {metric.value}
            </p>
            <p className="text-xs text-gray-300">{metric.label}</p>
          </div>
        ))}
      </div>

      {footer && <p className="text-xs text-gray-300 mt-3">{footer}</p>}

      <p className={`text-sm font-medium mt-4 group-hover:underline ${styles.link}`}>
        Open {title} →
      </p>
    </Link>
  );
}

export default function DashboardHubCards({ hub }: DashboardHubCardsProps) {
  const { retention, service, sales } = hub;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
      <HubCard
        href="/retention"
        icon="🔄"
        theme="sky"
        title="Retention Center"
        primaryValue={retention.renewalsNext30.toLocaleString()}
        primaryLabel="Renewals in the next 30 days"
        metrics={[
          {
            label: "Still in Upcoming",
            value: retention.stillUpcoming.toLocaleString(),
            tone: retention.stillUpcoming > 0 ? "warn" : "default",
          },
          {
            label: "Contacted or further",
            value: retention.alreadyContacted.toLocaleString(),
            tone: retention.alreadyContacted > 0 ? "good" : "default",
          },
        ]}
        footer={
          retention.premiumAtRisk > 0
            ? `${formatCurrency(retention.premiumAtRisk)} premium at risk · ${
                retention.remindersNeeded > 0
                  ? `${retention.remindersNeeded} need reminder`
                  : "reminders up to date"
              }`
            : retention.remindersNeeded > 0
              ? `${retention.remindersNeeded} need 45-day reminder`
              : undefined
        }
      />

      <HubCard
        href="/service-center"
        icon="🎧"
        theme="amber"
        title="Service Center"
        primaryValue={service.openNonPayAlerts.toLocaleString()}
        primaryLabel="Open non-pay alerts (unresolved)"
        metrics={[
          {
            label: "Outreach last 30 days",
            value: service.outreachLast30Days.toLocaleString(),
          },
          {
            label: "Renewal reminders sent",
            value: service.renewalRemindersSent30.toLocaleString(),
            tone: "good",
          },
        ]}
      />

      <HubCard
        href="/sales-center"
        icon="🎯"
        theme="emerald"
        title="Sales Center"
        primaryValue={sales.activeLeads.toLocaleString()}
        primaryLabel="Active leads (not sold)"
        metrics={[
          {
            label: "In Quoted stage",
            value: sales.quotedLeads.toLocaleString(),
            tone: sales.quotedLeads > 0 ? "good" : "default",
          },
          {
            label: "New — not contacted",
            value: sales.newLeads.toLocaleString(),
            tone: sales.newLeads > 0 ? "warn" : "default",
          },
        ]}
      />
    </div>
  );
}

import DashboardBookHealth from "@/components/dashboard/DashboardBookHealth";
import DashboardFocusBanner from "@/components/dashboard/DashboardFocusBanner";
import DashboardHubCards from "@/components/dashboard/DashboardHubCards";
import KpiCards from "@/components/dashboard/KpiCards";
import UrgentRenewalsTable from "@/components/dashboard/UrgentRenewalsTable";
import {
  buildFocusAlerts,
  computeDashboardHubData,
} from "@/lib/dashboardHub";
import {
  computeDashboardStats,
  getUrgentRenewals,
  URGENT_RENEWAL_DAYS,
} from "@/lib/dashboard";
import { fetchAllLeads } from "@/lib/leads";
import { fetchAllPolicies } from "@/lib/policies";
import { fetchRecentRenewalReminderPolicyIds } from "@/lib/renewalReminderQueries";
import { fetchOutreachActivity } from "@/lib/serviceCenter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const [
    { policies, error: policiesError },
    { activities, error: activitiesError },
    { leads, error: leadsError },
    recentReminderPolicyIds,
  ] = await Promise.all([
    fetchAllPolicies(),
    fetchOutreachActivity(),
    fetchAllLeads(),
    fetchRecentRenewalReminderPolicyIds(),
  ]);

  const error = policiesError ?? activitiesError ?? leadsError;

  const stats = computeDashboardStats(policies);
  const hub = computeDashboardHubData(
    policies,
    activities,
    leads,
    recentReminderPolicyIds
  );
  const focusAlerts = buildFocusAlerts(hub);
  const urgentRenewals = getUrgentRenewals(policies);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {policies.length === 0 && !error
            ? "No policies yet — import your AdaptAI export to get started."
            : `Your command center — ${policies.length} policies across retention, service & sales`}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load dashboard data</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}

      <KpiCards stats={stats} />

      <DashboardHubCards hub={hub} />

      <DashboardFocusBanner alerts={focusAlerts} />

      <DashboardBookHealth health={hub.bookHealth} />

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Urgent Renewals
          <span className="text-sm font-normal text-gray-400 ml-2">
            Next {URGENT_RENEWAL_DAYS} days
          </span>
        </h2>
        <UrgentRenewalsTable policies={urgentRenewals} />
      </section>
    </div>
  );
}

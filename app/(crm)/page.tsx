import KpiCards from "@/components/dashboard/KpiCards";
import KanbanBoard from "@/components/dashboard/KanbanBoard";
import UrgentRenewalsTable from "@/components/dashboard/UrgentRenewalsTable";
import {
  computeDashboardStats,
  getUrgentRenewals,
  URGENT_RENEWAL_DAYS,
} from "@/lib/dashboard";
import { fetchAllPolicies } from "@/lib/policies";
import { fetchDocumentCountsByPolicy } from "@/lib/documentQueries";
import { fetchPolicyCountByClient } from "@/lib/clients";
import { fetchRecentRenewalReminderPolicyIds } from "@/lib/renewalReminderQueries";
import type { Policy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPolicies(): Promise<{
  policies: Policy[];
  error: string | null;
}> {
  return fetchAllPolicies();
}

export default async function DashboardPage() {
  const { policies, error } = await getPolicies();
  const recentReminderPolicyIds = await fetchRecentRenewalReminderPolicyIds();
  const documentCounts = await fetchDocumentCountsByPolicy();
  const clientPolicyCounts = await fetchPolicyCountByClient();

  const stats = computeDashboardStats(policies);
  const urgentRenewals = getUrgentRenewals(policies);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          {policies.length === 0 && !error
            ? "No policies yet — import your AdaptAI export to get started."
            : `${policies.length} total policies in your book`}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load policies</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
          <p className="text-gray-400 text-xs mt-2">
            Try stopping the server (Ctrl+C) and running{" "}
            <code className="text-accent">npm run dev</code> again.
          </p>
        </div>
      )}

      <KpiCards stats={stats} />

      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Pipeline</h2>
        <p className="text-xs text-gray-500 mb-4 hidden md:block">
          Drag a client card to another column to change stage. Green envelope =
          45-day reminder sent; yellow = needs reminder.
        </p>
        <KanbanBoard
          policies={policies}
          recentReminderPolicyIds={recentReminderPolicyIds}
          documentCounts={documentCounts}
          clientPolicyCounts={clientPolicyCounts}
        />
      </section>

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

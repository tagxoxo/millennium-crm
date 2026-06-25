import ServiceCenterApp from "@/components/service-center/ServiceCenterApp";
import {
  computeServiceCenterStats,
  fetchOutreachActivity,
} from "@/lib/serviceCenter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServiceCenterPage() {
  const { activities, error } = await fetchOutreachActivity();
  const stats = computeServiceCenterStats(activities);

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-medium">Could not load outreach activity</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}
      <ServiceCenterApp activities={activities} stats={stats} />
    </div>
  );
}

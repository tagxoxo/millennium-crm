import InboundLeadTracker from "@/components/va-inbound/InboundLeadTracker";
import { fetchInboundLeads } from "@/lib/va-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InboundLeadsPage() {
  const { rows, error } = await fetchInboundLeads();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Inbound leads</h1>
        <p className="text-gray-400 text-sm mt-1">
          Website quote requests for Luis to call. 7 weekdays, live transfer to Jacob if they
          have a minute, or book a callback if they don&apos;t.
        </p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load inbound leads</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <InboundLeadTracker rows={rows} mode="crm" />
      )}
    </div>
  );
}

import CancelOutreachTracker from "@/components/va-cancels/CancelOutreachTracker";
import { fetchCancelOutreach } from "@/lib/va-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CanceledCallsPage() {
  const { rows, error } = await fetchCancelOutreach();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Canceled policy calls</h1>
        <p className="text-gray-400 text-sm mt-1">
          The VA enters cancelled people from the daily spreadsheet. Call days 1, 2, 3, 5,
          and 8 count weekdays from the start date and skip Saturday and Sunday.
        </p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load the call list</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <CancelOutreachTracker rows={rows} mode="crm" />
      )}
    </div>
  );
}

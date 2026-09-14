import TicketCenterApp from "@/components/tickets/TicketCenterApp";
import { fetchAllVaTickets } from "@/lib/va-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TicketCenterPage() {
  const { tickets, error } = await fetchAllVaTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Ticket Center</h1>
        <p className="text-gray-400 text-sm mt-1">
          Tickets from the VA desk — complete them here after you handle the request
        </p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load tickets</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <TicketCenterApp tickets={tickets} />
      )}
    </div>
  );
}

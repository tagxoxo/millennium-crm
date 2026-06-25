import ClientsTable from "@/components/clients/ClientsTable";
import { fetchAllClients } from "@/lib/clients";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientsPage() {
  const { clients, error } = await fetchAllClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Clients</h1>
        <p className="text-gray-400 text-sm mt-1">
          Master client profiles — each client can have multiple policies
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load clients</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}

      <ClientsTable clients={clients} />
    </div>
  );
}

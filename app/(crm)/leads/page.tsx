import AddLeadForm from "@/components/leads/AddLeadForm";
import LeadsKanban from "@/components/leads/LeadsKanban";
import { fetchAllLeads } from "@/lib/leads";
import { fetchWinBackPolicies } from "@/lib/policies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeadsPage() {
  const [{ leads, error }, winBack] = await Promise.all([
    fetchAllLeads(),
    fetchWinBackPolicies(),
  ]);
  const tableMissing = error?.includes("leads") && error?.includes("schema cache");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Sales Center</h1>
          <p className="text-gray-400 text-sm mt-1">
            Home nurturing, Quoted, and Luis Leads. Win Back on the right is for
            people who cancelled or lapsed — call them about 6 months later.
          </p>
        </div>
        <AddLeadForm />
      </div>

      {tableMissing ? (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4">
          <p className="text-yellow-300 font-medium">Leads table not set up yet</p>
          <p className="text-yellow-200/80 text-sm mt-1">
            Run <code className="text-accent">supabase/add-leads.sql</code> in Supabase SQL
            Editor, then refresh this page.
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load leads</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 hidden md:block">
            Click a card to open it. Drag a lead between columns, including into Win Back.
          </p>
          {winBack.error && (
            <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-xl p-4">
              <p className="text-yellow-300 font-medium">Win Back list did not load</p>
              <p className="text-yellow-200/80 text-sm mt-1">{winBack.error}</p>
            </div>
          )}
          <LeadsKanban leads={leads} winBackPolicies={winBack.policies} />
        </>
      )}
    </div>
  );
}

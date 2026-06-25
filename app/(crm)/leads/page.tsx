import AddLeadForm from "@/components/leads/AddLeadForm";
import LeadsKanban from "@/components/leads/LeadsKanban";
import { fetchAllLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeadsPage() {
  const { leads, error } = await fetchAllLeads();
  const tableMissing = error?.includes("leads") && error?.includes("schema cache");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Leads Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">
            New business prospects — separate from your renewal book
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
            Click a lead to open details, or drag a card to another column to change stage.
          </p>
          <LeadsKanban leads={leads} />
        </>
      )}
    </div>
  );
}

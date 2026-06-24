import AddPolicyForm from "@/components/policies/AddPolicyForm";
import PoliciesTable from "@/components/policies/PoliciesTable";
import { fetchAllPolicies } from "@/lib/policies";
import type { Policy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPolicies(): Promise<{
  policies: Policy[];
  error: string | null;
}> {
  return fetchAllPolicies();
}

export default async function PoliciesPage() {
  const { policies, error } = await getPolicies();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Policies</h1>
          <p className="text-gray-400 text-sm mt-1">
            Search and filter your full book of business
          </p>
        </div>
        <AddPolicyForm />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load policies</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}

      <PoliciesTable policies={policies} />
    </div>
  );
}

import AutomationCard from "@/components/automations/AutomationCard";
import CreateAutomationForm from "@/components/automations/CreateAutomationForm";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Automation } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAutomations(): Promise<{
  automations: Automation[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return { automations: [], error: error.message };
    return { automations: (data as Automation[]) ?? [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { automations: [], error: message };
  }
}

export default async function AutomationsPage() {
  const { automations, error } = await getAutomations();
  const activeCount = automations.filter((a) => a.active).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Automations
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {automations.length === 0
              ? "Set up automated messages for renewals and follow-ups"
              : `${activeCount} of ${automations.length} automations active`}
          </p>
        </div>
        <CreateAutomationForm />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-4">
          <p className="text-red-400 font-medium">Could not load automations</p>
          <p className="text-red-300/80 text-sm mt-1">{error}</p>
        </div>
      )}

      {automations.length === 0 && !error ? (
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
          <p className="text-gray-400">No automations yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Use {"{{google_review_link}}"} in templates for Google review requests.
        Set your link in <code className="text-accent">.env.local</code> as{" "}
        <code className="text-accent">NEXT_PUBLIC_GOOGLE_REVIEW_LINK</code>.
      </p>
    </div>
  );
}

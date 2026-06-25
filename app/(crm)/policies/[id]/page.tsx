import { notFound } from "next/navigation";
import AddContactForm from "@/components/policy-detail/AddContactForm";
import ContactTimeline from "@/components/policy-detail/ContactTimeline";
import EditPolicyForm from "@/components/policy-detail/EditPolicyForm";
import FlagNonPayButton from "@/components/policy-detail/FlagNonPayButton";
import PolicyInfo, { BackLink } from "@/components/policy-detail/PolicyInfo";
import StageDropdown from "@/components/policy-detail/StageDropdown";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ContactLog, Policy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPolicy(id: string): Promise<Policy | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Policy;
}

async function getContactLogs(policyId: string): Promise<ContactLog[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("contact_log")
    .select("*")
    .eq("policy_id", policyId)
    .order("contact_date", { ascending: false });

  if (error) return [];
  return (data as ContactLog[]) ?? [];
}

export default async function PolicyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const policy = await getPolicy(params.id);

  if (!policy) {
    notFound();
  }

  const contacts = await getContactLogs(policy.id);

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink />

      <PolicyInfo policy={policy} />

      <EditPolicyForm policy={policy} />

      <StageDropdown policyId={policy.id} currentStage={policy.stage} />

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Contact History</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <FlagNonPayButton policyId={policy.id} email={policy.email} />
            <AddContactForm policyId={policy.id} />
          </div>
        </div>
        <ContactTimeline contacts={contacts} />
      </section>
    </div>
  );
}

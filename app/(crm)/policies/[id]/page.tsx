import { notFound } from "next/navigation";
import AddContactForm from "@/components/policy-detail/AddContactForm";
import ContactTimeline from "@/components/policy-detail/ContactTimeline";
import CommunicationsTimeline from "@/components/policy-detail/CommunicationsTimeline";
import EditClientInfoForm from "@/components/policy-detail/EditClientInfoForm";
import EditPolicyForm from "@/components/policy-detail/EditPolicyForm";
import FlagNonPayButton from "@/components/policy-detail/FlagNonPayButton";
import PolicyDocumentsSection from "@/components/policy-detail/PolicyDocumentsSection";
import PolicyInfo, { BackLink } from "@/components/policy-detail/PolicyInfo";
import RenewalReminderButton from "@/components/policy-detail/RenewalReminderButton";
import StageDropdown from "@/components/policy-detail/StageDropdown";
import { fetchPolicyDocuments } from "@/lib/documentQueries";
import { buildEnglishRenewalReminder45,
  buildSpanishRenewalReminder45,
} from "@/lib/renewalReminderEmails";
import { buildNonPayAlertEmail } from "@/lib/sendNonPayAlert";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ContactLog, Policy } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";

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
  const documents = await fetchPolicyDocuments(policy.id);
  const carrierLabel = CARRIER_LABELS[policy.carrier] ?? policy.carrier;
  const renewalPreview = policy.spanish_speaker
    ? buildSpanishRenewalReminder45(policy.client_name, carrierLabel)
    : buildEnglishRenewalReminder45(policy.client_name, carrierLabel);
  const nonPayPreview = buildNonPayAlertEmail(policy);

  return (
    <div className="space-y-6 max-w-3xl">
      <BackLink />

      <PolicyInfo policy={policy} />

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <EditClientInfoForm policy={policy} />
        <EditPolicyForm policy={policy} />
      </div>

      <StageDropdown policyId={policy.id} currentStage={policy.stage} />

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Communications</h2>
          <RenewalReminderButton
            policyId={policy.id}
            email={policy.email}
            language={policy.spanish_speaker ? "Spanish" : "English"}
            preview={renewalPreview}
          />
        </div>
        <CommunicationsTimeline contacts={contacts} />
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Contact History</h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <FlagNonPayButton
              policyId={policy.id}
              email={policy.email}
              language={policy.spanish_speaker ? "Spanish" : "English"}
              preview={nonPayPreview}
            />
            <AddContactForm policyId={policy.id} />
          </div>
        </div>
        <ContactTimeline contacts={contacts} />
      </section>

      <PolicyDocumentsSection policy={policy} initialDocuments={documents} />
    </div>
  );
}

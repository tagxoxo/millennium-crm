import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactTimeline from "@/components/clients/ClientContactTimeline";
import ClientDocumentsSection from "@/components/clients/ClientDocumentsSection";
import AddClientPolicyForm, {
  ClientPolicyCards,
} from "@/components/clients/ClientPolicySection";
import EditClientForm, { ClientInfoCard } from "@/components/clients/EditClientForm";
import {
  fetchClientById,
  fetchContactLogsForClient,
  fetchDocumentsForClient,
  fetchPoliciesForClient,
} from "@/lib/clients";
import { CARRIER_LABELS, POLICY_TYPE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await fetchClientById(params.id);
  if (!client) notFound();

  const policies = await fetchPoliciesForClient(client.id);
  const contacts = await fetchContactLogsForClient(client.id);
  const documents = await fetchDocumentsForClient(client.id);

  const policyLabels: Record<string, string> = {};
  for (const p of policies) {
    const typeLabel = POLICY_TYPE_LABELS[p.policy_type] ?? "Policy";
    const carrierLabel = CARRIER_LABELS[p.carrier];
    policyLabels[p.id] = `${typeLabel} · ${carrierLabel}${p.policy_number ? ` #${p.policy_number}` : ""}`;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/clients"
        className="inline-flex items-center text-sm text-gray-400 hover:text-accent transition-colors"
      >
        ← Back to Clients
      </Link>

      <ClientInfoCard client={client} />
      <EditClientForm client={client} />

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">
            Policies
            <span className="text-sm font-normal text-gray-400 ml-2">
              {policies.length} linked
            </span>
          </h2>
          <AddClientPolicyForm client={client} />
        </div>
        <ClientPolicyCards policies={policies} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Communications Timeline
        </h2>
        <ClientContactTimeline contacts={contacts} policyLabels={policyLabels} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Documents</h2>
        <ClientDocumentsSection documents={documents} />
      </section>
    </div>
  );
}

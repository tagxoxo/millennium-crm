import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactTimeline from "@/components/clients/ClientContactTimeline";
import AddClientPolicyForm, {
  ClientPolicyCards,
} from "@/components/clients/ClientPolicySection";
import ClientDocumentUpload from "@/components/clients/ClientDocumentUpload";
import EditClientForm, { ClientInfoCard } from "@/components/clients/EditClientForm";
import {
  fetchClientById,
  fetchContactLogsForClient,
  mergeClientWithPolicies,
  syncClientFromPoliciesIfNeeded,
} from "@/lib/clients";
import {
  fetchPoliciesWithDocumentsForClient,
  reconcileClientPolicyDocuments,
} from "@/lib/policyHistory";
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

  await reconcileClientPolicyDocuments(client.id);

  const policies = await fetchPoliciesWithDocumentsForClient(client.id);
  const syncedClient = await syncClientFromPoliciesIfNeeded(
    client,
    policies.filter((p) => !p.is_historical)
  );
  const displayClient = mergeClientWithPolicies(syncedClient, policies);
  const contacts = await fetchContactLogsForClient(displayClient.id);

  const policyLabels: Record<string, string> = {};
  for (const p of policies) {
    const typeLabel = POLICY_TYPE_LABELS[p.policy_type] ?? "Policy";
    const carrierLabel = CARRIER_LABELS[p.carrier];
    policyLabels[p.id] = `${typeLabel} · ${carrierLabel}${p.policy_number ? ` #${p.policy_number}` : ""}`;
  }

  const currentCount = policies.filter((p) => !p.is_historical).length;
  const pastCount = policies.filter((p) => p.is_historical).length;

  const uploadPolicyOptions = policies
    .filter((p) => !p.is_historical)
    .concat(policies.filter((p) => p.is_historical))
    .map((p) => ({
      id: p.id,
      label: policyLabels[p.id] + (p.is_historical ? " (Past)" : ""),
    }));

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/clients"
        className="inline-flex items-center text-sm text-gray-400 hover:text-accent transition-colors"
      >
        ← Back to Clients
      </Link>

      <ClientInfoCard client={displayClient} />
      <EditClientForm client={displayClient} />

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">
            Policies
            <span className="text-sm font-normal text-gray-400 ml-2">
              {currentCount} current
              {pastCount > 0 && ` · ${pastCount} past`}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ClientDocumentUpload policies={uploadPolicyOptions} />
            <AddClientPolicyForm client={displayClient} />
          </div>
        </div>
        <ClientPolicyCards policies={policies} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">
          Communications Timeline
        </h2>
        <ClientContactTimeline contacts={contacts} policyLabels={policyLabels} />
      </section>
    </div>
  );
}

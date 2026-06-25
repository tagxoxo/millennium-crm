import Link from "next/link";
import { notFound } from "next/navigation";
import EditLeadForm, { LeadInfoCard } from "@/components/leads/EditLeadForm";
import { fetchLeadById } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await fetchLeadById(params.id);
  if (!lead) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/leads"
        className="inline-flex items-center text-sm text-gray-400 hover:text-accent transition-colors"
      >
        ← Back to Leads Pipeline
      </Link>

      <LeadInfoCard lead={lead} />
      <EditLeadForm lead={lead} />
    </div>
  );
}

import { getSupabaseServer } from "@/lib/supabase/server";
import type { PolicyDocument } from "@/lib/types";

export async function fetchPolicyDocuments(
  policyId: string
): Promise<PolicyDocument[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .eq("policy_id", policyId)
    .order("uploaded_at", { ascending: false });

  if (error) return [];
  return (data as PolicyDocument[]) ?? [];
}

export async function fetchDocumentCountsByPolicy(): Promise<
  Record<string, number>
> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policy_documents")
    .select("policy_id");

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.policy_id] = (counts[row.policy_id] ?? 0) + 1;
  }
  return counts;
}

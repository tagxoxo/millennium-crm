import type { Carrier, Policy } from "@/lib/types";
import { CARRIERS } from "@/lib/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ExtractedPolicyInfo } from "@/lib/extractPolicyInfo";
import type { ClientDocument } from "@/lib/clients";

const FILENAME_CARRIER_HINTS: { pattern: RegExp; carrier: Carrier }[] = [
  { pattern: /\bgeico\b/i, carrier: "geico" },
  { pattern: /\bprogressive\b|\bprog\b|pro[\s.+_-]*aut|proaut/i, carrier: "progressive" },
  { pattern: /\btrexis\b/i, carrier: "trexis" },
  { pattern: /\bgainsco\b/i, carrier: "gainsco" },
  { pattern: /\bforemost\b/i, carrier: "foremost" },
  { pattern: /\bsafeco\b/i, carrier: "safeco" },
  { pattern: /\bnational[\s_-]*general\b|\bnatgen\b/i, carrier: "national_general" },
  { pattern: /\bbristol[\s_-]*west\b/i, carrier: "bristol_west" },
  { pattern: /\bliberty[\s_-]*mutual\b|\bbop\b/i, carrier: "liberty_mutual_bop" },
  { pattern: /\btapco\b/i, carrier: "tapco" },
  { pattern: /\bcna\b/i, carrier: "cna" },
  { pattern: /\bmesa\b/i, carrier: "mesa" },
  { pattern: /\bacceptance\b/i, carrier: "acceptance_independent" },
];

export function inferCarrierFromFileName(fileName: string): Carrier | null {
  const normalized = decodeURIComponent(fileName.replace(/\+/g, " "));
  for (const { pattern, carrier } of FILENAME_CARRIER_HINTS) {
    if (pattern.test(normalized)) return carrier;
  }
  for (const carrier of CARRIERS) {
    const label = carrier.replace(/_/g, "[\\s_-]*");
    if (new RegExp(`\\b${label}\\b`, "i").test(normalized)) return carrier;
  }
  return null;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function findHistoricalPolicy(
  clientId: string,
  carrier: Carrier
): Promise<Policy | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_historical", true)
    .eq("carrier", carrier)
    .limit(1)
    .maybeSingle();

  return (data as Policy) ?? null;
}

async function createHistoricalPolicy(
  clientId: string,
  carrier: Carrier,
  sourceFileName: string,
  extracted?: ExtractedPolicyInfo | null
): Promise<Policy | null> {
  const supabase = getSupabaseServer();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  const renewalDate = formatDateYMD(new Date());
  const { data, error } = await supabase
    .from("policies")
    .insert({
      client_id: clientId,
      client_name: client.full_name,
      carrier,
      premium: 0,
      renewal_date: renewalDate,
      stage: "lapsed",
      is_historical: true,
      spanish_speaker: client.is_spanish_speaker,
      phone: client.phone,
      email: client.email,
      client_address: client.address,
      policy_number: extracted?.policy_number?.trim() || null,
      policy_type: "personal_auto",
      notes: `Past policy — created from document: ${sourceFileName}`,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return data as Policy;
}

/** Move document to a past-policy record when filename implies a different carrier. */
export async function assignDocumentToHistoricalPolicyIfNeeded(options: {
  documentId: string;
  policyId: string;
  fileName: string;
  extracted?: ExtractedPolicyInfo | null;
}): Promise<string> {
  const supabase = getSupabaseServer();
  const { data: policy } = await supabase
    .from("policies")
    .select("*")
    .eq("id", options.policyId)
    .single();

  if (!policy || policy.is_historical || !policy.client_id) {
    return options.policyId;
  }

  const inferred = inferCarrierFromFileName(options.fileName);
  if (!inferred || inferred === policy.carrier) {
    return options.policyId;
  }

  let historical =
    (await findHistoricalPolicy(policy.client_id, inferred)) ??
    (await createHistoricalPolicy(
      policy.client_id,
      inferred,
      options.fileName,
      options.extracted
    ));

  if (!historical) return options.policyId;

  await supabase
    .from("policy_documents")
    .update({ policy_id: historical.id })
    .eq("id", options.documentId);

  return historical.id;
}

/** Reconcile all documents for a client — split onto past-policy records by carrier. */
export async function reconcileClientPolicyDocuments(clientId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { data: policies } = await supabase
    .from("policies")
    .select("id")
    .eq("client_id", clientId);

  if (!policies?.length) return;

  const policyIds = policies.map((p) => p.id);
  const { data: documents } = await supabase
    .from("policy_documents")
    .select("id, policy_id, file_name")
    .in("policy_id", policyIds);

  if (!documents?.length) return;

  for (const doc of documents) {
    await assignDocumentToHistoricalPolicyIfNeeded({
      documentId: doc.id,
      policyId: doc.policy_id,
      fileName: doc.file_name,
    });
  }
}

export interface PolicyWithDocuments extends Policy {
  documents: ClientDocument[];
}

export async function fetchPoliciesWithDocumentsForClient(
  clientId: string
): Promise<PolicyWithDocuments[]> {
  const supabase = getSupabaseServer();
  const { data: policies } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .order("is_historical", { ascending: true })
    .order("renewal_date", { ascending: false });

  if (!policies?.length) return [];

  const policyIds = policies.map((p) => p.id);
  const { data: documents } = await supabase
    .from("policy_documents")
    .select("*")
    .in("policy_id", policyIds)
    .order("uploaded_at", { ascending: false });

  const docsByPolicy = new Map<string, ClientDocument[]>();
  for (const doc of documents ?? []) {
    const list = docsByPolicy.get(doc.policy_id) ?? [];
    list.push({ ...doc, policy_label: doc.file_name });
    docsByPolicy.set(doc.policy_id, list);
  }

  return (policies as Policy[]).map((policy) => ({
    ...policy,
    is_historical: Boolean(policy.is_historical),
    documents: docsByPolicy.get(policy.id) ?? [],
  }));
}

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { Carrier, Client, ClientWithStats, ContactLog, Policy, PolicyDocument } from "@/lib/types";
import { normalizeClientState } from "@/lib/types";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServer } from "@/lib/supabase/server";

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export async function fetchAllClients(): Promise<{
  clients: ClientWithStats[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("full_name", { ascending: true });

    if (clientsError) return { clients: [], error: clientsError.message };

    const { data: policies, error: policiesError } = await supabase
      .from("policies")
      .select(
        "client_id, premium, stage, carrier, client_name, email, phone, client_address, spanish_speaker, notes, is_historical"
      );

    if (policiesError) return { clients: [], error: policiesError.message };

    const statsMap = new Map<
      string,
      { count: number; active: number; premium: number; carriers: Set<Carrier> }
    >();
    const policiesByClient = new Map<string, Policy[]>();

    for (const p of policies ?? []) {
      if (!p.client_id) continue;

      const policyRow = p as Policy;
      const list = policiesByClient.get(p.client_id) ?? [];
      list.push(policyRow);
      policiesByClient.set(p.client_id, list);

      const entry = statsMap.get(p.client_id) ?? {
        count: 0,
        active: 0,
        premium: 0,
        carriers: new Set<Carrier>(),
      };
      entry.count += 1;
      if (!policyRow.is_historical && p.stage !== "lapsed") entry.active += 1;
      if (!policyRow.is_historical) entry.premium += Number(p.premium) || 0;
      if (p.carrier) entry.carriers.add(p.carrier as Carrier);
      statsMap.set(p.client_id, entry);
    }

    const result: ClientWithStats[] = (clients as Client[]).map((c) => {
      const s = statsMap.get(c.id);
      const merged = mergeClientWithPolicies(c, policiesByClient.get(c.id) ?? []);
      return {
        ...merged,
        policy_count: s?.count ?? 0,
        active_policy_count: s?.active ?? 0,
        total_premium: s?.premium ?? 0,
        carriers: s ? Array.from(s.carriers) : [],
      };
    });

    return { clients: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { clients: [], error: message };
  }
}

export async function fetchClientById(id: string): Promise<Client | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Client;
}

function firstPolicyValue(
  policies: Policy[],
  getter: (policy: Policy) => string | null | undefined
): string | null {
  for (const policy of policies) {
    const value = getter(policy)?.trim();
    if (value) return value;
  }
  return null;
}

/** Fill blank client fields from linked policy data (display only). */
export function mergeClientWithPolicies(
  client: Client,
  policies: Policy[]
): Client {
  if (policies.length === 0) return client;

  const spanishFromPolicy = policies.some((p) => p.spanish_speaker);

  return {
    ...client,
    full_name:
      client.full_name?.trim() ||
      firstPolicyValue(policies, (p) => p.client_name) ||
      client.full_name,
    email:
      client.email?.trim() ||
      firstPolicyValue(policies, (p) => p.email) ||
      null,
    phone:
      client.phone?.trim() ||
      firstPolicyValue(policies, (p) => p.phone) ||
      null,
    address:
      client.address?.trim() ||
      firstPolicyValue(policies, (p) => p.client_address) ||
      null,
    is_spanish_speaker: client.is_spanish_speaker || spanishFromPolicy,
    client_state: normalizeClientState(client.client_state),
    notes:
      client.notes?.trim() ||
      firstPolicyValue(policies, (p) => p.notes) ||
      null,
  };
}

/** Persist missing client fields from linked policies. */
export async function syncClientFromPoliciesIfNeeded(
  client: Client,
  policies: Policy[]
): Promise<Client> {
  if (policies.length === 0) return client;

  const merged = mergeClientWithPolicies(client, policies);
  const updates: Record<string, unknown> = {};

  if (!client.full_name?.trim() && merged.full_name?.trim()) {
    updates.full_name = merged.full_name.trim();
  }
  if (!client.email?.trim() && merged.email?.trim()) {
    updates.email = merged.email.trim();
  }
  if (!client.phone?.trim() && merged.phone?.trim()) {
    updates.phone = merged.phone.trim();
  }
  if (!client.address?.trim() && merged.address?.trim()) {
    updates.address = merged.address.trim();
  }
  if (!client.is_spanish_speaker && merged.is_spanish_speaker) {
    updates.is_spanish_speaker = true;
  }
  if (!client.notes?.trim() && merged.notes?.trim()) {
    updates.notes = merged.notes.trim();
  }

  if (Object.keys(updates).length === 0) return client;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", client.id)
    .select("*")
    .single();

  if (error || !data) return merged;
  return data as Client;
}

export async function syncClientFromPolicyId(policyId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { data: policy } = await supabase
    .from("policies")
    .select("client_id")
    .eq("id", policyId)
    .single();

  if (!policy?.client_id) return;

  const client = await fetchClientById(policy.client_id);
  if (!client) return;

  const policies = await fetchPoliciesForClient(client.id);
  await syncClientFromPoliciesIfNeeded(client, policies);
}

/** Backfill all client records from their linked policies. */
export async function syncAllClientsFromPolicies(): Promise<{
  updated: number;
  total: number;
}> {
  const supabase = getSupabaseServer();
  const { data: clients } = await supabase.from("clients").select("*");
  if (!clients?.length) return { updated: 0, total: 0 };

  let updated = 0;
  for (const client of clients as Client[]) {
    const policies = await fetchPoliciesForClient(client.id);
    const before = JSON.stringify(client);
    const after = await syncClientFromPoliciesIfNeeded(client, policies);
    if (JSON.stringify(after) !== before) updated += 1;
  }

  return { updated, total: clients.length };
}

export async function fetchPoliciesForClient(clientId: string): Promise<Policy[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .order("renewal_date", { ascending: true });

  if (error) return [];
  return (data as Policy[]) ?? [];
}

export async function fetchContactLogsForClient(
  clientId: string
): Promise<ContactLog[]> {
  const policies = await fetchPoliciesForClient(clientId);
  if (policies.length === 0) return [];

  const supabase = getSupabaseServer();
  const policyIds = policies.map((p) => p.id);
  const { data, error } = await supabase
    .from("contact_log")
    .select("*")
    .in("policy_id", policyIds)
    .order("contact_date", { ascending: false });

  if (error) return [];
  return (data as ContactLog[]) ?? [];
}

export interface ClientDocument extends PolicyDocument {
  policy_label: string;
}

export async function fetchDocumentsForClient(
  clientId: string
): Promise<ClientDocument[]> {
  const policies = await fetchPoliciesForClient(clientId);
  if (policies.length === 0) return [];

  const supabase = getSupabaseServer();
  const policyIds = policies.map((p) => p.id);
  const policyLabel = new Map(
    policies.map((p) => [
      p.id,
      `${p.policy_number || "No #"}`,
    ])
  );

  const { data, error } = await supabase
    .from("policy_documents")
    .select("*")
    .in("policy_id", policyIds)
    .order("uploaded_at", { ascending: false });

  if (error || !data) return [];

  return (data as PolicyDocument[]).map((doc) => ({
    ...doc,
    policy_label: policyLabel.get(doc.policy_id) ?? "Policy",
  }));
}

export async function findDuplicateClients(
  email?: string | null,
  phone?: string | null
): Promise<Client[]> {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);
  if (!normEmail && !normPhone) return [];

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("clients").select("*");

  if (error || !data) return [];

  return (data as Client[]).filter((c) => {
    if (normEmail && normalizeEmail(c.email) === normEmail) return true;
    if (normPhone && normalizePhone(c.phone) === normPhone) return true;
    return false;
  });
}

export async function fetchPolicyCountByClient(): Promise<Record<string, number>> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policies")
    .select("client_id");

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (!row.client_id) continue;
    counts[row.client_id] = (counts[row.client_id] ?? 0) + 1;
  }
  return counts;
}

export async function syncPoliciesFromClient(client: Client): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase
    .from("policies")
    .update({
      client_name: client.full_name,
      email: client.email,
      phone: client.phone,
      client_address: client.address,
      spanish_speaker: client.is_spanish_speaker,
      client_state: normalizeClientState(client.client_state),
    })
    .eq("client_id", client.id);
}

export async function deleteClientById(
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseServer();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false, error: "Client not found." };
  }

  const { data: policies, error: policiesError } = await supabase
    .from("policies")
    .select("id")
    .eq("client_id", clientId);

  if (policiesError) {
    return { ok: false, error: policiesError.message };
  }

  const policyIds = (policies ?? []).map((p) => p.id);

  if (policyIds.length > 0) {
    const { data: documents, error: documentsError } = await supabase
      .from("policy_documents")
      .select("r2_key")
      .in("policy_id", policyIds);

    if (documentsError) {
      return { ok: false, error: documentsError.message };
    }

    if (documents && documents.length > 0) {
      const r2 = getR2Client();
      const bucket = getR2Bucket();
      await Promise.allSettled(
        documents.map((doc) =>
          r2.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: doc.r2_key })
          )
        )
      );
    }

    const { error: deletePoliciesError } = await supabase
      .from("policies")
      .delete()
      .in("id", policyIds);

    if (deletePoliciesError) {
      return { ok: false, error: deletePoliciesError.message };
    }
  }

  const { error: deleteClientError } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (deleteClientError) {
    return { ok: false, error: deleteClientError.message };
  }

  return { ok: true };
}

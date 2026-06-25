import { NextRequest, NextResponse } from "next/server";
import { findDuplicateClients, syncPoliciesFromClient } from "@/lib/clients";
import { resolveInitialPipelineStage } from "@/lib/retentionPipeline";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier, Client, PolicyType, Stage, TermMonths } from "@/lib/types";
import { CARRIERS, POLICY_TYPES, STAGES, TERM_MONTHS, normalizeClientState } from "@/lib/types";

async function createClientFromBody(body: Record<string, unknown>): Promise<Client | null> {
  const supabase = getSupabaseServer();
  const fullName = String(body.client_name ?? body.full_name ?? "").trim();
  const email = (body.email as string)?.trim() || null;
  const phone = (body.phone as string)?.trim() || null;

  const { data, error } = await supabase
    .from("clients")
    .insert({
      full_name: fullName,
      email,
      phone,
      address: (body.client_address as string)?.trim() || (body.address as string)?.trim() || null,
      is_spanish_speaker: Boolean(body.spanish_speaker),
      client_state: normalizeClientState(body.client_state),
      notes: (body.notes as string)?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return data as Client;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientName = String(body.client_name ?? "").trim();
    const carrier = body.carrier as Carrier;
    const renewalDate = body.renewal_date as string;
    const stage = resolveInitialPipelineStage(
      renewalDate,
      body.stage as Stage | undefined,
      false
    );

    if (!clientName) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    if (!carrier || !CARRIERS.includes(carrier)) {
      return NextResponse.json({ error: "Invalid carrier." }, { status: 400 });
    }

    if (!renewalDate) {
      return NextResponse.json({ error: "Expiration date is required." }, { status: 400 });
    }

    if (stage && !STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    const termMonths = Number(body.term_months) === 6 ? 6 : 12;
    if (!TERM_MONTHS.includes(termMonths as TermMonths)) {
      return NextResponse.json({ error: "Invalid term." }, { status: 400 });
    }

    const policyType = (body.policy_type as PolicyType) || "personal_auto";
    if (!POLICY_TYPES.includes(policyType)) {
      return NextResponse.json({ error: "Invalid policy type." }, { status: 400 });
    }

    const priorCarrier = body.prior_carrier?.trim() || null;
    if (priorCarrier && !CARRIERS.includes(priorCarrier as Carrier)) {
      return NextResponse.json({ error: "Invalid prior carrier." }, { status: 400 });
    }

    let clientId: string | null = body.client_id?.trim() || null;
    let client: Client | null = null;

    if (clientId) {
      const supabase = getSupabaseServer();
      const { data } = await supabase.from("clients").select("*").eq("id", clientId).single();
      client = data as Client | null;
      if (!client) {
        return NextResponse.json({ error: "Client not found." }, { status: 400 });
      }
    } else if (!body.force_create) {
      const email = body.email?.trim() || null;
      const phone = body.phone?.trim() || null;
      const duplicates = await findDuplicateClients(email, phone);
      if (duplicates.length > 0) {
        return NextResponse.json({
          duplicate: true,
          matches: duplicates,
        });
      }
    }

    if (!client) {
      client = await createClientFromBody(body);
      if (!client) {
        return NextResponse.json({ error: "Failed to create client record." }, { status: 400 });
      }
      clientId = client.id;
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("policies")
      .insert({
        client_id: clientId,
        client_name: client?.full_name ?? clientName,
        carrier,
        prior_carrier: priorCarrier,
        premium: parseFloat(body.premium) || 0,
        renewal_date: renewalDate,
        effective_date: body.effective_date?.trim() || null,
        stage,
        spanish_speaker: Boolean(body.spanish_speaker),
        client_state: normalizeClientState(
          body.client_state ?? client?.client_state
        ),
        commercial: Boolean(body.commercial),
        term_months: termMonths,
        policy_type: policyType,
        phone: body.phone?.trim() || client?.phone || null,
        email: body.email?.trim() || client?.email || null,
        policy_number: body.policy_number?.trim() || null,
        client_address: body.client_address?.trim() || client?.address || null,
        client_since: body.client_since?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (client) {
      await syncPoliciesFromClient(client);
    }

    return NextResponse.json({ id: data.id, client_id: clientId });
  } catch {
    return NextResponse.json({ error: "Failed to add policy." }, { status: 500 });
  }
}

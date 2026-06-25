import { NextRequest, NextResponse } from "next/server";
import { fetchClientById } from "@/lib/clients";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier, PolicyType, Stage, TermMonths } from "@/lib/types";
import { CARRIERS, POLICY_TYPES, STAGES, TERM_MONTHS } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await fetchClientById(params.id);
    if (!client) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const body = await request.json();
    const carrier = body.carrier as Carrier;
    const renewalDate = body.renewal_date as string;
    const stage = (body.stage as Stage) || "upcoming";

    if (!carrier || !CARRIERS.includes(carrier)) {
      return NextResponse.json({ error: "Invalid carrier." }, { status: 400 });
    }

    if (!renewalDate) {
      return NextResponse.json({ error: "Renewal date is required." }, { status: 400 });
    }

    if (stage && !STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    const termMonths = Number(body.term_months) === 6 ? 6 : 12;
    if (!TERM_MONTHS.includes(termMonths as TermMonths)) {
      return NextResponse.json({ error: "Invalid term." }, { status: 400 });
    }

    const policyType = body.policy_type as PolicyType;
    if (policyType && !POLICY_TYPES.includes(policyType)) {
      return NextResponse.json({ error: "Invalid policy type." }, { status: 400 });
    }

    const priorCarrier = body.prior_carrier?.trim() || null;
    if (priorCarrier && !CARRIERS.includes(priorCarrier as Carrier)) {
      return NextResponse.json({ error: "Invalid prior carrier." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("policies")
      .insert({
        client_id: client.id,
        client_name: client.full_name,
        carrier,
        prior_carrier: priorCarrier,
        premium: parseFloat(body.premium) || 0,
        renewal_date: renewalDate,
        stage,
        spanish_speaker: client.is_spanish_speaker,
        commercial: Boolean(body.commercial),
        term_months: termMonths,
        policy_type: policyType || "personal_auto",
        phone: client.phone,
        email: client.email,
        client_address: client.address,
        policy_number: body.policy_number?.trim() || null,
        client_since: body.client_since?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Failed to add policy." }, { status: 500 });
  }
}

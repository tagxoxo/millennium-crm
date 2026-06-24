import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier, TermMonths } from "@/lib/types";
import { CARRIERS, TERM_MONTHS } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const carrier = body.carrier as Carrier;

    if (carrier && !CARRIERS.includes(carrier)) {
      return NextResponse.json({ error: "Invalid carrier." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const updates: Record<string, unknown> = {};

    if (body.client_name !== undefined) updates.client_name = String(body.client_name).trim();
    if (body.carrier !== undefined) updates.carrier = carrier;
    if (body.prior_carrier !== undefined) {
      const priorCarrier = body.prior_carrier?.trim() || null;
      if (priorCarrier && !CARRIERS.includes(priorCarrier as Carrier)) {
        return NextResponse.json({ error: "Invalid prior carrier." }, { status: 400 });
      }
      updates.prior_carrier = priorCarrier;
    }
    if (body.premium !== undefined) updates.premium = parseFloat(body.premium) || 0;
    if (body.renewal_date !== undefined) updates.renewal_date = body.renewal_date;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.policy_number !== undefined) updates.policy_number = body.policy_number?.trim() || null;
    if (body.client_since !== undefined) updates.client_since = body.client_since?.trim() || null;
    if (body.spanish_speaker !== undefined) updates.spanish_speaker = Boolean(body.spanish_speaker);
    if (body.commercial !== undefined) updates.commercial = Boolean(body.commercial);
    if (body.term_months !== undefined) {
      const termMonths = Number(body.term_months) === 6 ? 6 : 12;
      if (!TERM_MONTHS.includes(termMonths as TermMonths)) {
        return NextResponse.json({ error: "Invalid term." }, { status: 400 });
      }
      updates.term_months = termMonths;
    }
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.stage !== undefined) updates.stage = body.stage;

    const { error } = await supabase
      .from("policies")
      .update(updates)
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save policy." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("policies").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete policy." }, { status: 500 });
  }
}

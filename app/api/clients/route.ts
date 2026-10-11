import { NextRequest, NextResponse } from "next/server";
import { findDuplicateClients } from "@/lib/clients";
import { getSupabaseServer } from "@/lib/supabase/server";
import { normalizeClientState, normalizeLeadSource } from "@/lib/types";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const phone = request.nextUrl.searchParams.get("phone");

  const matches = await findDuplicateClients(email, phone);
  return NextResponse.json({ matches });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body.full_name ?? "").trim();

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const email = body.email?.trim() || null;
    const phone = body.phone?.trim() || null;
    const rawLeadSource = String(body.lead_source ?? "").trim();
    if (rawLeadSource && !normalizeLeadSource(rawLeadSource)) {
      return NextResponse.json({ error: "Invalid lead source." }, { status: 400 });
    }

    const duplicates = await findDuplicateClients(email, phone);
    if (duplicates.length > 0 && !body.force_create) {
      return NextResponse.json({
        duplicate: true,
        matches: duplicates,
      });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: fullName,
        email,
        phone,
        address: body.address?.trim() || null,
        date_of_birth: body.date_of_birth?.trim() || null,
        is_spanish_speaker: Boolean(body.is_spanish_speaker),
        client_state: normalizeClientState(body.client_state),
        lead_source: normalizeLeadSource(body.lead_source),
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}

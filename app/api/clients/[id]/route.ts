import { NextRequest, NextResponse } from "next/server";
import { fetchClientById, syncPoliciesFromClient } from "@/lib/clients";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await fetchClientById(params.id);
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServer();
    const updates: Record<string, unknown> = {};

    if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim();
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.address !== undefined) updates.address = body.address?.trim() || null;
    if (body.date_of_birth !== undefined) {
      updates.date_of_birth = body.date_of_birth?.trim() || null;
    }
    if (body.is_spanish_speaker !== undefined) {
      updates.is_spanish_speaker = Boolean(body.is_spanish_speaker);
    }
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await syncPoliciesFromClient(data as Client);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save client." }, { status: 500 });
  }
}

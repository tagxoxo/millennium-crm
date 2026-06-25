import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { LeadStage } from "@/lib/types";
import { LEAD_STAGES } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServer();
    const updates: Record<string, unknown> = {};

    if (body.full_name !== undefined) {
      updates.full_name = String(body.full_name).trim();
    }
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.label !== undefined) updates.label = body.label?.trim() || null;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    if (body.agent_initials !== undefined) {
      updates.agent_initials = body.agent_initials?.trim() || "JG";
    }
    if (body.stage !== undefined) {
      const stage = body.stage as LeadStage;
      if (!LEAD_STAGES.includes(stage)) {
        return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
      }
      updates.stage = stage;
    }

    const { error } = await supabase.from("leads").update(updates).eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("leads").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lead." }, { status: 500 });
  }
}

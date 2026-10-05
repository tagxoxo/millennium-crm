import { NextRequest, NextResponse } from "next/server";
import { fetchLeadById } from "@/lib/leads";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { LeadStage } from "@/lib/types";
import { LEAD_STAGES } from "@/lib/types";
import { isYmd, todayYmd } from "@/lib/winBack";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const lead = await fetchLeadById(params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  return NextResponse.json({ lead });
}

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
    if (body.left_on !== undefined) {
      const raw = body.left_on == null ? "" : String(body.left_on).trim();
      if (!raw) {
        updates.left_on = null;
      } else if (!isYmd(raw.slice(0, 10))) {
        return NextResponse.json({ error: "Enter the date they left." }, { status: 400 });
      } else {
        updates.left_on = raw.slice(0, 10);
      }
    }
    if (body.stage !== undefined) {
      const stage = body.stage as LeadStage;
      if (!LEAD_STAGES.includes(stage)) {
        return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
      }
      updates.stage = stage;
      if (stage === "win_back" && updates.left_on === undefined) {
        const { data: existing } = await supabase
          .from("leads")
          .select("left_on")
          .eq("id", params.id)
          .single();
        if (!existing?.left_on) updates.left_on = todayYmd();
      }
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

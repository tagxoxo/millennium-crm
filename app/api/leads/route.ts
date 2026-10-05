import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { LeadStage } from "@/lib/types";
import { DEFAULT_AGENT_INITIALS, LEAD_STAGES } from "@/lib/types";
import { isYmd, todayYmd } from "@/lib/winBack";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ leads: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body.full_name ?? "").trim();
    const stage = (body.stage as LeadStage) || "new";

    if (!fullName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!LEAD_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    let leftOn: string | null = null;
    if (body.left_on != null && String(body.left_on).trim()) {
      leftOn = String(body.left_on).trim().slice(0, 10);
      if (!isYmd(leftOn)) {
        return NextResponse.json({ error: "Enter the date they left." }, { status: 400 });
      }
    } else if (stage === "win_back") {
      leftOn = todayYmd();
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        full_name: fullName,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        stage,
        label: body.label?.trim() || null,
        agent_initials: body.agent_initials?.trim() || DEFAULT_AGENT_INITIALS,
        notes: body.notes?.trim() || null,
        left_on: leftOn,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Failed to add lead." }, { status: 500 });
  }
}

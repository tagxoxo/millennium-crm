import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const policyId =
      typeof body.policy_id === "string" ? body.policy_id.trim() : "";
    const response =
      typeof body.response === "string" ? body.response.trim() : "";

    if (!policyId) {
      return NextResponse.json({ error: "policy_id is required." }, { status: 400 });
    }

    if (!response) {
      return NextResponse.json({ error: "Response text is required." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.from("contact_log").insert({
      policy_id: policyId,
      contact_type: "policy_review_response",
      status: "sent",
      outcome: "Client response logged",
      notes: response,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log response." }, { status: 500 });
  }
}

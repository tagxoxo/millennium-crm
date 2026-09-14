import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isVaRequestType, type VaLanguage } from "@/lib/va";
import { getVaAuthUser, getVaRole } from "@/lib/va-server";

export async function POST(request: NextRequest) {
  try {
    const user = await getVaAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const role = await getVaRole(user.id, user.email);
    if (role !== "va") {
      return NextResponse.json({ error: "VA access only." }, { status: 403 });
    }

    const body = await request.json();
    const callerName = String(body.caller_name ?? "").trim();
    const requestType = String(body.request_type ?? "").trim();
    const language = (body.language === "spanish" ? "spanish" : "english") as VaLanguage;
    const policyNumber = String(body.policy_number ?? "").trim();
    const phoneNumber = String(body.phone_number ?? "").trim();
    const notes = String(body.notes ?? "").trim();

    if (!callerName) {
      return NextResponse.json({ error: "Caller name is required." }, { status: 400 });
    }

    if (!isVaRequestType(requestType)) {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_requests")
      .insert({
        caller_name: callerName,
        policy_number: policyNumber || null,
        phone_number: phoneNumber || null,
        request_type: requestType,
        language,
        notes: notes || null,
        status: "pending",
        submitted_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}

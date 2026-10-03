import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { addDaysYmd } from "@/lib/vaCancelOutreach";
import { mapInboundRow } from "@/lib/vaInboundOutreach";
import { INBOUND_LEAD_SELECT, getVaAuthUser, getVaRole } from "@/lib/va-server";

function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDaysYmd(value, 0) === value;
}

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
    const clientName = String(body.client_name ?? "").trim();
    const phoneNumber = String(body.phone_number ?? "").trim();
    const startDate = String(body.start_date ?? "").trim();

    if (!clientName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!isYmd(startDate)) {
      return NextResponse.json({ error: "Enter a valid start date." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_inbound_leads")
      .insert({
        client_name: clientName,
        phone_number: phoneNumber,
        start_date: startDate,
        status: "active",
        attempts: [],
        submitted_by: user.id,
      })
      .select(INBOUND_LEAD_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ row: mapInboundRow(data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: "Failed to add this lead." }, { status: 500 });
  }
}

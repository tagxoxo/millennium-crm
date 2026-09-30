import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { todayInAgencyTz } from "@/lib/va";
import {
  addDaysYmd,
  mapCancelRow,
  parseAmountDue,
} from "@/lib/vaCancelOutreach";
import { CANCEL_OUTREACH_SELECT, getVaAuthUser, getVaRole } from "@/lib/va-server";

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
    const policyNumber = String(body.policy_number ?? "").trim();
    const cancelledDate = String(body.cancelled_date ?? "").trim();
    const startDate = String(body.start_date ?? "").trim();
    const amountDue = parseAmountDue(body.amount_due);

    if (!clientName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!policyNumber) {
      return NextResponse.json({ error: "Policy number is required." }, { status: 400 });
    }
    if (!isYmd(cancelledDate)) {
      return NextResponse.json({ error: "Enter a valid cancelled date." }, { status: 400 });
    }
    if (!isYmd(startDate)) {
      return NextResponse.json({ error: "Enter a valid start date." }, { status: 400 });
    }
    if (amountDue == null) {
      return NextResponse.json({ error: "Amount due is required." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_cancel_outreach")
      .insert({
        client_name: clientName,
        phone_number: phoneNumber,
        policy_number: policyNumber,
        cancelled_date: cancelledDate,
        start_date: startDate,
        amount_due: amountDue,
        status: "active",
        attempts: [],
        submitted_by: user.id,
      })
      .select(CANCEL_OUTREACH_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ row: mapCancelRow(data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: "Failed to add this person." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getVaAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const role = await getVaRole(user.id, user.email);
    if (role !== "va") {
      return NextResponse.json({ error: "VA access only." }, { status: 403 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_cancel_outreach")
      .select(CANCEL_OUTREACH_SELECT)
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      today: todayInAgencyTz(),
      rows: (data ?? []).map((row) => mapCancelRow(row as Record<string, unknown>)),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load the call list." }, { status: 500 });
  }
}

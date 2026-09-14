import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendTicketAlertEmail } from "@/lib/sendTicketAlert";
import { refreshSavedVaMetrics } from "@/lib/vaInsights";
import {
  isVaCarrier,
  isVaRequestType,
  type VaLanguage,
  type VaRequest,
} from "@/lib/va";
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
    const email = String(body.email ?? "").trim().toLowerCase();
    const notes = String(body.notes ?? "").trim();
    const carrier = String(body.carrier ?? "").trim();

    if (!callerName) {
      return NextResponse.json({ error: "Caller name is required." }, { status: 400 });
    }

    if (!isVaRequestType(requestType)) {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }

    if (!isVaCarrier(carrier)) {
      return NextResponse.json({ error: "Carrier is required." }, { status: 400 });
    }

    if (email && !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_requests")
      .insert({
        caller_name: callerName,
        policy_number: policyNumber || null,
        phone_number: phoneNumber || null,
        email: email || null,
        request_type: requestType,
        carrier,
        language,
        notes: notes || null,
        status: "pending",
        submitted_by: user.id,
      })
      .select(
        "id, created_at, caller_name, policy_number, phone_number, email, request_type, carrier, language, notes, status, completed_at, submitted_by"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const ticket = data as VaRequest;

    try {
      await sendTicketAlertEmail(ticket);
      await supabase
        .from("va_requests")
        .update({ status: "sent_to_agent" })
        .eq("id", ticket.id);
    } catch (emailError) {
      console.error("VA ticket email failed:", emailError);
    }

    void refreshSavedVaMetrics().catch((err) => {
      console.error("VA metrics sync failed:", err);
    });

    return NextResponse.json({ id: ticket.id });
  } catch {
    return NextResponse.json({ error: "Failed to submit request." }, { status: 500 });
  }
}

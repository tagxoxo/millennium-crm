import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendTicketToGrok } from "@/lib/sendTicketToGrok";
import { maskIntakeForVa } from "@/lib/vaPaymentSecret";
import { parseIntakeAnswers } from "@/lib/vaScript";
import type { VaRequest } from "@/lib/va";

const TICKET_COLUMNS =
  "id, created_at, caller_name, policy_number, phone_number, email, request_type, carrier, language, notes, intake, status, completed_at, submitted_by";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("va_requests")
      .select(TICKET_COLUMNS)
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const ticket = data as VaRequest;
    await sendTicketToGrok({
      ...ticket,
      intake: maskIntakeForVa(parseIntakeAnswers(ticket.intake)),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send ticket to Grok failed:", err);
    return NextResponse.json(
      { error: "Failed to send ticket to Grok." },
      { status: 500 }
    );
  }
}

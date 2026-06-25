import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CARRIER_LABELS } from "@/lib/types";
import type { Carrier } from "@/lib/types";

const NON_PAY_WEBHOOK_URL =
  "https://hook.us2.make.com/21cx870w73ubd4c6pux6k9tz2xxxlbnp";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();
    const { data: policy, error: fetchError } = await supabase
      .from("policies")
      .select("id, client_name, email, carrier")
      .eq("id", params.id)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    }

    const carrierLabel =
      CARRIER_LABELS[policy.carrier as Carrier] ?? policy.carrier;

    const webhookRes = await fetch(NON_PAY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: policy.client_name,
        email: policy.email ?? "",
        carrier: carrierLabel,
      }),
    });

    if (!webhookRes.ok) {
      return NextResponse.json(
        { error: "Failed to send non-pay alert. Try again." },
        { status: 502 }
      );
    }

    const { error: logError } = await supabase.from("contact_log").insert({
      policy_id: policy.id,
      contact_type: "non_pay_alert",
      notes: "Non-pay alert email sent via Make.com",
    });

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send non-pay alert." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sendNonPayAlertForPolicy } from "@/lib/sendNonPayAlert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const policyId =
      typeof body.policy_id === "string" ? body.policy_id.trim() : "";

    if (!policyId) {
      return NextResponse.json(
        { error: "policy_id is required." },
        { status: 400 }
      );
    }

    const result = await sendNonPayAlertForPolicy(policyId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if ("logWarning" in result && result.logWarning) {
      return NextResponse.json({ ok: true, logWarning: result.logWarning });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-nonpay-alert failed:", err);
    const raw =
      err instanceof Error ? err.message : "Failed to send non-pay alert.";
    const message =
      raw.includes("BadCredentials") || raw.includes("535")
        ? "Gmail login failed. Regenerate a Google App Password and update GMAIL_APP_PASSWORD on Vercel."
        : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

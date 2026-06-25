import { NextRequest, NextResponse } from "next/server";
import { sendRenewalReminder45ForPolicy } from "@/lib/sendRenewalReminder45";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sendRenewalReminder45ForPolicy(params.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if ("logWarning" in result && result.logWarning) {
      return NextResponse.json({ ok: true, logWarning: result.logWarning });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("renewal-reminder send failed:", err);
    const raw = err instanceof Error ? err.message : "Failed to send renewal reminder.";
    const message = raw.includes("BadCredentials") || raw.includes("535")
      ? "Gmail login failed. Regenerate a Google App Password and update GMAIL_APP_PASSWORD on Vercel."
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

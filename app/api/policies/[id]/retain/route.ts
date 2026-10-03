import { NextRequest, NextResponse } from "next/server";
import { retainPolicy } from "@/lib/retainPolicyServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const result = await retainPolicy(params.id, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      rewritten: result.rewritten,
      renewal_date: result.renewalDate,
      premium: result.premium,
    });
  } catch {
    return NextResponse.json({ error: "Failed to retain policy." }, { status: 500 });
  }
}

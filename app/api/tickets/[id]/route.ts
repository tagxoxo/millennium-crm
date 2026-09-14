import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { refreshSavedVaMetrics } from "@/lib/vaInsights";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (body.status !== "completed") {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("va_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    void refreshSavedVaMetrics().catch((err) => {
      console.error("VA metrics sync failed:", err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to complete ticket." }, { status: 500 });
  }
}

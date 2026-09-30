import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  applyCancelAction,
  mapCancelRow,
  type CancelLogAction,
} from "@/lib/vaCancelOutreach";
import {
  CANCEL_OUTREACH_SELECT,
  getVaAuthUser,
  getVaRole,
} from "@/lib/va-server";

const ACTIONS = new Set<CancelLogAction>([
  "call",
  "vm",
  "call_vm",
  "spoke",
  "reinstated",
  "closed",
  "reopen",
]);

function isAction(value: string): value is CancelLogAction {
  return ACTIONS.has(value as CancelLogAction);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const action = String(body.action ?? "");
    const note = String(body.note ?? "").trim();

    if (!isAction(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: existing, error: loadError } = await supabase
      .from("va_cancel_outreach")
      .select(CANCEL_OUTREACH_SELECT)
      .eq("id", params.id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "That person was not found." }, { status: 404 });
    }

    const row = mapCancelRow(existing as Record<string, unknown>);
    const next = applyCancelAction(row, action, note);
    if ("error" in next) {
      return NextResponse.json({ error: next.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("va_cancel_outreach")
      .update({
        attempts: next.attempts,
        status: next.status,
      })
      .eq("id", params.id)
      .select(CANCEL_OUTREACH_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ row: mapCancelRow(data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: "Failed to save that call." }, { status: 500 });
  }
}

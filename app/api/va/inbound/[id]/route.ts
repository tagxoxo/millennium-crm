import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  applyInboundAction,
  mapInboundRow,
  type InboundLogAction,
} from "@/lib/vaInboundOutreach";
import {
  INBOUND_LEAD_SELECT,
  getVaAuthUser,
  getVaRole,
} from "@/lib/va-server";

const ACTIONS = new Set<InboundLogAction>([
  "call",
  "double_dial",
  "vm",
  "call_vm",
  "spoke",
  "transferred",
  "callback",
  "closed",
  "reopen",
]);

function isAction(value: string): value is InboundLogAction {
  return ACTIONS.has(value as InboundLogAction);
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
    const callbackAt = String(body.callback_at ?? "").trim();

    if (!isAction(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: existing, error: loadError } = await supabase
      .from("va_inbound_leads")
      .select(INBOUND_LEAD_SELECT)
      .eq("id", params.id)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 400 });
    }
    if (!existing) {
      return NextResponse.json({ error: "That lead was not found." }, { status: 404 });
    }

    const row = mapInboundRow(existing as Record<string, unknown>);
    const next = applyInboundAction(row, action, {
      note,
      callbackAt: callbackAt || undefined,
    });
    if ("error" in next) {
      return NextResponse.json({ error: next.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("va_inbound_leads")
      .update({
        attempts: next.attempts,
        status: next.status,
        callback_at: next.callback_at,
      })
      .eq("id", params.id)
      .select(INBOUND_LEAD_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ row: mapInboundRow(data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: "Failed to save that call." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("va_inbound_leads")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete this lead." }, { status: 500 });
  }
}

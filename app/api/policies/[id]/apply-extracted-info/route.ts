import { NextRequest, NextResponse } from "next/server";
import { syncClientFromPolicyId } from "@/lib/clients";
import { getSupabaseServer } from "@/lib/supabase/server";

type ExtractedField =
  | "policy_number"
  | "client_address"
  | "client_email"
  | "client_phone";

const FIELD_MAP: Record<
  ExtractedField,
  "policy_number" | "client_address" | "email" | "phone"
> = {
  policy_number: "policy_number",
  client_address: "client_address",
  client_email: "email",
  client_phone: "phone",
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const fields = body.fields as Partial<
      Record<ExtractedField, string | null>
    >;
    const overwrites = new Set<string>(
      Array.isArray(body.overwrites) ? body.overwrites : []
    );

    const supabase = getSupabaseServer();
    const { data: policy, error: fetchError } = await supabase
      .from("policies")
      .select("policy_number, client_address, email, phone")
      .eq("id", params.id)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    }

    const updates: Record<string, string> = {};

    for (const [extractedKey, column] of Object.entries(FIELD_MAP) as [
      ExtractedField,
      keyof typeof policy,
    ][]) {
      const value = fields[extractedKey]?.trim();
      if (!value) continue;

      const current = policy[column];
      const hasExisting =
        current !== null && current !== undefined && String(current).trim() !== "";

      if (!hasExisting || overwrites.has(extractedKey)) {
        updates[column] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, updated: false });
    }

    const { error: updateError } = await supabase
      .from("policies")
      .update(updates)
      .eq("id", params.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await syncClientFromPolicyId(params.id);

    return NextResponse.json({ ok: true, updated: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to apply extracted info." },
      { status: 500 }
    );
  }
}

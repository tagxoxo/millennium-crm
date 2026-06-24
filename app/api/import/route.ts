import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { ParsedPolicyRow, RowError } from "@/lib/csv";

export const maxDuration = 60;

const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const policies = (body.policies ?? []) as ParsedPolicyRow[];

    if (policies.length === 0) {
      return NextResponse.json({ imported: 0, failed: [] });
    }

    const supabase = getSupabaseServer();
    const failed: RowError[] = [];
    let imported = 0;

    for (let i = 0; i < policies.length; i += BATCH_SIZE) {
      const batch = policies.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("policies").insert(batch);

      if (!error) {
        imported += batch.length;
        continue;
      }

      // If batch fails, insert one-by-one to capture per-row errors
      for (let j = 0; j < batch.length; j++) {
        const policy = batch[j];
        const rowNum = i + j + 2;
        const { error: rowError } = await supabase
          .from("policies")
          .insert(policy);

        if (rowError) {
          failed.push({
            row: rowNum,
            client: policy.client_name,
            reason: rowError.message,
          });
        } else {
          imported++;
        }
      }
    }

    return NextResponse.json({ imported, failed });
  } catch {
    return NextResponse.json(
      { error: "Import failed on the server." },
      { status: 500 }
    );
  }
}

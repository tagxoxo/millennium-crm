import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = body.id as string | undefined;

    if (!documentId) {
      return NextResponse.json({ error: "Document id is required." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: document, error: fetchError } = await supabase
      .from("policy_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const r2 = getR2Client();
    const bucket = getR2Bucket();

    await r2.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: document.r2_key })
    );

    const { error: deleteError } = await supabase
      .from("policy_documents")
      .delete()
      .eq("id", documentId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete document." },
      { status: 500 }
    );
  }
}

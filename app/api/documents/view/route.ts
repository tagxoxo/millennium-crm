import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SIGNED_URL_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const documentId = body.id as string | undefined;

    if (!documentId) {
      return NextResponse.json({ error: "Document id is required." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: document, error } = await supabase
      .from("policy_documents")
      .select("r2_key")
      .eq("id", documentId)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const r2 = getR2Client();
    const bucket = getR2Bucket();
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: bucket, Key: document.r2_key }),
      { expiresIn: SIGNED_URL_SECONDS }
    );

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate view link." },
      { status: 500 }
    );
  }
}

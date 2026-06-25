import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { assignDocumentToHistoricalPolicyIfNeeded } from "@/lib/policyHistory";
import {
  extractPolicyInfoFromText,
  hasAnyExtractedInfo,
} from "@/lib/extractPolicyInfo";
import { extractTextFromPdf } from "@/lib/pdfText";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sanitizeClientFolder, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const EXTRACT_WARNING =
  "Could not extract policy info automatically. Please fill in the fields manually.";

function isPdfFile(file: File, safeName: string): boolean {
  return (
    file.type === "application/pdf" ||
    safeName.toLowerCase().endsWith(".pdf")
  );
}

const EMPTY_EXTRACTED = {
  client_name: null,
  policy_number: null,
  client_address: null,
  client_email: null,
  client_phone: null,
  renewal_date: null,
  effective_date: null,
  premium: null,
  term_months: null,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const policyId = formData.get("policy_id");
    const notesRaw = formData.get("notes");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!policyId || typeof policyId !== "string") {
      return NextResponse.json({ error: "policy_id is required." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be under 20MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, JPG, and PNG files are allowed." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .select("id, client_name")
      .eq("id", policyId)
      .single();

    if (policyError || !policy) {
      return NextResponse.json({ error: "Policy not found." }, { status: 404 });
    }

    const safeName = sanitizeFileName(file.name || "document");
    const clientFolder = sanitizeClientFolder(policy.client_name);
    const r2Key = `${clientFolder}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const r2 = getR2Client();
    const bucket = getR2Bucket();

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const notes =
      typeof notesRaw === "string" && notesRaw.trim()
        ? notesRaw.trim()
        : null;

    const { data: document, error: insertError } = await supabase
      .from("policy_documents")
      .insert({
        policy_id: policyId,
        file_name: file.name || safeName,
        r2_key: r2Key,
        file_size: file.size,
        notes,
      })
      .select("*")
      .single();

    if (insertError) {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }));
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    let extracted = null;
    let warning: string | null = null;

    if (isPdfFile(file, safeName)) {
      try {
        const text = await extractTextFromPdf(buffer);
        extracted = extractPolicyInfoFromText(text);
        if (!hasAnyExtractedInfo(extracted)) {
          warning = EXTRACT_WARNING;
        }
      } catch {
        extracted = { ...EMPTY_EXTRACTED };
        warning = EXTRACT_WARNING;
      }
    }

    const targetPolicyId = await assignDocumentToHistoricalPolicyIfNeeded({
      documentId: document.id,
      policyId,
      fileName: file.name || safeName,
      extracted,
    });

    return NextResponse.json({
      document,
      extracted,
      warning,
      uploaded: true,
      target_policy_id: targetPolicyId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

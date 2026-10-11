import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { assignDocumentToHistoricalPolicyIfNeeded } from "@/lib/policyHistory";
import { hasAnyExtractedInfo } from "@/lib/extractPolicyInfo";
import {
  emptyExtractedPolicyInfo,
  extractPolicyFromFile,
  lowConfidenceReviewWarning,
  normalizePolicyMime,
  policyExtractionPayload,
  type PolicyFileExtraction,
} from "@/lib/extractPolicyInfoAI";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sanitizeClientFolder, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const EXTRACT_WARNING =
  "Could not extract policy info automatically. Please fill in the fields manually.";

function withoutLowConfidencePolicyNumber(
  result: PolicyFileExtraction
): PolicyFileExtraction["extracted"] {
  if (!result.low_confidence_fields.includes("policy_number")) return result.extracted;
  return { ...result.extracted, policy_number: null };
}

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
    let extractedForHistory = null;
    let warning: string | null = null;
    let extractionPayload: ReturnType<typeof policyExtractionPayload> | null = null;

    const mimeType = normalizePolicyMime(file.type, safeName);
    if (mimeType) {
      try {
        const result = await extractPolicyFromFile({
          buffer,
          mimeType,
          fileName: file.name || safeName,
        });
        extracted = result.extracted;
        extractedForHistory = withoutLowConfidencePolicyNumber(result);
        extractionPayload = policyExtractionPayload(result);
        warning = hasAnyExtractedInfo(result.extracted)
          ? lowConfidenceReviewWarning(result.low_confidence_fields)
          : EXTRACT_WARNING;
      } catch {
        extracted = emptyExtractedPolicyInfo();
        extractedForHistory = extracted;
        warning = EXTRACT_WARNING;
      }
    }

    const targetPolicyId = await assignDocumentToHistoricalPolicyIfNeeded({
      documentId: document.id,
      policyId,
      fileName: file.name || safeName,
      extracted: extractedForHistory,
    });

    return NextResponse.json({
      document,
      extracted,
      warning,
      uploaded: true,
      target_policy_id: targetPolicyId,
      ...(extractionPayload
        ? {
            carrier: extractionPayload.carrier,
            policy_type: extractionPayload.policy_type,
            confidence: extractionPayload.confidence,
            low_confidence_fields: extractionPayload.low_confidence_fields,
            vehicles: extractionPayload.vehicles,
            drivers: extractionPayload.drivers,
            lienholder: extractionPayload.lienholder,
            sr22: extractionPayload.sr22,
            source: extractionPayload.source,
          }
        : {}),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to upload document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

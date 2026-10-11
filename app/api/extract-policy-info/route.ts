import { NextRequest, NextResponse } from "next/server";
import { clientNameFromFileName, hasAnyExtractedInfo } from "@/lib/extractPolicyInfo";
import {
  extractPolicyFromFile,
  lowConfidenceReviewWarning,
  normalizePolicyMime,
  policyExtractionPayload,
} from "@/lib/extractPolicyInfoAI";
import { inferCarrierFromFileName } from "@/lib/policyHistory";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACT_WARNING = "Could not process document. Please try again.";
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be under 20MB." },
        { status: 400 }
      );
    }

    const mimeType = normalizePolicyMime(file.type, file.name);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Only PDF, JPG, and PNG files can be parsed for policy info." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractPolicyFromFile({
      buffer,
      mimeType,
      fileName: file.name,
    });

    if (!result.carrier) {
      result.carrier = inferCarrierFromFileName(file.name);
    }
    if (!result.extracted.client_name) {
      result.extracted.client_name = clientNameFromFileName(
        file.name,
        (value) => Boolean(inferCarrierFromFileName(value))
      );
    }

    const payload = policyExtractionPayload(result);
    if (!hasAnyExtractedInfo(result.extracted)) {
      return NextResponse.json({
        ...payload,
        warning: EXTRACT_WARNING,
      });
    }

    return NextResponse.json({
      ...payload,
      warning: lowConfidenceReviewWarning(result.low_confidence_fields),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to extract policy info." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  clientNameFromFileName,
  extractPolicyInfoFromText,
  hasAnyExtractedInfo,
} from "@/lib/extractPolicyInfo";
import { inferCarrierFromFileName } from "@/lib/policyHistory";
import { extractTextFromPdf } from "@/lib/pdfText";

export const runtime = "nodejs";

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

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files can be parsed for policy info." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    try {
      text = await extractTextFromPdf(buffer);
    } catch {
      return NextResponse.json({
        extracted: {
          client_name: null,
          policy_number: null,
          client_address: null,
          client_email: null,
          client_phone: null,
          renewal_date: null,
          effective_date: null,
          premium: null,
          term_months: null,
        },
        warning: EXTRACT_WARNING,
      });
    }

    const extracted = extractPolicyInfoFromText(text);
    const carrier = inferCarrierFromFileName(file.name);
    if (!extracted.client_name) {
      extracted.client_name = clientNameFromFileName(
        file.name,
        (value) => Boolean(inferCarrierFromFileName(value))
      );
    }

    if (!hasAnyExtractedInfo(extracted)) {
      return NextResponse.json({
        extracted,
        carrier,
        warning: EXTRACT_WARNING,
      });
    }

    return NextResponse.json({ extracted, carrier });
  } catch {
    return NextResponse.json(
      { error: "Failed to extract policy info." },
      { status: 500 }
    );
  }
}

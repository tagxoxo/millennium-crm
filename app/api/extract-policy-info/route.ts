import { NextRequest, NextResponse } from "next/server";
import {
  extractPolicyInfoFromText,
  hasAnyExtractedInfo,
} from "@/lib/extractPolicyInfo";
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
          policy_number: null,
          client_address: null,
          client_email: null,
          client_phone: null,
        },
        warning: EXTRACT_WARNING,
      });
    }

    const extracted = extractPolicyInfoFromText(text);

    if (!hasAnyExtractedInfo(extracted)) {
      return NextResponse.json({
        extracted,
        warning: EXTRACT_WARNING,
      });
    }

    return NextResponse.json({ extracted });
  } catch {
    return NextResponse.json(
      { error: "Failed to extract policy info." },
      { status: 500 }
    );
  }
}

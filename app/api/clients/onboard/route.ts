import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { fetchClientById, findDuplicateClients } from "@/lib/clients";
import {
  clientNameFromFileName,
  extractPolicyInfoFromText,
} from "@/lib/extractPolicyInfo";
import { inferCarrierFromFileName } from "@/lib/policyHistory";
import { extractTextFromPdf } from "@/lib/pdfText";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { resolveInitialPipelineStage } from "@/lib/retentionPipeline";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier } from "@/lib/types";
import { CARRIERS, normalizeClientState } from "@/lib/types";
import { sanitizeClientFolder, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPdf(fileName: string, mimeType: string): boolean {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const forceCreate = formData.get("force_create") === "true";
    const linkClientId = readString(formData.get("client_id")) || null;

    let extracted = null;
    let fileBuffer: Buffer | null = null;
    let fileMeta: {
      originalName: string;
      safeName: string;
      mimeType: string;
      size: number;
    } | null = null;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File must be under 20MB." }, { status: 400 });
      }

      const safeName = sanitizeFileName(file.name || "document");
      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileMeta = {
        originalName: file.name || safeName,
        safeName,
        mimeType: file.type,
        size: file.size,
      };

      if (isPdf(safeName, file.type)) {
        try {
          const text = await extractTextFromPdf(fileBuffer);
          extracted = extractPolicyInfoFromText(text);
          if (!extracted.client_name) {
            extracted.client_name = clientNameFromFileName(
              fileMeta.originalName,
              (value) => Boolean(inferCarrierFromFileName(value))
            );
          }
        } catch {
          extracted = null;
        }
      }
    }

    const fullName =
      readString(formData.get("full_name")) || extracted?.client_name?.trim() || "";
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const email = readString(formData.get("email")) || extracted?.client_email || null;
    const phone = readString(formData.get("phone")) || extracted?.client_phone || null;
    const address =
      readString(formData.get("address")) || extracted?.client_address || null;
    const policyNumber =
      readString(formData.get("policy_number")) || extracted?.policy_number || null;
    const isSpanishSpeaker = formData.get("is_spanish_speaker") === "true";
    const clientState = normalizeClientState(readString(formData.get("client_state")));
    const notes = readString(formData.get("notes")) || null;
    const premium =
      parseFloat(readString(formData.get("premium")) || "0") ||
      parseFloat(extracted?.premium || "0") ||
      0;
    const termMonths =
      Number(formData.get("term_months")) === 6 || extracted?.term_months === 6 ? 6 : 12;

    let carrier = readString(formData.get("carrier"));
    if ((!carrier || !CARRIERS.includes(carrier as Carrier)) && fileMeta) {
      carrier = inferCarrierFromFileName(fileMeta.originalName) || "";
    }

    const renewalDate =
      readString(formData.get("renewal_date")) || extracted?.renewal_date || null;
    const effectiveDate =
      readString(formData.get("effective_date")) || extracted?.effective_date || null;

    if (fileBuffer) {
      if (!carrier || !CARRIERS.includes(carrier as Carrier)) {
        return NextResponse.json(
          { error: "Select a carrier when uploading a policy document." },
          { status: 400 }
        );
      }
      if (!renewalDate) {
        return NextResponse.json(
          { error: "Expiration date is required when uploading a policy document." },
          { status: 400 }
        );
      }
    }

    if (!linkClientId && !forceCreate) {
      const duplicates = await findDuplicateClients(email, phone);
      if (duplicates.length > 0) {
        return NextResponse.json({ duplicate: true, matches: duplicates });
      }
    }

    const supabase = getSupabaseServer();
    let clientId = linkClientId;

    if (clientId) {
      const existing = await fetchClientById(clientId);
      if (!existing) {
        return NextResponse.json({ error: "Client not found." }, { status: 404 });
      }
    } else {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          full_name: fullName,
          email,
          phone,
          address,
          is_spanish_speaker: isSpanishSpeaker,
          client_state: clientState,
          notes,
        })
        .select("id")
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { error: clientError?.message ?? "Failed to create client." },
          { status: 400 }
        );
      }

      clientId = client.id;
    }

    let policyId: string | null = null;

    if (fileBuffer && fileMeta && carrier && renewalDate) {
      const { data: policy, error: policyError } = await supabase
        .from("policies")
        .insert({
          client_id: clientId,
          client_name: fullName,
          carrier,
          premium,
          renewal_date: renewalDate,
          effective_date: effectiveDate,
          stage: resolveInitialPipelineStage(renewalDate, undefined, false),
          spanish_speaker: isSpanishSpeaker,
          client_state: clientState,
          commercial: false,
          term_months: termMonths,
          policy_type: "personal_auto",
          phone,
          email,
          client_address: address,
          policy_number: policyNumber,
          notes,
        })
        .select("id")
        .single();

      if (policyError || !policy) {
        return NextResponse.json(
          { error: policyError?.message ?? "Failed to create policy." },
          { status: 400 }
        );
      }

      policyId = policy.id;

      const clientFolder = sanitizeClientFolder(fullName);
      const r2Key = `${clientFolder}/${Date.now()}-${fileMeta.safeName}`;
      const r2 = getR2Client();
      const bucket = getR2Bucket();

      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: fileBuffer,
          ContentType: fileMeta.mimeType || "application/pdf",
        })
      );

      const { error: documentError } = await supabase.from("policy_documents").insert({
        policy_id: policyId,
        file_name: fileMeta.originalName,
        r2_key: r2Key,
        file_size: fileMeta.size,
      });

      if (documentError) {
        return NextResponse.json({ error: documentError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ id: clientId, policy_id: policyId });
  } catch {
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}

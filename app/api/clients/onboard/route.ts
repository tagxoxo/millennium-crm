import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { fetchClientById, findDuplicateClients } from "@/lib/clients";
import { clientNameFromFileName } from "@/lib/extractPolicyInfo";
import {
  extractPolicyFromFile,
  normalizePolicyMime,
  pickReviewedValue,
  type PolicyFileExtraction,
} from "@/lib/extractPolicyInfoAI";
import { inferCarrierFromFileName } from "@/lib/policyHistory";
import { getR2Bucket, getR2Client } from "@/lib/r2";
import { resolveInitialPipelineStage } from "@/lib/retentionPipeline";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier } from "@/lib/types";
import { CARRIERS, normalizeClientState, normalizeLeadSource } from "@/lib/types";
import { sanitizeClientFolder, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function reviewedTermMonths(
  formValue: FormDataEntryValue | null,
  extraction: PolicyFileExtraction | null
): 6 | 12 {
  if (formValue === "6") return 6;
  if (formValue === "12") return 12;
  if (extraction?.low_confidence_fields.includes("term_months")) return 12;
  return extraction?.extracted.term_months === 6 ? 6 : 12;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const forceCreate = formData.get("force_create") === "true";
    const linkClientId = readString(formData.get("client_id")) || null;

    let extraction: PolicyFileExtraction | null = null;
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

      const mimeType = normalizePolicyMime(file.type, safeName);
      if (mimeType) {
        try {
          extraction = await extractPolicyFromFile({
            buffer: fileBuffer,
            mimeType,
            fileName: fileMeta.originalName,
          });
          if (!extraction.carrier) {
            extraction.carrier = inferCarrierFromFileName(fileMeta.originalName);
          }
          if (!extraction.extracted.client_name) {
            extraction.extracted.client_name = clientNameFromFileName(
              fileMeta.originalName,
              (value) => Boolean(inferCarrierFromFileName(value))
            );
          }
        } catch {
          extraction = null;
        }
      }
    }

    const extracted = extraction?.extracted ?? null;
    const lowConfidence = extraction?.low_confidence_fields ?? [];
    const fullName =
      pickReviewedValue(
        readString(formData.get("full_name")),
        extracted?.client_name,
        "client_name",
        lowConfidence
      ) || "";
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const email = pickReviewedValue(
      readString(formData.get("email")),
      extracted?.client_email,
      "client_email",
      lowConfidence
    );
    const phone = pickReviewedValue(
      readString(formData.get("phone")),
      extracted?.client_phone,
      "client_phone",
      lowConfidence
    );
    const address = pickReviewedValue(
      readString(formData.get("address")),
      extracted?.client_address,
      "client_address",
      lowConfidence
    );
    const policyNumber = pickReviewedValue(
      readString(formData.get("policy_number")),
      extracted?.policy_number,
      "policy_number",
      lowConfidence
    );
    const isSpanishSpeaker = formData.get("is_spanish_speaker") === "true";
    const clientState = normalizeClientState(readString(formData.get("client_state")));
    const leadSourceRaw = readString(formData.get("lead_source"));
    const leadSource = leadSourceRaw ? normalizeLeadSource(leadSourceRaw) : null;
    if (leadSourceRaw && !leadSource) {
      return NextResponse.json({ error: "Invalid lead source." }, { status: 400 });
    }
    const notes = readString(formData.get("notes")) || null;
    const premiumFromForm = parseFloat(readString(formData.get("premium")) || "");
    const premiumFromScan = lowConfidence.includes("premium")
      ? NaN
      : parseFloat(extracted?.premium || "");
    const premium =
      (Number.isFinite(premiumFromForm) ? premiumFromForm : 0) ||
      (Number.isFinite(premiumFromScan) ? premiumFromScan : 0) ||
      0;
    const termMonths = reviewedTermMonths(formData.get("term_months"), extraction);

    let carrier = readString(formData.get("carrier"));
    if (!carrier || !CARRIERS.includes(carrier as Carrier)) {
      const scannedCarrier = lowConfidence.includes("carrier") ? null : extraction?.carrier;
      carrier =
        scannedCarrier ||
        (fileMeta ? inferCarrierFromFileName(fileMeta.originalName) || "" : "");
    }

    const renewalDate = pickReviewedValue(
      readString(formData.get("renewal_date")),
      extracted?.renewal_date,
      "renewal_date",
      lowConfidence
    );
    const effectiveDate = pickReviewedValue(
      readString(formData.get("effective_date")),
      extracted?.effective_date,
      "effective_date",
      lowConfidence
    );

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
          lead_source: leadSource,
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

import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "./env";
import {
  extractPolicyInfoFromText,
  isAgentEmail,
  type ExtractedPolicyInfo,
} from "./extractPolicyInfo";
import { extractTextFromPdf } from "./pdfText";
import {
  CARRIER_LABELS,
  CARRIERS,
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  type Carrier,
  type PolicyType,
} from "./types";

const MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 30_000;

export type ExtractionConfidence = "high" | "medium" | "low";

export type ExtractionConfidenceField =
  | keyof ExtractedPolicyInfo
  | "carrier"
  | "policy_type";

export interface ExtractedVehicle {
  year: string | null;
  make: string | null;
  model: string | null;
  vin: string | null;
}

export interface ExtractedDriver {
  name: string | null;
  dob: string | null;
}

export interface PolicyFileExtraction {
  extracted: ExtractedPolicyInfo;
  carrier: Carrier | null;
  policy_type: PolicyType | null;
  confidence: Partial<Record<ExtractionConfidenceField, ExtractionConfidence>>;
  low_confidence_fields: ExtractionConfidenceField[];
  vehicles: ExtractedVehicle[];
  drivers: ExtractedDriver[];
  lienholder: string | null;
  sr22: boolean | null;
  source: "ai" | "regex";
}

export type PolicyMimeType = "application/pdf" | "image/jpeg" | "image/png";

const REVIEW_LABELS: Record<ExtractionConfidenceField, string> = {
  client_name: "name",
  client_address: "address",
  client_email: "email",
  client_phone: "phone",
  policy_number: "policy number",
  renewal_date: "expiration date",
  effective_date: "effective date",
  premium: "premium",
  term_months: "policy term",
  carrier: "carrier",
  policy_type: "policy type",
};

const SYSTEM_PROMPT = `You extract fields from insurance policy documents for an agency CRM.

Extract the INSURED / named insured only. Never use the agent, agency, producer, broker, or writing company for the insured name, address, phone, or email.

Return null for anything that is not on the document. Never guess.

Rules:
- Dates must be YYYY-MM-DD.
- premium is the total policy premium as a number, with no currency symbol. Use null if that total is not shown.
- term_months is 6 or 12 only. Use null unless the term is clearly six or twelve months.
- carrier and policy_type must be one of the allowed values, or null. Do not invent a match.
- confidence is "high" only when the value is explicitly labeled, "medium" when it is present but the label could be confused, and "low" when you are unsure.
- If a name, address, phone, or email might belong to the agent, agency, or producer, return null.
- vehicles, drivers, and lienholder are extra details. Use an empty list when no vehicles or drivers are shown. Use an empty string for any vehicle field, driver field, or lienholder that is not shown.
- sr22 is "yes" only when the document explicitly says an SR-22 is required or filed, "no" only when it explicitly says SR-22 is not required, otherwise "unknown".`;

const CONFIDENCE_SCHEMA = {
  type: "string",
  enum: ["high", "medium", "low"],
};

function textField(description: string) {
  return {
    type: "object",
    additionalProperties: false,
    description,
    properties: {
      value: { anyOf: [{ type: "string" }, { type: "null" }] },
      confidence: CONFIDENCE_SCHEMA,
    },
    required: ["value", "confidence"],
  };
}

function enumOrNullField(values: readonly string[], description: string) {
  return {
    type: "object",
    additionalProperties: false,
    description,
    properties: {
      value: {
        anyOf: [{ type: "string", enum: [...values] }, { type: "null" }],
      },
      confidence: CONFIDENCE_SCHEMA,
    },
    required: ["value", "confidence"],
  };
}

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    insured_name: textField("Named insured or policyholder. Not the agent or agency."),
    insured_address: textField("Named insured mailing address. Not the agency address."),
    insured_phone: textField("Named insured phone. Not the agency or producer phone."),
    insured_email: textField("Named insured email. Not the agency or producer email."),
    policy_number: textField("Policy number exactly as printed."),
    carrier: enumOrNullField(
      CARRIERS,
      `Insurance company. Allowed values: ${CARRIERS.map((carrier) => `${carrier} (${CARRIER_LABELS[carrier]})`).join(", ")}.`
    ),
    effective_date: textField("Policy effective date as YYYY-MM-DD."),
    expiration_date: textField("Policy expiration or renewal date as YYYY-MM-DD."),
    premium: {
      type: "object",
      additionalProperties: false,
      description: "Total policy premium as a number, or null.",
      properties: {
        value: { anyOf: [{ type: "number" }, { type: "null" }] },
        confidence: CONFIDENCE_SCHEMA,
      },
      required: ["value", "confidence"],
    },
    term_months: {
      type: "object",
      additionalProperties: false,
      description: "Policy term length. 6, 12, or null.",
      properties: {
        value: {
          anyOf: [{ type: "integer", enum: [6, 12] }, { type: "null" }],
        },
        confidence: CONFIDENCE_SCHEMA,
      },
      required: ["value", "confidence"],
    },
    policy_type: enumOrNullField(
      POLICY_TYPES,
      `Policy type. Allowed values: ${POLICY_TYPES.map((type) => `${type} (${POLICY_TYPE_LABELS[type]})`).join(", ")}.`
    ),
    vehicles: {
      type: "array",
      description: "Listed vehicles. Empty array if none are shown. Use an empty string for a missing field.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "string" },
          make: { type: "string" },
          model: { type: "string" },
          vin: { type: "string" },
        },
        required: ["year", "make", "model", "vin"],
      },
    },
    drivers: {
      type: "array",
      description: "Listed drivers. Empty array if none are shown. dob is YYYY-MM-DD or an empty string.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          dob: { type: "string" },
        },
        required: ["name", "dob"],
      },
    },
    lienholder: {
      type: "string",
      description: "Lienholder or loss payee name, or an empty string if none is shown.",
    },
    sr22: {
      type: "string",
      enum: ["yes", "no", "unknown"],
      description: "yes only when an SR-22 is explicitly required or filed.",
    },
  },
  required: [
    "insured_name",
    "insured_address",
    "insured_phone",
    "insured_email",
    "policy_number",
    "carrier",
    "effective_date",
    "expiration_date",
    "premium",
    "term_months",
    "policy_type",
    "vehicles",
    "drivers",
    "lienholder",
    "sr22",
  ],
};

export function normalizePolicyMime(
  mimeType: string,
  fileName = ""
): PolicyMimeType | null {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  if (mime === "application/pdf") return "application/pdf";
  if (mime === "image/png") return "image/png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  return null;
}

export function emptyExtractedPolicyInfo(): ExtractedPolicyInfo {
  return {
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
}

export function lowConfidenceReviewWarning(
  fields: readonly ExtractionConfidenceField[]
): string | null {
  if (fields.length === 0) return null;
  const labels = fields.map((field) => REVIEW_LABELS[field] ?? field);
  return `Please review before saving. The scan was not fully sure about: ${labels.join(", ")}.`;
}

/** Form text wins. Low-confidence scan values are not filled in when the form left the field blank. */
export function pickReviewedValue(
  formValue: string,
  extractedValue: string | null | undefined,
  field: ExtractionConfidenceField,
  lowConfidenceFields: readonly string[]
): string | null {
  const typed = formValue.trim();
  if (typed) return typed;
  if (lowConfidenceFields.includes(field)) return null;
  const extracted = extractedValue?.trim();
  return extracted || null;
}

export function policyExtractionPayload(result: PolicyFileExtraction) {
  return {
    extracted: result.extracted,
    carrier: result.carrier,
    policy_type: result.policy_type,
    confidence: result.confidence,
    low_confidence_fields: result.low_confidence_fields,
    vehicles: result.vehicles,
    drivers: result.drivers,
    lienholder: result.lienholder,
    sr22: result.sr22,
    source: result.source,
  };
}

function emptyResult(source: "ai" | "regex"): PolicyFileExtraction {
  return {
    extracted: emptyExtractedPolicyInfo(),
    carrier: null,
    policy_type: null,
    confidence: {},
    low_confidence_fields: [],
    vehicles: [],
    drivers: [],
    lienholder: null,
    sr22: null,
    source,
  };
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.replace(/\s+/g, " ").slice(0, 300);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function readConfidence(value: unknown): ExtractionConfidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function readValued(raw: unknown): { value: unknown; confidence: ExtractionConfidence } | null {
  const record = asRecord(raw);
  if (!record || !("value" in record)) return null;
  return { value: record.value, confidence: readConfidence(record.confidence) };
}

function readDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function readEmail(value: unknown): string | null {
  const email = cleanString(value);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (isAgentEmail(email)) return null;
  return email;
}

function readCarrier(value: unknown): Carrier | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((CARRIERS as readonly string[]).includes(slug)) return slug as Carrier;
  const label = value.trim().toLowerCase();
  for (const carrier of CARRIERS) {
    if (CARRIER_LABELS[carrier].toLowerCase() === label) return carrier;
  }
  return null;
}

function readPolicyType(value: unknown): PolicyType | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((POLICY_TYPES as readonly string[]).includes(slug)) return slug as PolicyType;
  const label = value.trim().toLowerCase();
  for (const policyType of POLICY_TYPES) {
    if (POLICY_TYPE_LABELS[policyType].toLowerCase() === label) return policyType;
  }
  return null;
}

function readPremium(value: unknown): string | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[$,\s]/g, ""))
        : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return (Math.round(numeric * 100) / 100).toFixed(2);
}

function readTerm(value: unknown): 6 | 12 | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (numeric === 6 || numeric === 12) return numeric;
  return null;
}

function readVehicle(raw: unknown): ExtractedVehicle | null {
  const record = asRecord(raw);
  if (!record) return null;
  const vehicle = {
    year: cleanString(record.year),
    make: cleanString(record.make),
    model: cleanString(record.model),
    vin: cleanString(record.vin),
  };
  if (!vehicle.year && !vehicle.make && !vehicle.model && !vehicle.vin) return null;
  return vehicle;
}

function readDriver(raw: unknown): ExtractedDriver | null {
  const record = asRecord(raw);
  if (!record) return null;
  const driver = {
    name: cleanString(record.name),
    dob: readDate(record.dob),
  };
  if (!driver.name && !driver.dob) return null;
  return driver;
}

/** Maps a Claude tool call into the CRM extraction shape. Invalid input throws. */
export function mapClaudePolicyToolInput(input: unknown): Omit<PolicyFileExtraction, "source"> {
  const record = asRecord(input);
  if (!record) throw new Error("Claude tool input was not an object.");

  const extracted = emptyExtractedPolicyInfo();
  const confidence: PolicyFileExtraction["confidence"] = {};
  const lowConfidenceFields: ExtractionConfidenceField[] = [];

  function take<T>(
    field: ExtractionConfidenceField,
    parsed: { value: T | null; confidence: ExtractionConfidence } | null,
    assign: (value: T) => void
  ) {
    if (!parsed || parsed.value === null) return;
    assign(parsed.value);
    confidence[field] = parsed.confidence;
    if (parsed.confidence === "low") lowConfidenceFields.push(field);
  }

  const name = readValued(record.insured_name);
  take("client_name", name && { ...name, value: cleanString(name.value) }, (value) => {
    extracted.client_name = value;
  });

  const address = readValued(record.insured_address);
  take("client_address", address && { ...address, value: cleanString(address.value) }, (value) => {
    extracted.client_address = value;
  });

  const phone = readValued(record.insured_phone);
  take("client_phone", phone && { ...phone, value: cleanString(phone.value) }, (value) => {
    extracted.client_phone = value;
  });

  const email = readValued(record.insured_email);
  take("client_email", email && { ...email, value: readEmail(email.value) }, (value) => {
    extracted.client_email = value;
  });

  const policyNumber = readValued(record.policy_number);
  take(
    "policy_number",
    policyNumber && { ...policyNumber, value: cleanString(policyNumber.value) },
    (value) => {
      extracted.policy_number = value;
    }
  );

  const effective = readValued(record.effective_date);
  take("effective_date", effective && { ...effective, value: readDate(effective.value) }, (value) => {
    extracted.effective_date = value;
  });

  const expiration = readValued(record.expiration_date);
  take(
    "renewal_date",
    expiration && { ...expiration, value: readDate(expiration.value) },
    (value) => {
      extracted.renewal_date = value;
    }
  );

  const premium = readValued(record.premium);
  take("premium", premium && { ...premium, value: readPremium(premium.value) }, (value) => {
    extracted.premium = value;
  });

  const term = readValued(record.term_months);
  take("term_months", term && { ...term, value: readTerm(term.value) }, (value) => {
    extracted.term_months = value;
  });

  let carrier: Carrier | null = null;
  const carrierField = readValued(record.carrier);
  take("carrier", carrierField && { ...carrierField, value: readCarrier(carrierField.value) }, (value) => {
    carrier = value;
  });

  let policyType: PolicyType | null = null;
  const policyTypeField = readValued(record.policy_type);
  take(
    "policy_type",
    policyTypeField && { ...policyTypeField, value: readPolicyType(policyTypeField.value) },
    (value) => {
      policyType = value;
    }
  );

  const vehicles = Array.isArray(record.vehicles)
    ? record.vehicles.map(readVehicle).filter((vehicle): vehicle is ExtractedVehicle => Boolean(vehicle))
    : [];
  const drivers = Array.isArray(record.drivers)
    ? record.drivers.map(readDriver).filter((driver): driver is ExtractedDriver => Boolean(driver))
    : [];

  return {
    extracted,
    carrier,
    policy_type: policyType,
    confidence,
    low_confidence_fields: lowConfidenceFields,
    vehicles,
    drivers,
    lienholder: cleanString(record.lienholder),
    sr22: readSr22(record.sr22),
  };
}

function readSr22(value: unknown): boolean | null {
  if (value === true || value === "yes") return true;
  if (value === false || value === "no") return false;
  return null;
}

async function regexFallback(buffer: Buffer, mime: PolicyMimeType): Promise<PolicyFileExtraction> {
  if (mime !== "application/pdf") return emptyResult("regex");
  try {
    const text = await extractTextFromPdf(buffer);
    return { ...emptyResult("regex"), extracted: extractPolicyInfoFromText(text) };
  } catch (error) {
    console.warn(
      `[policy-extract] Regex fallback could not read the PDF (${errorMessage(error)}).`
    );
    return emptyResult("regex");
  }
}

function fileBlock(
  buffer: Buffer,
  mime: PolicyMimeType
): Anthropic.DocumentBlockParam | Anthropic.ImageBlockParam {
  const data = buffer.toString("base64");
  if (mime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    };
  }
  return {
    type: "image",
    source: { type: "base64", media_type: mime, data },
  };
}

async function extractWithClaude(
  buffer: Buffer,
  mime: PolicyMimeType,
  apiKey: string
): Promise<PolicyFileExtraction> {
  const client = new Anthropic({
    apiKey,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  });

  // claude-sonnet-5-5 rejects forced tool_choice. output_config.json_schema is the
  // API-enforced structured output for this model: the response must match the schema.
  const message = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: INPUT_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            fileBlock(buffer, mime),
            {
              type: "text",
              text: "Extract the policy fields from this document and return only the schema object.",
            },
          ],
        },
      ],
    },
    { timeout: TIMEOUT_MS }
  );

  if (message.stop_reason === "max_tokens") {
    throw new Error("Claude response was cut off.");
  }

  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text" || !text.text.trim()) {
    throw new Error("Claude did not return policy fields.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.text);
  } catch {
    throw new Error("Claude did not return schema JSON.");
  }

  return { ...mapClaudePolicyToolInput(parsed), source: "ai" };
}

export async function extractPolicyFromFile(input: {
  buffer: Buffer;
  mimeType: string;
  fileName?: string;
}): Promise<PolicyFileExtraction> {
  const mime = normalizePolicyMime(input.mimeType, input.fileName ?? "");
  if (!mime) throw new Error("Unsupported file type.");

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    console.warn("[policy-extract] ANTHROPIC_API_KEY is missing. Using regex fallback.");
    return regexFallback(input.buffer, mime);
  }

  try {
    const extracted = await extractWithClaude(input.buffer, mime, apiKey);
    console.info("[policy-extract] Used Claude.");
    return extracted;
  } catch (error) {
    console.warn(
      `[policy-extract] Claude failed (${errorMessage(error)}). Using regex fallback.`
    );
    return regexFallback(input.buffer, mime);
  }
}

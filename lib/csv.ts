export type PolicyField =
  | "client_name"
  | "carrier"
  | "premium"
  | "renewal_date"
  | "stage"
  | "spanish_speaker"
  | "phone"
  | "email"
  | "policy_number"
  | "notes"
  | "skip";

export const POLICY_FIELDS: { value: PolicyField; label: string }[] = [
  { value: "skip", label: "— Skip this column —" },
  { value: "client_name", label: "Client Name" },
  { value: "carrier", label: "Carrier" },
  { value: "premium", label: "Premium" },
  { value: "renewal_date", label: "Renewal Date" },
  { value: "stage", label: "Stage" },
  { value: "spanish_speaker", label: "Spanish Speaker" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "policy_number", label: "Policy Number" },
  { value: "notes", label: "Notes" },
];

/** Parse CSV text into headers and rows, handling quoted fields */
export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      current.push(field.trim());
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      current.push(field.trim());
      if (current.some((c) => c.length > 0)) rows.push(current);
      current = [];
      field = "";
      if (char === "\r") i++;
    } else {
      field += char;
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field.trim());
    if (current.some((c) => c.length > 0)) rows.push(current);
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows };
}

const HEADER_ALIASES: Record<string, PolicyField> = {
  client_name: "client_name",
  clientname: "client_name",
  name: "client_name",
  "client name": "client_name",
  insured: "client_name",
  "insured name": "client_name",
  carrier: "carrier",
  company: "carrier",
  insurance: "carrier",
  premium: "premium",
  "annual premium": "premium",
  "policy premium": "premium",
  renewal_date: "renewal_date",
  renewaldate: "renewal_date",
  "renewal date": "renewal_date",
  expiration: "renewal_date",
  "expiration date": "renewal_date",
  exp_date: "renewal_date",
  stage: "stage",
  status: "stage",
  pipeline: "stage",
  spanish_speaker: "spanish_speaker",
  spanish: "spanish_speaker",
  "spanish speaker": "spanish_speaker",
  language: "spanish_speaker",
  phone: "phone",
  "phone number": "phone",
  mobile: "phone",
  cell: "phone",
  email: "email",
  "email address": "email",
  policy_number: "policy_number",
  policynumber: "policy_number",
  "policy number": "policy_number",
  policy: "policy_number",
  "policy #": "policy_number",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

/** Guess column mappings from CSV header names */
export function guessColumnMapping(headers: string[]): Record<number, PolicyField> {
  const mapping: Record<number, PolicyField> = {};
  const used = new Set<PolicyField>();

  headers.forEach((header, index) => {
    const key = header.toLowerCase().trim();
    const field = HEADER_ALIASES[key];
    if (field && field !== "skip" && !used.has(field)) {
      mapping[index] = field;
      used.add(field);
    } else {
      mapping[index] = "skip";
    }
  });

  return mapping;
}

export interface ParsedPolicyRow {
  client_name: string;
  carrier: string;
  premium: number;
  renewal_date: string;
  stage: string;
  spanish_speaker: boolean;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
  notes: string | null;
}

export interface RowError {
  row: number;
  client: string;
  reason: string;
}

function normalizeCarrier(value: string): string | null {
  const v = value.toLowerCase().trim();
  if (v.includes("trexis")) return "trexis";
  if (v.includes("progressive")) return "progressive";
  if (v.includes("gainsco") || v.includes("gains")) return "gainsco";
  if (v === "trexis" || v === "progressive" || v === "gainsco") return v;
  return null;
}

function normalizeStage(value: string): string {
  const v = value.toLowerCase().trim();
  const stages = ["upcoming", "contacted", "quoted", "retained", "lapsed"];
  if (stages.includes(v)) return v;
  if (v.includes("retain")) return "retained";
  if (v.includes("contact")) return "contacted";
  if (v.includes("quote")) return "quoted";
  if (v.includes("lapse")) return "lapsed";
  return "upcoming";
}

function parseSpanish(value: string): boolean {
  const v = value.toLowerCase().trim();
  return ["yes", "y", "true", "1", "si", "sí", "spanish", "es"].includes(v);
}

function parsePremium(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // MM/DD/YYYY or M/D/YYYY
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(v);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

/** Convert CSV rows to policy objects using column mapping */
export function mapRowsToPolicies(
  rows: string[][],
  mapping: Record<number, PolicyField>
): { policies: ParsedPolicyRow[]; errors: RowError[] } {
  const policies: ParsedPolicyRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2; // account for header + 1-based
    const fields: Partial<ParsedPolicyRow> = {
      stage: "upcoming",
      spanish_speaker: false,
      phone: null,
      email: null,
      policy_number: null,
      notes: null,
    };

    Object.entries(mapping).forEach(([colIndex, field]) => {
      if (field === "skip") return;
      const value = row[Number(colIndex)]?.trim() ?? "";
      if (!value) return;
      if (field === "spanish_speaker") {
        fields.spanish_speaker = parseSpanish(value);
      } else {
        (fields as Record<string, unknown>)[field] = value;
      }
    });

    const clientName = String(fields.client_name ?? "").trim();
    if (!clientName) {
      errors.push({ row: rowNum, client: "(empty)", reason: "Missing client name" });
      return;
    }

    const carrier = normalizeCarrier(String(fields.carrier ?? ""));
    if (!carrier) {
      errors.push({
        row: rowNum,
        client: clientName,
        reason: `Invalid carrier: "${fields.carrier ?? ""}" — must be Trexis, Progressive, or GAINSCO`,
      });
      return;
    }

    const premium = parsePremium(String(fields.premium ?? ""));
    if (premium === null) {
      errors.push({
        row: rowNum,
        client: clientName,
        reason: `Invalid premium: "${fields.premium ?? ""}"`,
      });
      return;
    }

    const renewalDate = parseDate(String(fields.renewal_date ?? ""));
    if (!renewalDate) {
      errors.push({
        row: rowNum,
        client: clientName,
        reason: `Invalid renewal date: "${fields.renewal_date ?? ""}"`,
      });
      return;
    }

    policies.push({
      client_name: clientName,
      carrier,
      premium,
      renewal_date: renewalDate,
      stage: normalizeStage(String(fields.stage ?? "upcoming")),
      spanish_speaker: fields.spanish_speaker ?? false,
      phone: fields.phone ? String(fields.phone) : null,
      email: fields.email ? String(fields.email) : null,
      policy_number: fields.policy_number ? String(fields.policy_number) : null,
      notes: fields.notes ? String(fields.notes) : null,
    });
  });

  return { policies, errors };
}

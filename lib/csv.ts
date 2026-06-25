export type PolicyField =
  | "client_name"
  | "carrier"
  | "prior_carrier"
  | "premium"
  | "effective_date"
  | "renewal_date"
  | "stage"
  | "spanish_speaker"
  | "commercial"
  | "term_months"
  | "phone"
  | "email"
  | "policy_number"
  | "client_since"
  | "notes"
  | "skip";

export const POLICY_FIELDS: { value: PolicyField; label: string }[] = [
  { value: "skip", label: "— Skip this column —" },
  { value: "client_name", label: "Client Name" },
  { value: "carrier", label: "Carrier" },
  { value: "prior_carrier", label: "Prior Carrier" },
  { value: "premium", label: "Premium" },
  { value: "effective_date", label: "Effective Date" },
  { value: "renewal_date", label: "Expiration Date" },
  { value: "stage", label: "Stage" },
  { value: "spanish_speaker", label: "Spanish Speaker" },
  { value: "commercial", label: "Commercial" },
  { value: "term_months", label: "Term (6 or 12 months)" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "policy_number", label: "Policy Number" },
  { value: "client_since", label: "Client Since Date" },
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
  prior_carrier: "prior_carrier",
  "prior carrier": "prior_carrier",
  "previous carrier": "prior_carrier",
  company: "carrier",
  insurance: "carrier",
  premium: "premium",
  "annual premium": "premium",
  "policy premium": "premium",
  effective_date: "effective_date",
  effectivedate: "effective_date",
  "effective date": "effective_date",
  effective: "effective_date",
  inception: "effective_date",
  "inception date": "effective_date",
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
  commercial: "commercial",
  com: "commercial",
  "line of business": "commercial",
  lob: "commercial",
  term_months: "term_months",
  term: "term_months",
  "policy term": "term_months",
  "term months": "term_months",
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
  client_since: "client_since",
  "client since": "client_since",
  "client since date": "client_since",
  "date acquired": "client_since",
  "acquired date": "client_since",
  "start date": "client_since",
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
  prior_carrier: string | null;
  premium: number;
  effective_date: string | null;
  renewal_date: string;
  stage: string;
  spanish_speaker: boolean;
  commercial: boolean;
  term_months: number;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
  client_since: string | null;
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
  if (v.includes("foremost")) return "foremost";
  if (v.includes("safeco")) return "safeco";
  if (v.includes("national") && v.includes("general")) return "national_general";
  if (v.includes("national general")) return "national_general";
  if (v.includes("bristol")) return "bristol_west";
  if (v.includes("geico")) return "geico";
  if (v.includes("surety")) return "liberty_mutual_surety_bond";
  if (v.includes("bop") || (v.includes("liberty") && v.includes("mutual") && !v.includes("surety")))
    return "liberty_mutual_bop";
  if (v.includes("tapco")) return "tapco";
  if (v.includes("cna")) return "cna";
  if (v.includes("bruce") || v.includes("messier")) return "bruce_messier";
  if (v.includes("mesa")) return "mesa";
  if (v.includes("acceptance")) return "acceptance_independent";
  const valid = [
    "trexis", "progressive", "gainsco", "foremost", "safeco",
    "national_general", "bristol_west", "geico",
    "liberty_mutual_bop", "liberty_mutual_surety_bond",
    "tapco", "cna", "bruce_messier", "mesa", "acceptance_independent",
  ];
  if (valid.includes(v)) return v;
  return null;
}

function normalizeStage(value: string): string {
  const v = value.toLowerCase().trim();
  const stages = ["upcoming", "contacted", "quoted", "retained", "active", "lapsed"];
  if (stages.includes(v)) return v;
  if (v.includes("active") || v.includes("current")) return "active";
  if (v.includes("retain")) return "retained";
  if (v.includes("contact")) return "contacted";
  if (v.includes("quote")) return "quoted";
  if (v.includes("lapse")) return "lapsed";
  return "upcoming";
}

function parseTermMonths(value: string): 6 | 12 {
  const v = value.toLowerCase().trim();
  if (/^6\b|6[\s-]?mo|semi/i.test(v)) return 6;
  if (/^12\b|12[\s-]?mo|annual|year/i.test(v)) return 12;
  const num = parseInt(v, 10);
  if (num === 6) return 6;
  return 12;
}

function parseCommercial(value: string): boolean {
  const v = value.toLowerCase().trim();
  return ["yes", "y", "true", "1", "commercial", "com", "comm"].includes(v);
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
      stage: "active",
      spanish_speaker: false,
      commercial: false,
      term_months: 12,
      phone: null,
      email: null,
      policy_number: null,
      client_since: null,
      notes: null,
    };

    let priorCarrierRaw: string | null = null;

    Object.entries(mapping).forEach(([colIndex, field]) => {
      if (field === "skip") return;
      const value = row[Number(colIndex)]?.trim() ?? "";
      if (!value) return;
      if (field === "spanish_speaker") {
        fields.spanish_speaker = parseSpanish(value);
      } else if (field === "commercial") {
        fields.commercial = parseCommercial(value);
      } else if (field === "term_months") {
        fields.term_months = parseTermMonths(value);
      } else if (field === "client_since") {
        const parsed = parseDate(value);
        if (parsed) fields.client_since = parsed;
      } else if (field === "prior_carrier") {
        priorCarrierRaw = value;
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
        reason: `Invalid carrier: "${fields.carrier ?? ""}" — not recognized. Check spelling or add it in Supabase.`,
      });
      return;
    }

    let priorCarrier: string | null = null;
    if (priorCarrierRaw) {
      priorCarrier = normalizeCarrier(priorCarrierRaw);
      if (!priorCarrier) {
        errors.push({
          row: rowNum,
          client: clientName,
          reason: `Invalid prior carrier: "${priorCarrierRaw}"`,
        });
        return;
      }
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
        reason: `Invalid expiration date: "${fields.renewal_date ?? ""}"`,
      });
      return;
    }

    const effectiveDateRaw = fields.effective_date
      ? parseDate(String(fields.effective_date))
      : null;

    policies.push({
      client_name: clientName,
      carrier,
      prior_carrier: priorCarrier,
      premium,
      effective_date: effectiveDateRaw,
      renewal_date: renewalDate,
      stage: normalizeStage(String(fields.stage ?? "active")),
      spanish_speaker: fields.spanish_speaker ?? false,
      commercial: fields.commercial ?? false,
      term_months: fields.term_months ?? 12,
      phone: fields.phone ? String(fields.phone) : null,
      email: fields.email ? String(fields.email) : null,
      policy_number: fields.policy_number ? String(fields.policy_number) : null,
      client_since: fields.client_since ? String(fields.client_since) : null,
      notes: fields.notes ? String(fields.notes) : null,
    });
  });

  return { policies, errors };
}

export type Carrier =
  | "trexis"
  | "progressive"
  | "gainsco"
  | "foremost"
  | "safeco"
  | "national_general"
  | "bristol_west"
  | "geico"
  | "liberty_mutual_bop"
  | "liberty_mutual_surety_bond"
  | "tapco"
  | "cna"
  | "bruce_messier"
  | "mesa"
  | "acceptance_independent";

export type Stage =
  | "upcoming"
  | "contacted"
  | "quoted"
  | "retained"
  | "active"
  | "lapsed";

export type ContactType =
  | "call"
  | "sms"
  | "whatsapp"
  | "email"
  | "non_pay_alert"
  | "non_pay_resolved"
  | "renewal_reminder_45"
  | "manual_policy_review"
  | "policy_review_response"
  | "welcome_email";

export type OutreachStatus = "sent" | "failed" | "pending";

export type TriggerType =
  | "days_before_renewal"
  | "non_pay"
  | "post_retain"
  | "lapsed";

export type Channel = "whatsapp" | "sms" | "email";

export type TermMonths = 6 | 12;

export type PolicyType =
  | "personal_auto"
  | "commercial_auto"
  | "homeowners"
  | "renters"
  | "commercial_general_liability"
  | "life"
  | "other";

export type LeadStage = "new" | "contacted" | "quoted" | "sold";

export type ClientState = "TN" | "TX" | "MA" | "RI";

export const CLIENT_STATES: ClientState[] = ["TN", "TX", "MA", "RI"];

export const DEFAULT_CLIENT_STATE: ClientState = "TN";

export const CLIENT_STATE_LABELS: Record<ClientState, string> = {
  TN: "Tennessee",
  TX: "Texas",
  MA: "Massachusetts",
  RI: "Rhode Island",
};

export function normalizeClientState(value: unknown): ClientState {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (raw === "TEXAS") return "TX";
  if (raw === "TENNESSEE") return "TN";
  if (raw === "MASSACHUSETTS") return "MA";
  if (raw === "RHODE ISLAND" || raw === "RI") return "RI";
  if (CLIENT_STATES.includes(raw as ClientState)) return raw as ClientState;
  return DEFAULT_CLIENT_STATE;
}

export interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  is_spanish_speaker: boolean;
  client_state: ClientState;
  notes: string | null;
  created_at: string;
}

export interface ClientWithStats extends Client {
  policy_count: number;
  active_policy_count: number;
  total_premium: number;
  carriers: Carrier[];
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  stage: LeadStage;
  label: string | null;
  agent_initials: string;
  notes: string | null;
  created_at: string;
}

export interface Policy {
  id: string;
  client_id: string | null;
  client_name: string;
  carrier: Carrier;
  prior_carrier: Carrier | null;
  premium: number;
  effective_date: string | null;
  renewal_date: string;
  stage: Stage;
  spanish_speaker: boolean;
  client_state: ClientState;
  commercial: boolean;
  term_months: TermMonths;
  policy_type: PolicyType;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
  client_address: string | null;
  client_since: string | null;
  notes: string | null;
  created_at: string;
  is_historical?: boolean;
}

export interface ContactLog {
  id: string;
  policy_id: string;
  contact_date: string;
  contact_type: ContactType;
  outcome: string | null;
  notes: string | null;
  status?: OutreachStatus;
}

export interface Automation {
  id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_days: number | null;
  channel: Channel;
  template_text: string;
  active: boolean;
  created_at: string;
}

export interface PolicyDocument {
  id: string;
  policy_id: string;
  file_name: string;
  r2_key: string;
  file_size: number;
  uploaded_at: string;
  notes: string | null;
}

export const STAGES: Stage[] = [
  "upcoming",
  "contacted",
  "quoted",
  "retained",
  "active",
  "lapsed",
];

/** Columns on the Retention Center kanban (pipeline + lapsed). */
export const RETENTION_KANBAN_STAGES: Stage[] = [
  "upcoming",
  "contacted",
  "quoted",
  "retained",
  "lapsed",
];

export const STAGE_LABELS: Record<Stage, string> = {
  upcoming: "Upcoming",
  contacted: "Contacted",
  quoted: "Quoted",
  retained: "Retained",
  active: "Active Client",
  lapsed: "Lapsed",
};

export const CARRIERS: Carrier[] = [
  "trexis",
  "progressive",
  "gainsco",
  "foremost",
  "safeco",
  "national_general",
  "bristol_west",
  "geico",
  "liberty_mutual_bop",
  "liberty_mutual_surety_bond",
  "tapco",
  "cna",
  "bruce_messier",
  "mesa",
  "acceptance_independent",
];

export const CARRIER_LABELS: Record<Carrier, string> = {
  trexis: "Trexis",
  progressive: "Progressive",
  gainsco: "GAINSCO",
  foremost: "Foremost",
  safeco: "Safeco",
  national_general: "National General",
  bristol_west: "Bristol West",
  geico: "Geico",
  liberty_mutual_bop: "Liberty Mutual BOP",
  liberty_mutual_surety_bond: "Liberty Mutual Surety Bond",
  tapco: "TAPCO",
  cna: "CNA",
  bruce_messier: "Bruce Messier",
  mesa: "MESA",
  acceptance_independent: "Acceptance Independent",
};

export const TERM_MONTHS: TermMonths[] = [6, 12];

export const TERM_LABELS: Record<TermMonths, string> = {
  6: "6 months",
  12: "12 months",
};

export const POLICY_TYPES: PolicyType[] = [
  "personal_auto",
  "commercial_auto",
  "homeowners",
  "renters",
  "commercial_general_liability",
  "life",
  "other",
];

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  personal_auto: "Personal Auto",
  commercial_auto: "Commercial Auto",
  homeowners: "Homeowners",
  renters: "Renters",
  commercial_general_liability: "Commercial General Liability",
  life: "Life",
  other: "Other",
};

export const LEAD_STAGES: LeadStage[] = ["new", "contacted", "quoted", "sold"];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  sold: "Sold",
};

export const DEFAULT_AGENT_INITIALS = "JG";

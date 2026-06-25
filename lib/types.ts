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
  | "lapsed";

export type ContactType =
  | "call"
  | "sms"
  | "whatsapp"
  | "email"
  | "non_pay_alert"
  | "renewal_reminder_45"
  | "manual_policy_review";

export type TriggerType =
  | "days_before_renewal"
  | "non_pay"
  | "post_retain"
  | "lapsed";

export type Channel = "whatsapp" | "sms" | "email";

export type TermMonths = 6 | 12;

export type LeadStage = "new" | "contacted" | "quoted" | "sold";

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
  client_name: string;
  carrier: Carrier;
  prior_carrier: Carrier | null;
  premium: number;
  renewal_date: string;
  stage: Stage;
  spanish_speaker: boolean;
  commercial: boolean;
  term_months: TermMonths;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
  client_address: string | null;
  client_since: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContactLog {
  id: string;
  policy_id: string;
  contact_date: string;
  contact_type: ContactType;
  outcome: string | null;
  notes: string | null;
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
  "lapsed",
];

export const STAGE_LABELS: Record<Stage, string> = {
  upcoming: "Upcoming",
  contacted: "Contacted",
  quoted: "Quoted",
  retained: "Retained",
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

export const LEAD_STAGES: LeadStage[] = ["new", "contacted", "quoted", "sold"];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  sold: "Sold",
};

export const DEFAULT_AGENT_INITIALS = "JG";

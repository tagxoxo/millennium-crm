export type Carrier = "trexis" | "progressive" | "gainsco";

export type Stage =
  | "upcoming"
  | "contacted"
  | "quoted"
  | "retained"
  | "lapsed";

export type ContactType = "call" | "sms" | "whatsapp" | "email";

export type TriggerType =
  | "days_before_renewal"
  | "non_pay"
  | "post_retain"
  | "lapsed";

export type Channel = "whatsapp" | "sms" | "email";

export interface Policy {
  id: string;
  client_name: string;
  carrier: Carrier;
  premium: number;
  renewal_date: string;
  stage: Stage;
  spanish_speaker: boolean;
  phone: string | null;
  email: string | null;
  policy_number: string | null;
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

export const CARRIER_LABELS: Record<Carrier, string> = {
  trexis: "Trexis",
  progressive: "Progressive",
  gainsco: "GAINSCO",
};

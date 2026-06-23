import type { Channel, TriggerType } from "./types";

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  days_before_renewal: "Days Before Renewal",
  non_pay: "Non-Payment",
  post_retain: "After Retention",
  lapsed: "Lapsed Client",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
};

export const TEMPLATE_VARIABLES = [
  "{{client_name}}",
  "{{carrier}}",
  "{{renewal_date}}",
  "{{premium}}",
  "{{google_review_link}}",
];

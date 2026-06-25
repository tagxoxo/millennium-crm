import { sendEmail } from "@/lib/mail";
import {
  buildEnglishRenewalReminder45,
  buildSpanishRenewalReminder45,
} from "@/lib/renewalReminderEmails";
import { carrierDisplayName } from "@/lib/renewalReminders";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types";

export function buildRenewalReminder45Email(
  policy: Pick<Policy, "client_name" | "carrier" | "spanish_speaker">
) {
  const carrier = carrierDisplayName(policy.carrier);
  const isSpanish = Boolean(policy.spanish_speaker);

  return isSpanish
    ? buildSpanishRenewalReminder45(policy.client_name, carrier)
    : buildEnglishRenewalReminder45(policy.client_name, carrier);
}

export async function sendRenewalReminder45ForPolicy(policyId: string) {
  const supabase = getSupabaseServer();

  const { data: policy, error: fetchError } = await supabase
    .from("policies")
    .select("id, client_name, email, carrier, spanish_speaker, stage")
    .eq("id", policyId)
    .single();

  if (fetchError || !policy) {
    return { ok: false as const, error: "Policy not found." };
  }

  const email = policy.email?.trim();
  if (!email) {
    return {
      ok: false as const,
      error: "This client has no email on file. Add one in Edit Client Info.",
    };
  }

  const template = buildRenewalReminder45Email(policy as Policy);
  const isSpanish = Boolean(policy.spanish_speaker);

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  const note = isSpanish
    ? "45-day renewal reminder sent (Spanish)"
    : "45-day renewal reminder sent (English)";

  const { error: logError } = await supabase.from("contact_log").insert({
    policy_id: policy.id,
    contact_type: "renewal_reminder_45",
    status: "sent",
    notes: note,
  });

  if (logError) {
    return {
      ok: true as const,
      logWarning:
        "Email sent, but contact history was not saved. Run supabase/add-renewal-reminder-contact-type.sql.",
    };
  }

  return { ok: true as const };
}

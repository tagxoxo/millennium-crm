import { sendEmail } from "@/lib/mail";
import {
  buildEnglishNonPayAlert,
  buildSpanishNonPayAlert,
} from "@/lib/nonPayAlertEmails";
import { carrierDisplayName } from "@/lib/renewalReminders";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Policy } from "@/lib/types";

export function buildNonPayAlertEmail(
  policy: Pick<Policy, "client_name" | "carrier" | "spanish_speaker">
) {
  const carrier = carrierDisplayName(policy.carrier);
  const isSpanish = Boolean(policy.spanish_speaker);

  return isSpanish
    ? buildSpanishNonPayAlert(policy.client_name, carrier)
    : buildEnglishNonPayAlert(policy.client_name, carrier);
}

export async function sendNonPayAlertForPolicy(policyId: string) {
  const supabase = getSupabaseServer();

  const { data: policy, error: fetchError } = await supabase
    .from("policies")
    .select("id, client_name, email, carrier, spanish_speaker")
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

  const template = buildNonPayAlertEmail(policy as Policy);
  const isSpanish = Boolean(policy.spanish_speaker);

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  const note = isSpanish
    ? "Non-pay alert email sent (Spanish)"
    : "Non-pay alert email sent (English)";

  const { error: logError } = await supabase.from("contact_log").insert({
    policy_id: policy.id,
    contact_type: "non_pay_alert",
    status: "sent",
    notes: note,
  });

  if (logError) {
    return {
      ok: true as const,
      logWarning:
        "Email sent, but contact history was not saved. Run supabase/add-non-pay-contact-type.sql.",
    };
  }

  return { ok: true as const };
}

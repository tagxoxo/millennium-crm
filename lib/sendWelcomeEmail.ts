import { sendEmail } from "@/lib/mail";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildWelcomeEmail } from "@/lib/welcomeEmail";

const LOG_MIGRATION_HINT =
  "Email sent, but contact history was not saved. Run supabase/add-welcome-email-contact-type.sql.";

async function logWelcomeEmail(
  policyId: string,
  isSpanish: boolean
): Promise<string | undefined> {
  const supabase = getSupabaseServer();
  const note = isSpanish
    ? "Welcome email sent (Spanish)"
    : "Welcome email sent (English)";

  const { error: logError } = await supabase.from("contact_log").insert({
    policy_id: policyId,
    contact_type: "welcome_email",
    status: "sent",
    notes: note,
  });

  if (logError) {
    return LOG_MIGRATION_HINT;
  }

  return undefined;
}

export function buildWelcomeEmailPreview(
  fullName: string,
  spanishSpeaker: boolean
) {
  return buildWelcomeEmail(fullName, spanishSpeaker);
}

export async function sendWelcomeEmailForPolicy(policyId: string) {
  const supabase = getSupabaseServer();

  const { data: policy, error: fetchError } = await supabase
    .from("policies")
    .select("id, client_name, email, spanish_speaker, client_id")
    .eq("id", policyId)
    .single();

  if (fetchError || !policy) {
    return { ok: false as const, error: "Policy not found." };
  }

  let email = policy.email?.trim() || null;

  if (!email && policy.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("email")
      .eq("id", policy.client_id)
      .single();
    email = client?.email?.trim() || null;
  }

  if (!email) {
    return {
      ok: false as const,
      error: "This client has no email on file. Add one in Edit Client Info.",
    };
  }

  const isSpanish = Boolean(policy.spanish_speaker);
  const template = buildWelcomeEmail(policy.client_name, isSpanish);

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  const logWarning = await logWelcomeEmail(policy.id, isSpanish);

  if (logWarning) {
    return { ok: true as const, logWarning };
  }

  return { ok: true as const };
}

export async function sendWelcomeEmailForClient(clientId: string) {
  const supabase = getSupabaseServer();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, full_name, email, is_spanish_speaker")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return { ok: false as const, error: "Client not found." };
  }

  const email = client.email?.trim();
  if (!email) {
    return {
      ok: false as const,
      error: "This client has no email on file. Add one in Edit Client Info.",
    };
  }

  const { data: policies } = await supabase
    .from("policies")
    .select("id, is_historical, renewal_date")
    .eq("client_id", clientId)
    .order("renewal_date", { ascending: true });

  const activePolicies = (policies ?? []).filter((p) => !p.is_historical);
  const policyForLog = activePolicies[0] ?? policies?.[0];

  if (!policyForLog) {
    return {
      ok: false as const,
      error: "This client has no policy on file to attach the welcome email to.",
    };
  }

  const isSpanish = Boolean(client.is_spanish_speaker);
  const template = buildWelcomeEmail(client.full_name, isSpanish);

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
  });

  const logWarning = await logWelcomeEmail(policyForLog.id, isSpanish);

  if (logWarning) {
    return { ok: true as const, logWarning };
  }

  return { ok: true as const };
}

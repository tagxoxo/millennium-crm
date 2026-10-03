import { getSupabaseServer } from "@/lib/supabase/server";
import type { Carrier, Policy, PolicyType } from "@/lib/types";
import { CARRIERS, POLICY_TYPES, normalizeClientState } from "@/lib/types";
import { normalizeTermMonths } from "@/lib/utils";
import { buildRenewedNotes, nextRenewalDate } from "@/lib/retainPolicy";

export interface RetainPolicyResult {
  ok: true;
  id: string;
  rewritten: boolean;
  renewalDate: string;
  premium: number;
}

export interface RetainPolicyFailure {
  ok: false;
  error: string;
  status: number;
}

function parsePremium(value: unknown): number | null {
  const premium = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(premium) || premium < 0) return null;
  return Math.round(premium * 100) / 100;
}

export async function retainPolicy(
  id: string,
  body: { premium?: unknown; rewritten?: unknown; carrier?: unknown }
): Promise<RetainPolicyResult | RetainPolicyFailure> {
  const premium = parsePremium(body.premium);
  if (premium === null) {
    return { ok: false, error: "Enter the new renewal premium.", status: 400 };
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return { ok: false, error: "Policy not found.", status: 404 };
  }

  const policy = data as Policy;
  if (policy.is_historical) {
    return { ok: false, error: "Past policies can't be retained.", status: 400 };
  }

  const rewritten = Boolean(body.rewritten);
  let newCarrier: Carrier | null = null;
  if (rewritten) {
    const carrier = String(body.carrier ?? "") as Carrier;
    if (!CARRIERS.includes(carrier)) {
      return { ok: false, error: "Choose the new carrier.", status: 400 };
    }
    if (carrier === policy.carrier) {
      return {
        ok: false,
        error: "Pick a different carrier, or uncheck the rewrite box.",
        status: 400,
      };
    }
    newCarrier = carrier;
  }

  const newRenewalDate = nextRenewalDate(policy);
  const retainedAt = new Date().toISOString();
  const notes = buildRenewedNotes({
    oldRenewalDate: policy.renewal_date,
    newRenewalDate,
    oldPremium: Number(policy.premium) || 0,
    newPremium: premium,
    oldCarrier: rewritten ? policy.carrier : null,
    newCarrier,
  });

  if (newCarrier) {
    return rewriteWithCarrier({
      policy,
      premium,
      newCarrier,
      newRenewalDate,
      retainedAt,
      notes,
    });
  }

  return retainSamePolicy({
    policy,
    premium,
    newRenewalDate,
    retainedAt,
    notes,
  });
}

async function insertRenewedLog(
  policyId: string,
  notes: string
): Promise<string | null> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("contact_log").insert({
    policy_id: policyId,
    contact_type: "renewed",
    outcome: "Renewed",
    notes,
  });
  return error ? error.message : null;
}

async function retainSamePolicy(input: {
  policy: Policy;
  premium: number;
  newRenewalDate: string;
  retainedAt: string;
  notes: string;
}): Promise<RetainPolicyResult | RetainPolicyFailure> {
  const supabase = getSupabaseServer();
  const { policy, premium, newRenewalDate, retainedAt, notes } = input;

  const { error } = await supabase
    .from("policies")
    .update({
      renewal_date: newRenewalDate,
      premium,
      stage: "retained",
      retained_at: retainedAt,
    })
    .eq("id", policy.id);

  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  const logError = await insertRenewedLog(policy.id, notes);
  if (logError) {
    await supabase
      .from("policies")
      .update({
        renewal_date: policy.renewal_date,
        premium: policy.premium,
        stage: policy.stage,
        retained_at: policy.retained_at ?? null,
      })
      .eq("id", policy.id);
    return { ok: false, error: logError, status: 400 };
  }

  return {
    ok: true,
    id: policy.id,
    rewritten: false,
    renewalDate: newRenewalDate,
    premium,
  };
}

async function rewriteWithCarrier(input: {
  policy: Policy;
  premium: number;
  newCarrier: Carrier;
  newRenewalDate: string;
  retainedAt: string;
  notes: string;
}): Promise<RetainPolicyResult | RetainPolicyFailure> {
  const supabase = getSupabaseServer();
  const { policy, premium, newCarrier, newRenewalDate, retainedAt, notes } = input;
  const policyType = POLICY_TYPES.includes(policy.policy_type)
    ? policy.policy_type
    : ("personal_auto" as PolicyType);

  const { data: created, error: insertError } = await supabase
    .from("policies")
    .insert({
      client_id: policy.client_id,
      client_name: policy.client_name,
      carrier: newCarrier,
      prior_carrier: policy.carrier,
      premium,
      effective_date: policy.renewal_date,
      renewal_date: newRenewalDate,
      stage: "retained",
      retained_at: retainedAt,
      spanish_speaker: Boolean(policy.spanish_speaker),
      client_state: normalizeClientState(policy.client_state),
      commercial: Boolean(policy.commercial),
      term_months: normalizeTermMonths(policy.term_months),
      policy_type: policyType,
      phone: policy.phone,
      email: policy.email,
      policy_number: null,
      client_address: policy.client_address,
      client_since: policy.client_since,
      notes: policy.notes,
      is_historical: false,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not create the new policy.",
      status: 400,
    };
  }

  const { error: historicalError } = await supabase
    .from("policies")
    .update({ is_historical: true })
    .eq("id", policy.id);

  if (historicalError) {
    await supabase.from("policies").delete().eq("id", created.id);
    return { ok: false, error: historicalError.message, status: 400 };
  }

  const logError = await insertRenewedLog(created.id, notes);
  if (logError) {
    await supabase
      .from("policies")
      .update({ is_historical: false })
      .eq("id", policy.id);
    await supabase.from("policies").delete().eq("id", created.id);
    return { ok: false, error: logError, status: 400 };
  }

  return {
    ok: true,
    id: created.id,
    rewritten: true,
    renewalDate: newRenewalDate,
    premium,
  };
}

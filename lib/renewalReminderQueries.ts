import { getSupabaseServer } from "@/lib/supabase/server";
import {
  daysAgoISO,
  RENEWAL_REMINDER_LOOKBACK_DAYS,
  RENEWAL_REMINDER_STATS_DAYS,
} from "@/lib/renewalReminders";

export async function fetchRecentRenewalReminderPolicyIds(): Promise<string[]> {
  const supabase = getSupabaseServer();
  const cutoff = daysAgoISO(RENEWAL_REMINDER_LOOKBACK_DAYS);

  const { data, error } = await supabase
    .from("contact_log")
    .select("policy_id")
    .eq("contact_type", "renewal_reminder_45")
    .gte("contact_date", cutoff);

  if (error) {
    console.error("fetchRecentRenewalReminderPolicyIds:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.policy_id);
}

export async function fetchRenewalRemindersSentLast30Days(): Promise<number> {
  const supabase = getSupabaseServer();
  const cutoff = daysAgoISO(RENEWAL_REMINDER_STATS_DAYS);

  const { count, error } = await supabase
    .from("contact_log")
    .select("*", { count: "exact", head: true })
    .eq("contact_type", "renewal_reminder_45")
    .gte("contact_date", cutoff);

  if (error) {
    console.error("fetchRenewalRemindersSentLast30Days:", error.message);
    return 0;
  }

  return count ?? 0;
}

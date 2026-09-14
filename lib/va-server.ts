import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  isTodayInAgencyTz,
  VA_ACCESS_COOKIE,
  type VaRequest,
} from "@/lib/va";

/** Role lives on public.users — this project has no profiles table. */
export async function getVaRole(
  userId: string,
  email: string | undefined
): Promise<string | null> {
  const supabase = getSupabaseServer();

  const { data: byId } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (byId?.role) return byId.role;

  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  return byEmail?.role ?? null;
}

export async function getVaAuthUser() {
  const token = cookies().get(VA_ACCESS_COOKIE)?.value;
  if (!token) return null;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function fetchTodaysVaRequests(
  userId: string
): Promise<{ requests: VaRequest[]; error: string | null }> {
  const supabase = getSupabaseServer();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("va_requests")
    .select(
      "id, created_at, caller_name, policy_number, phone_number, email, request_type, carrier, language, notes, intake, status, completed_at, submitted_by"
    )
    .eq("submitted_by", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return { requests: [], error: error.message };
  }

  const requests = ((data ?? []) as VaRequest[]).filter((row) =>
    isTodayInAgencyTz(row.created_at)
  );

  return { requests, error: null };
}

export async function fetchAllVaTickets(): Promise<{
  tickets: VaRequest[];
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("va_requests")
    .select(
      "id, created_at, caller_name, policy_number, phone_number, email, request_type, carrier, language, notes, intake, status, completed_at, submitted_by"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { tickets: [], error: error.message };
  }

  return { tickets: (data ?? []) as VaRequest[], error: null };
}

export async function countOpenVaTickets(): Promise<number> {
  const supabase = getSupabaseServer();
  const { count, error } = await supabase
    .from("va_requests")
    .select("id", { count: "exact", head: true })
    .neq("status", "completed");

  if (error) return 0;
  return count ?? 0;
}

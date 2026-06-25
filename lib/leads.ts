import type { Lead } from "@/lib/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function fetchAllLeads(): Promise<{
  leads: Lead[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return { leads: [], error: error.message };
    return { leads: (data ?? []) as Lead[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { leads: [], error: message };
  }
}

export async function fetchLeadById(id: string): Promise<Lead | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data as Lead;
  } catch {
    return null;
  }
}

import type { Policy } from "@/lib/types";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Fetch all policies (paginated for large books) */
export async function fetchAllPolicies(): Promise<{
  policies: Policy[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseServer();
    const pageSize = 1000;
    let from = 0;
    const all: Policy[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .eq("is_historical", false)
        .order("renewal_date", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) return { policies: [], error: error.message };
      if (!data || data.length === 0) break;

      all.push(...(data as Policy[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return { policies: all, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { policies: [], error: message };
  }
}

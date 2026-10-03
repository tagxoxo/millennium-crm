import { computeAutoPipelineStage } from "@/lib/retentionPipeline";
import { isRetainedHoldExpired } from "@/lib/retainPolicy";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Policy, Stage } from "@/lib/types";

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

    const policies = await releaseExpiredRetainedHolds(all);
    return { policies, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { policies: [], error: message };
  }
}

/**
 * Retained policies leave that column after 14 days.
 * They are set back to upcoming, then the normal 60-day rule places them:
 * Upcoming if the next expiration is already inside the window, otherwise Active.
 */
async function releaseExpiredRetainedHolds(policies: Policy[]): Promise<Policy[]> {
  const updates: Array<{ id: string; stage: Stage }> = [];
  const released = policies.map((policy) => {
    if (!isRetainedHoldExpired(policy)) return policy;
    const stage = computeAutoPipelineStage({ ...policy, stage: "upcoming" });
    if (stage === policy.stage) return policy;
    updates.push({ id: policy.id, stage });
    return { ...policy, stage };
  });

  if (updates.length === 0) return released;

  const supabase = getSupabaseServer();
  const byStage = new Map<Stage, string[]>();
  for (const update of updates) {
    const ids = byStage.get(update.stage) ?? [];
    ids.push(update.id);
    byStage.set(update.stage, ids);
  }

  const results = await Promise.all(
    [...byStage.entries()].map(([stage, ids]) =>
      supabase.from("policies").update({ stage }).in("id", ids)
    )
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("releaseExpiredRetainedHolds:", failed.error.message);
    return policies;
  }

  return released;
}

import { getSupabaseServer } from "@/lib/supabase/server";
import {
  computeAutoPipelineStage,
  filterActiveClientPolicies,
  filterRetentionPipelinePolicies,
} from "@/lib/retentionPipeline";
import type { Policy, Stage } from "@/lib/types";

export async function syncRetentionPipelineStages(
  policies: Policy[]
): Promise<Policy[]> {
  const supabase = getSupabaseServer();
  const updates: Array<{ id: string; stage: Stage }> = [];

  const synced = policies.map((policy) => {
    const nextStage = computeAutoPipelineStage(policy);
    if (nextStage !== policy.stage) {
      updates.push({ id: policy.id, stage: nextStage });
      return { ...policy, stage: nextStage };
    }
    return policy;
  });

  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, stage }) =>
        supabase.from("policies").update({ stage }).eq("id", id)
      )
    );
  }

  return synced;
}

export async function syncPolicyPipelineStage(
  policy: Policy
): Promise<Policy> {
  const nextStage = computeAutoPipelineStage(policy);
  if (nextStage === policy.stage) return policy;

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("policies")
    .update({ stage: nextStage })
    .eq("id", policy.id);

  if (error) {
    console.error("syncPolicyPipelineStage:", error.message);
    return policy;
  }

  return { ...policy, stage: nextStage };
}

export function getRetentionPipelinePolicies(policies: Policy[]): Policy[] {
  return filterRetentionPipelinePolicies(policies);
}

export function getActiveClientPolicies(policies: Policy[]): Policy[] {
  return filterActiveClientPolicies(policies);
}

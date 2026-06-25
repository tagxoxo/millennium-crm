import type { Policy, Stage } from "./types";
import { STAGE_LABELS } from "./types";
import { daysUntilRenewal } from "./utils";

/** Policies enter the retention kanban when expiration is within this many days. */
export const RETENTION_PIPELINE_DAYS = 60;

const ACTIVE_PIPELINE_STAGES: Stage[] = ["upcoming", "contacted", "quoted"];

export function isInRetentionPipeline(
  policy: Pick<Policy, "renewal_date" | "stage" | "is_historical">
): boolean {
  if (policy.is_historical) return false;
  if (policy.stage === "lapsed" || policy.stage === "active") return false;
  return daysUntilRenewal(policy.renewal_date) <= RETENTION_PIPELINE_DAYS;
}

export function isActiveBookClient(
  policy: Pick<Policy, "stage" | "is_historical">
): boolean {
  if (policy.is_historical) return false;
  return policy.stage === "active";
}

export function daysUntilPipelineEntry(renewalDate: string): number {
  return daysUntilRenewal(renewalDate) - RETENTION_PIPELINE_DAYS;
}

/** Auto-sync stage based on days until expiration. */
export function computeAutoPipelineStage(policy: Policy): Stage {
  if (policy.is_historical) return policy.stage;
  if (policy.stage === "lapsed") return "lapsed";

  const inPipeline = isInRetentionPipeline(policy);

  if (inPipeline) {
    if (policy.stage === "active") return "upcoming";
    return policy.stage;
  }

  if (ACTIVE_PIPELINE_STAGES.includes(policy.stage) || policy.stage === "retained") {
    return "active";
  }

  return policy.stage;
}

export function resolveInitialPipelineStage(
  renewalDate: string,
  requestedStage: Stage | undefined,
  isHistorical: boolean
): Stage {
  if (isHistorical) return "lapsed";

  const draft = {
    renewal_date: renewalDate,
    stage: requestedStage ?? "active",
    is_historical: false,
  } as Policy;

  return computeAutoPipelineStage(draft);
}

export function filterRetentionPipelinePolicies(policies: Policy[]): Policy[] {
  return policies.filter(isInRetentionPipeline);
}

export function filterActiveClientPolicies(policies: Policy[]): Policy[] {
  return policies
    .filter(isActiveBookClient)
    .sort(
      (a, b) =>
        daysUntilRenewal(a.renewal_date) - daysUntilRenewal(b.renewal_date)
    );
}

export function getPipelineStageNote(policy: Policy): string | null {
  if (policy.is_historical || policy.stage === "lapsed") return null;
  if (isInRetentionPipeline(policy)) {
    if (policy.stage === "retained") {
      return "Renewed this term — still within the renewal window.";
    }
    return null;
  }

  if (policy.stage !== "active") return null;

  const days = daysUntilPipelineEntry(policy.renewal_date);
  if (days <= 0) return null;

  return `Enters retention pipeline in ${days} day${days === 1 ? "" : "s"}`;
}

export function getPipelineStageLabel(policy: Policy): string {
  return STAGE_LABELS[policy.stage];
}

/** Stages the user can pick in policy / client UI. */
export function selectablePipelineStages(policy: Policy): Stage[] {
  if (policy.is_historical) return ["lapsed"];
  if (isInRetentionPipeline(policy)) {
    return ["upcoming", "contacted", "quoted", "retained", "lapsed"];
  }
  return ["active", "lapsed"];
}

export const RETENTION_KANBAN_COLUMN_HINTS: Partial<Record<Stage, string>> = {
  retained: "Renewed with you this term",
  lapsed: "Did not renew",
};

export const ACTIVE_CLIENTS_COLUMN_LABEL = "Active Clients";
export const ACTIVE_CLIENTS_COLUMN_HINT =
  "Current book — auto-enter pipeline at 60 days";

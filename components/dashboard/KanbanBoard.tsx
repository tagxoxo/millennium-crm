"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PolicyCard from "./PolicyCard";
import type { Policy, Stage } from "@/lib/types";
import { STAGES, STAGE_LABELS } from "@/lib/types";
import { getRenewalEmailStatus } from "@/lib/renewalReminders";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  policies: Policy[];
  recentReminderPolicyIds: string[];
  documentCounts?: Record<string, number>;
}

const POLICY_DRAG_TYPE = "application/x-millennium-policy-id";

export default function KanbanBoard({
  policies: initialPolicies,
  recentReminderPolicyIds,
  documentCounts = {},
}: KanbanBoardProps) {
  const router = useRouter();
  const [policies, setPolicies] = useState(initialPolicies);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  const reminderSet = useMemo(
    () => new Set(recentReminderPolicyIds),
    [recentReminderPolicyIds]
  );

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  const byStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = policies.filter((p) => p.stage === stage);
      return acc;
    },
    {} as Record<Stage, Policy[]>
  );

  async function movePolicy(policyId: string, newStage: Stage) {
    const policy = policies.find((p) => p.id === policyId);
    if (!policy || policy.stage === newStage) return;

    const previousStage = policy.stage;
    setPolicies((current) =>
      current.map((p) => (p.id === policyId ? { ...p, stage: newStage } : p))
    );

    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.refresh();
    } catch {
      setPolicies((current) =>
        current.map((p) =>
          p.id === policyId ? { ...p, stage: previousStage } : p
        )
      );
    }
  }

  function handleDragStart(policyId: string, event: React.DragEvent) {
    setDraggingId(policyId);
    event.dataTransfer.setData(POLICY_DRAG_TYPE, policyId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }

  function handleDragOver(stage: Stage, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDrop(stage: Stage, event: React.DragEvent) {
    event.preventDefault();
    const policyId = event.dataTransfer.getData(POLICY_DRAG_TYPE);
    setDragOverStage(null);
    setDraggingId(null);
    if (policyId) movePolicy(policyId, stage);
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <p className="text-xs text-gray-500 mb-3 md:hidden">
        Tap a client to open. Drag-and-drop works on desktop.
      </p>
      <div className="flex gap-3 md:gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-5">
        {STAGES.map((stage) => (
          <div
            key={stage}
            onDragOver={(event) => handleDragOver(stage, event)}
            onDragLeave={() =>
              setDragOverStage((current) => (current === stage ? null : current))
            }
            onDrop={(event) => handleDrop(stage, event)}
            className={cn(
              "w-64 md:w-auto flex-shrink-0 md:flex-shrink bg-navy-light border rounded-xl p-3 transition-colors",
              dragOverStage === stage
                ? "border-accent/60 bg-accent/5"
                : "border-navy-lighter"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="text-xs text-gray-500 bg-navy px-2 py-0.5 rounded-full">
                {byStage[stage].length}
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto min-h-[80px]">
              {byStage[stage].length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  {draggingId ? "Drop here" : "No policies"}
                </p>
              ) : (
                byStage[stage].map((policy) => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    documentCount={documentCounts[policy.id] ?? 0}
                    renewalEmailStatus={getRenewalEmailStatus(
                      policy,
                      reminderSet
                    )}
                    draggable
                    isDragging={draggingId === policy.id}
                    onDragStart={(event) => handleDragStart(policy.id, event)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

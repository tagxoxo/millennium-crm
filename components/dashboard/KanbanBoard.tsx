"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PolicyCard from "./PolicyCard";
import type { Policy, Stage } from "@/lib/types";
import { RETENTION_KANBAN_STAGES, STAGE_LABELS } from "@/lib/types";
import {
  ACTIVE_CLIENTS_COLUMN_HINT,
  ACTIVE_CLIENTS_COLUMN_LABEL,
  RETENTION_KANBAN_COLUMN_HINTS,
} from "@/lib/retentionPipeline";
import { getRenewalEmailStatus } from "@/lib/renewalReminders";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  policies: Policy[];
  activeClients: Policy[];
  recentReminderPolicyIds: string[];
  documentCounts?: Record<string, number>;
  clientPolicyCounts?: Record<string, number>;
}

const POLICY_DRAG_TYPE = "application/x-millennium-policy-id";

export default function KanbanBoard({
  policies: initialPolicies,
  activeClients: initialActiveClients,
  recentReminderPolicyIds,
  documentCounts = {},
  clientPolicyCounts = {},
}: KanbanBoardProps) {
  const router = useRouter();
  const [policies, setPolicies] = useState(initialPolicies);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | "active_clients" | null>(
    null
  );

  const reminderSet = useMemo(
    () => new Set(recentReminderPolicyIds),
    [recentReminderPolicyIds]
  );

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  const byStage = RETENTION_KANBAN_STAGES.reduce(
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

  function handleDragOver(
    target: Stage | "active_clients",
    event: React.DragEvent,
    droppable: boolean
  ) {
    if (!droppable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(target);
  }

  function handleDrop(stage: Stage, event: React.DragEvent) {
    event.preventDefault();
    const policyId = event.dataTransfer.getData(POLICY_DRAG_TYPE);
    setDragOverStage(null);
    setDraggingId(null);
    if (policyId) movePolicy(policyId, stage);
  }

  function renderPolicyCards(items: Policy[], draggable: boolean) {
    if (items.length === 0) {
      return (
        <p className="text-xs text-gray-500 text-center py-4">
          {draggingId ? "Drop here" : "No policies"}
        </p>
      );
    }

    return items.map((policy) => (
      <PolicyCard
        key={policy.id}
        policy={policy}
        documentCount={documentCounts[policy.id] ?? 0}
        clientPolicyCount={
          policy.client_id ? clientPolicyCounts[policy.client_id] ?? 0 : 0
        }
        renewalEmailStatus={getRenewalEmailStatus(policy, reminderSet)}
        showPipelineEntry={policy.stage === "active"}
        draggable={draggable}
        isDragging={draggingId === policy.id}
        onDragStart={(event) => handleDragStart(policy.id, event)}
        onDragEnd={handleDragEnd}
      />
    ));
  }

  function renderColumn(
    key: Stage | "active_clients",
    title: string,
    count: number,
    hint: string | undefined,
    items: Policy[],
    options: { droppable: boolean; draggable: boolean; accent?: boolean }
  ) {
    return (
      <div
        key={key}
        onDragOver={(event) => handleDragOver(key, event, options.droppable)}
        onDragLeave={() => setDragOverStage((current) => (current === key ? null : current))}
        onDrop={
          options.droppable && key !== "active_clients"
            ? (event) => handleDrop(key as Stage, event)
            : undefined
        }
        className={cn(
          "w-64 md:w-auto flex-shrink-0 md:flex-shrink bg-navy-light border rounded-xl p-3 transition-colors",
          dragOverStage === key && options.droppable
            ? "border-accent/60 bg-accent/5"
            : options.accent
              ? "border-emerald-500/25 bg-gradient-to-b from-emerald-500/5 to-navy-light"
              : "border-navy-lighter"
        )}
      >
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            <span className="text-xs text-gray-500 bg-navy px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
          {hint && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{hint}</p>}
        </div>
        <div className="space-y-2 max-h-[420px] overflow-y-auto min-h-[80px]">
          {renderPolicyCards(items, options.draggable)}
        </div>
      </div>
    );
  }

  const pipelineBeforeActive = RETENTION_KANBAN_STAGES.filter((s) => s !== "lapsed");
  const lapsedStage = "lapsed" as const;

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <p className="text-xs text-gray-500 mb-3 md:hidden">
        Tap a client to open. Drag-and-drop works on desktop.
      </p>
      <div className="flex gap-3 md:gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-6">
        {pipelineBeforeActive.map((stage) =>
          renderColumn(
            stage,
            STAGE_LABELS[stage],
            byStage[stage].length,
            RETENTION_KANBAN_COLUMN_HINTS[stage],
            byStage[stage],
            { droppable: true, draggable: true }
          )
        )}

        {renderColumn(
          "active_clients",
          ACTIVE_CLIENTS_COLUMN_LABEL,
          initialActiveClients.length,
          ACTIVE_CLIENTS_COLUMN_HINT,
          initialActiveClients,
          { droppable: false, draggable: false, accent: true }
        )}

        {renderColumn(
          lapsedStage,
          STAGE_LABELS[lapsedStage],
          byStage[lapsedStage].length,
          RETENTION_KANBAN_COLUMN_HINTS[lapsedStage],
          byStage[lapsedStage],
          { droppable: true, draggable: true }
        )}
      </div>
    </div>
  );
}

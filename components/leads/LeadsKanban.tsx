"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LeadCard from "./LeadCard";
import WinBackColumn from "./WinBackColumn";
import type { Lead, LeadStage, Policy } from "@/lib/types";
import { LEAD_PIPELINE_STAGES, LEAD_STAGE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { todayYmd } from "@/lib/winBack";

interface LeadsKanbanProps {
  leads: Lead[];
  winBackPolicies: Policy[];
}

const LEAD_DRAG_TYPE = "application/x-millennium-lead-id";

export default function LeadsKanban({
  leads: initialLeads,
  winBackPolicies,
}: LeadsKanbanProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const byStage = LEAD_PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.stage === stage);
      return acc;
    },
    {} as Record<LeadStage, Lead[]>
  );

  async function moveLead(leadId: string, newStage: LeadStage) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;

    const previousStage = lead.stage;
    const previousLeftOn = lead.left_on;
    const leftOn = newStage === "win_back" && !lead.left_on ? todayYmd() : lead.left_on;
    setLeads((current) =>
      current.map((l) =>
        l.id === leadId ? { ...l, stage: newStage, left_on: leftOn ?? l.left_on } : l
      )
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: newStage,
          ...(newStage === "win_back" && !lead.left_on ? { left_on: leftOn } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.refresh();
    } catch {
      setLeads((current) =>
        current.map((l) =>
          l.id === leadId
            ? { ...l, stage: previousStage, left_on: previousLeftOn }
            : l
        )
      );
    }
  }

  function handleDragStart(leadId: string, event: React.DragEvent) {
    setDraggingId(leadId);
    event.dataTransfer.setData(LEAD_DRAG_TYPE, leadId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }

  function handleDragOver(stage: LeadStage, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDrop(stage: LeadStage, event: React.DragEvent) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData(LEAD_DRAG_TYPE);
    setDragOverStage(null);
    setDraggingId(null);
    if (leadId) moveLead(leadId, stage);
  }

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <p className="text-xs text-gray-500 mb-3 md:hidden">
        Drag-and-drop works on desktop.
      </p>
      <div className="flex gap-3 md:gap-4 min-w-max items-start">
        {LEAD_PIPELINE_STAGES.map((stage) => (
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
                {LEAD_STAGE_LABELS[stage]}
              </h3>
              <span className="text-xs text-gray-500 bg-navy px-2 py-0.5 rounded-full">
                {byStage[stage].length}
              </span>
            </div>
            <div className="space-y-2 max-h-[480px] overflow-y-auto min-h-[80px]">
              {byStage[stage].length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  {draggingId ? "Drop here" : "No leads"}
                </p>
              ) : (
                byStage[stage].map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    draggable
                    isDragging={draggingId === lead.id}
                    onDragStart={(event) => handleDragStart(lead.id, event)}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        ))}
        <WinBackColumn
          policies={winBackPolicies}
          leads={leads.filter((lead) => lead.stage === "win_back")}
          draggingId={draggingId}
          dragOver={dragOverStage === "win_back"}
          onDragOver={(event) => handleDragOver("win_back", event)}
          onDragLeave={() =>
            setDragOverStage((current) => (current === "win_back" ? null : current))
          }
          onDrop={(event) => handleDrop("win_back", event)}
          onLeadDragStart={handleDragStart}
          onLeadDragEnd={handleDragEnd}
        />
      </div>
    </div>
  );
}

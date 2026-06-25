"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LeadCard from "./LeadCard";
import type { Lead, LeadStage } from "@/lib/types";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadsKanbanProps {
  leads: Lead[];
}

const LEAD_DRAG_TYPE = "application/x-millennium-lead-id";

export default function LeadsKanban({ leads: initialLeads }: LeadsKanbanProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const byStage = LEAD_STAGES.reduce(
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
    setLeads((current) =>
      current.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.refresh();
    } catch {
      setLeads((current) =>
        current.map((l) =>
          l.id === leadId ? { ...l, stage: previousStage } : l
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
      <div className="flex gap-3 md:gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-4">
        {LEAD_STAGES.map((stage) => (
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
      </div>
    </div>
  );
}

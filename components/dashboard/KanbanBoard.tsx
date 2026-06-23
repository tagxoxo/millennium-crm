import PolicyCard from "./PolicyCard";
import type { Policy, Stage } from "@/lib/types";
import { STAGES, STAGE_LABELS } from "@/lib/types";

interface KanbanBoardProps {
  policies: Policy[];
}

export default function KanbanBoard({ policies }: KanbanBoardProps) {
  const byStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = policies.filter((p) => p.stage === stage);
      return acc;
    },
    {} as Record<Stage, Policy[]>
  );

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-3 md:gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-5">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="w-64 md:w-auto flex-shrink-0 md:flex-shrink bg-navy-light border border-navy-lighter rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="text-xs text-gray-500 bg-navy px-2 py-0.5 rounded-full">
                {byStage[stage].length}
              </span>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {byStage[stage].length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No policies
                </p>
              ) : (
                byStage[stage].map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

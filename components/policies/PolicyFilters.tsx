"use client";

import type { Carrier, Stage } from "@/lib/types";
import { CARRIER_LABELS, STAGE_LABELS, STAGES } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SpanishFilter = "all" | "yes" | "no";

interface PolicyFiltersProps {
  carrier: Carrier | "all";
  stage: Stage | "all";
  spanish: SpanishFilter;
  onCarrierChange: (carrier: Carrier | "all") => void;
  onStageChange: (stage: Stage | "all") => void;
  onSpanishChange: (spanish: SpanishFilter) => void;
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
        active
          ? "bg-accent/20 text-accent border-accent/40"
          : "bg-navy border-navy-lighter text-gray-400 hover:text-white hover:border-gray-500"
      )}
    >
      {children}
    </button>
  );
}

export default function PolicyFilters({
  carrier,
  stage,
  spanish,
  onCarrierChange,
  onStageChange,
  onSpanishChange,
}: PolicyFiltersProps) {
  const carriers: (Carrier | "all")[] = [
    "all",
    "trexis",
    "progressive",
    "gainsco",
  ];

  const spanishOptions: { value: SpanishFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "yes", label: "Spanish" },
    { value: "no", label: "English" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-gray-500 mb-2">Carrier</p>
        <div className="flex flex-wrap gap-2">
          {carriers.map((c) => (
            <FilterButton
              key={c}
              active={carrier === c}
              onClick={() => onCarrierChange(c)}
            >
              {c === "all" ? "All" : CARRIER_LABELS[c]}
            </FilterButton>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Stage</p>
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={stage === "all"}
            onClick={() => onStageChange("all")}
          >
            All
          </FilterButton>
          {STAGES.map((s) => (
            <FilterButton
              key={s}
              active={stage === s}
              onClick={() => onStageChange(s)}
            >
              {STAGE_LABELS[s]}
            </FilterButton>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Language</p>
        <div className="flex flex-wrap gap-2">
          {spanishOptions.map((opt) => (
            <FilterButton
              key={opt.value}
              active={spanish === opt.value}
              onClick={() => onSpanishChange(opt.value)}
            >
              {opt.label}
            </FilterButton>
          ))}
        </div>
      </div>
    </div>
  );
}

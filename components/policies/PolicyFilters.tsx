"use client";

import type { Carrier, Stage, TermMonths } from "@/lib/types";
import { CARRIER_LABELS, CARRIERS, STAGE_LABELS, STAGES } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SpanishFilter = "all" | "yes" | "no";
export type CommercialFilter = "all" | "yes" | "no";
export type TermFilter = "all" | TermMonths;

interface PolicyFiltersProps {
  carrier: Carrier | "all";
  stage: Stage | "all";
  spanish: SpanishFilter;
  commercial: CommercialFilter;
  term: TermFilter;
  onCarrierChange: (carrier: Carrier | "all") => void;
  onStageChange: (stage: Stage | "all") => void;
  onSpanishChange: (spanish: SpanishFilter) => void;
  onCommercialChange: (commercial: CommercialFilter) => void;
  onTermChange: (term: TermFilter) => void;
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
  commercial,
  term,
  onCarrierChange,
  onStageChange,
  onSpanishChange,
  onCommercialChange,
  onTermChange,
}: PolicyFiltersProps) {
  const carriers: (Carrier | "all")[] = ["all", ...CARRIERS];

  const spanishOptions: { value: SpanishFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "yes", label: "Spanish" },
    { value: "no", label: "English" },
  ];

  const commercialOptions: { value: CommercialFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "yes", label: "Commercial" },
    { value: "no", label: "Personal" },
  ];

  const termOptions: { value: TermFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: 6, label: "6 month" },
    { value: 12, label: "12 month" },
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

      <div>
        <p className="text-xs text-gray-500 mb-2">Line</p>
        <div className="flex flex-wrap gap-2">
          {commercialOptions.map((opt) => (
            <FilterButton
              key={opt.value}
              active={commercial === opt.value}
              onClick={() => onCommercialChange(opt.value)}
            >
              {opt.label}
            </FilterButton>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Term</p>
        <div className="flex flex-wrap gap-2">
          {termOptions.map((opt) => (
            <FilterButton
              key={String(opt.value)}
              active={term === opt.value}
              onClick={() => onTermChange(opt.value)}
            >
              {opt.label}
            </FilterButton>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { Carrier } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const carrierStyles: Record<Carrier, string> = {
  trexis: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  progressive: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  gainsco: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  foremost: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  safeco: "bg-red-500/20 text-red-400 border-red-500/40",
  national_general: "bg-teal-500/20 text-teal-400 border-teal-500/40",
  bristol_west: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
  geico: "bg-sky-500/20 text-sky-400 border-sky-500/40",
  liberty_mutual_bop: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  liberty_mutual_surety_bond: "bg-lime-500/20 text-lime-400 border-lime-500/40",
  tapco: "bg-pink-500/20 text-pink-400 border-pink-500/40",
  cna: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  bruce_messier: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  mesa: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  acceptance_independent: "bg-violet-500/20 text-violet-400 border-violet-500/40",
};

interface CarrierBadgeProps {
  carrier: Carrier;
  className?: string;
}

export default function CarrierBadge({ carrier, className }: CarrierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        carrierStyles[carrier],
        className
      )}
    >
      {CARRIER_LABELS[carrier]}
    </span>
  );
}

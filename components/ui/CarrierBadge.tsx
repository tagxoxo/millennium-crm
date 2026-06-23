import type { Carrier } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

const carrierStyles: Record<Carrier, string> = {
  trexis: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  progressive: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  gainsco: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
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

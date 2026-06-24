"use client";

import Link from "next/link";
import { useRef } from "react";
import CarrierBadge from "@/components/ui/CarrierBadge";
import CommercialTag from "@/components/ui/CommercialTag";
import SpanishTag from "@/components/ui/SpanishTag";
import TermTag from "@/components/ui/TermTag";
import type { Policy } from "@/lib/types";
import {
  daysUntilRenewal,
  formatCurrency,
  normalizeTermMonths,
  renewalColor,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PolicyCardProps {
  policy: Policy;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export default function PolicyCard({
  policy,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: PolicyCardProps) {
  const days = daysUntilRenewal(policy.renewal_date);
  const didDrag = useRef(false);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-white text-sm leading-tight">
          {policy.client_name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {policy.commercial && <CommercialTag />}
          <TermTag termMonths={normalizeTermMonths(policy.term_months)} />
          {policy.spanish_speaker && <SpanishTag />}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <CarrierBadge carrier={policy.carrier} />
        <span className="text-sm text-gray-300">
          {formatCurrency(Number(policy.premium))}
        </span>
      </div>
      <p className={`text-xs mt-2 font-medium ${renewalColor(days)}`}>
        {days === 0
          ? "Renews today"
          : days < 0
            ? `${Math.abs(days)}d overdue`
            : `${days}d until renewal`}
      </p>
    </>
  );

  const cardClass = cn(
    "block bg-navy border border-navy-lighter rounded-lg p-3 hover:border-accent/50 transition-colors",
    draggable && "cursor-grab active:cursor-grabbing",
    isDragging && "opacity-40"
  );

  if (!draggable) {
    return (
      <Link href={`/policies/${policy.id}`} className={cardClass}>
        {content}
      </Link>
    );
  }

  return (
    <div
      draggable
      onDragStart={(event) => {
        didDrag.current = true;
        onDragStart?.(event);
      }}
      onDragEnd={() => {
        onDragEnd?.();
        setTimeout(() => {
          didDrag.current = false;
        }, 0);
      }}
      className={cardClass}
    >
      <Link
        href={`/policies/${policy.id}`}
        onClick={(event) => {
          if (didDrag.current) event.preventDefault();
        }}
        className="block"
        draggable={false}
      >
        {content}
      </Link>
    </div>
  );
}

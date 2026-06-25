"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RenewalEmailIcon from "./RenewalEmailIcon";
import type { RenewalEmailStatus } from "@/lib/renewalReminders";
import { useRef } from "react";
import CarrierBadge from "@/components/ui/CarrierBadge";
import CommercialTag from "@/components/ui/CommercialTag";
import SpanishTag from "@/components/ui/SpanishTag";
import StateTag from "@/components/ui/StateTag";
import TermTag from "@/components/ui/TermTag";
import type { Policy } from "@/lib/types";
import { DEFAULT_CLIENT_STATE, normalizeClientState } from "@/lib/types";
import { daysUntilPipelineEntry } from "@/lib/retentionPipeline";
import {
  daysUntilRenewal,
  formatCurrency,
  normalizeTermMonths,
  renewalColor,
} from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PolicyCardProps {
  policy: Policy;
  documentCount?: number;
  clientPolicyCount?: number;
  renewalEmailStatus?: RenewalEmailStatus;
  showPipelineEntry?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

function cardHref(policy: Policy): string {
  return policy.client_id
    ? `/clients/${policy.client_id}`
    : `/policies/${policy.id}`;
}

export default function PolicyCard({
  policy,
  documentCount = 0,
  clientPolicyCount = 0,
  renewalEmailStatus = "none",
  showPipelineEntry = false,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: PolicyCardProps) {
  const router = useRouter();
  const days = daysUntilRenewal(policy.renewal_date);
  const didDrag = useRef(false);
  const href = cardHref(policy);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-white text-sm leading-tight truncate">
            {policy.client_name}
          </p>
          {clientPolicyCount > 1 && (
            <span className="text-xs text-gray-500 mt-0.5 block">
              {clientPolicyCount} policies
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {documentCount > 0 && (
            <span
              className="text-xs text-gray-400"
              title={`${documentCount} document${documentCount === 1 ? "" : "s"}`}
            >
              📎 {documentCount}
            </span>
          )}
          <RenewalEmailIcon status={renewalEmailStatus} />
          {policy.commercial && <CommercialTag />}
          <TermTag termMonths={normalizeTermMonths(policy.term_months)} />
          {policy.spanish_speaker && <SpanishTag />}
          {normalizeClientState(policy.client_state) !== DEFAULT_CLIENT_STATE && (
            <StateTag state={normalizeClientState(policy.client_state)} />
          )}
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
      {showPipelineEntry && days > 0 && (
        <p className="text-[11px] text-emerald-400/90 mt-1">
          Pipeline in {daysUntilPipelineEntry(policy.renewal_date)}d
        </p>
      )}
    </>
  );

  const cardClass = cn(
    "block bg-navy border border-navy-lighter rounded-lg p-3 hover:border-accent/50 transition-colors",
    draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
    isDragging && "opacity-40"
  );

  function openProfile() {
    if (!didDrag.current) router.push(href);
  }

  if (!draggable) {
    return (
      <Link href={href} className={cardClass}>
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
      onClick={openProfile}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProfile();
        }
      }}
      role="link"
      tabIndex={0}
      className={cardClass}
    >
      {content}
    </div>
  );
}

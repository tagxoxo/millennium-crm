"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { Lead } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  initials: string;
  className?: string;
}

export function AgentAvatar({ initials, className }: AgentAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-bold border border-accent/40 shrink-0",
        className
      )}
      title={initials}
    >
      {initials.slice(0, 3).toUpperCase()}
    </span>
  );
}

interface LeadLabelTagProps {
  label: string;
}

export function LeadLabelTag({ label }: LeadLabelTagProps) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/40">
      {label}
    </span>
  );
}

interface LeadCardProps {
  lead: Lead;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export default function LeadCard({
  lead,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const router = useRouter();
  const didDrag = useRef(false);
  const href = `/leads/${lead.id}`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-white text-sm leading-tight">{lead.full_name}</p>
        <AgentAvatar initials={lead.agent_initials} />
      </div>
      {lead.phone ? (
        <a
          href={`tel:${lead.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-accent hover:underline block mb-1"
        >
          {lead.phone}
        </a>
      ) : (
        <p className="text-sm text-gray-500 mb-1">No phone</p>
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        <p className="text-xs text-gray-400">Added {formatDate(lead.created_at)}</p>
        {lead.label && <LeadLabelTag label={lead.label} />}
      </div>
    </>
  );

  const cardClass = cn(
    "bg-navy border border-navy-lighter rounded-lg p-3 hover:border-accent/50 transition-colors",
    draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
    isDragging && "opacity-40"
  );

  function openLead() {
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
      onClick={openLead}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLead();
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

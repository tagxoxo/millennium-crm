"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, Policy } from "@/lib/types";
import { CARRIER_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  leadLeftOn,
  policyLeftOn,
  policyWinBackReason,
  todayYmd,
  winBackCallDate,
  winBackTiming,
} from "@/lib/winBack";

interface WinBackColumnProps {
  policies: Policy[];
  leads: Lead[];
  draggingId: string | null;
  dragOver: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  onLeadDragStart: (leadId: string, event: React.DragEvent) => void;
  onLeadDragEnd: () => void;
}

const inputClass =
  "w-full px-3 py-2 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm";

function WinBackLeadCard({
  lead,
  callOn,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  callOn: string;
  isDragging: boolean;
  onDragStart: (leadId: string, event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  const didDrag = useRef(false);
  const left = leadLeftOn(lead);

  return (
    <div
      draggable
      onDragStart={(event) => {
        didDrag.current = true;
        onDragStart(lead.id, event);
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          didDrag.current = false;
        }, 0);
      }}
      onClick={() => {
        if (!didDrag.current) router.push(`/leads/${lead.id}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/leads/${lead.id}`);
        }
      }}
      role="link"
      tabIndex={0}
      className={cn(
        "bg-navy border border-amber-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <p className="font-medium text-white text-sm leading-tight">{lead.full_name}</p>
      {lead.phone ? (
        <a
          href={`tel:${lead.phone}`}
          onClick={(event) => event.stopPropagation()}
          className="text-sm text-accent hover:underline block mt-1"
        >
          {lead.phone}
        </a>
      ) : (
        <p className="text-sm text-gray-500 mt-1">No phone</p>
      )}
      <p className="text-xs text-gray-400 mt-2">Left {formatDate(left)}</p>
      <p className="text-xs text-amber-100 mt-1">Call around {formatDate(callOn)}</p>
      <div className="mt-2">
        <TimingPill callOn={callOn} />
      </div>
    </div>
  );
}

function TimingPill({ callOn }: { callOn: string }) {
  const timing = winBackTiming(callOn);
  if (timing.tone === "later") return null;

  return (
    <span
      className={cn(
        "inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold border",
        timing.tone === "ready"
          ? "bg-amber-400/20 text-amber-200 border-amber-400/50"
          : "bg-yellow-500/15 text-yellow-200 border-yellow-500/40"
      )}
    >
      {timing.label}
    </span>
  );
}

export default function WinBackColumn({
  policies: initialPolicies,
  leads,
  draggingId,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onLeadDragStart,
  onLeadDragEnd,
}: WinBackColumnProps) {
  const router = useRouter();
  const [policies, setPolicies] = useState(initialPolicies);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [leftOn, setLeftOn] = useState(todayYmd());
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setPolicies(initialPolicies);
  }, [initialPolicies]);

  const cards = [
    ...policies.map((policy) => ({
      kind: "policy" as const,
      id: policy.id,
      sort: winBackCallDate(policyLeftOn(policy)),
      policy,
    })),
    ...leads.map((lead) => ({
      kind: "lead" as const,
      id: lead.id,
      sort: winBackCallDate(leadLeftOn(lead)),
      lead,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  async function addPerson(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          stage: "win_back",
          left_on: leftOn,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add them");
      setFullName("");
      setPhone("");
      setLeftOn(todayYmd());
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add them");
    } finally {
      setSaving(false);
    }
  }

  async function removePolicy(policyId: string) {
    const previous = policies;
    setPolicies((current) => current.filter((policy) => policy.id !== policyId));
    setRemovingId(null);

    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ win_back_closed: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not remove them");
      router.refresh();
    } catch (err) {
      setPolicies(previous);
      setError(err instanceof Error ? err.message : "Could not remove them");
    }
  }

  return (
    <div
      id="win-back"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "w-72 flex-shrink-0 border rounded-xl p-3 transition-colors",
        dragOver
          ? "border-amber-300/70 bg-amber-400/10"
          : "border-amber-500/40 bg-amber-500/[0.06]"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-amber-100">Win Back</h3>
        <span className="text-xs text-amber-100/80 bg-navy px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>
      <p className="text-[11px] text-amber-100/70 leading-snug mb-3">
        People who cancelled or lapsed. Call about 6 months later, when their new
        policy is usually up for renewal.
      </p>

      <div className="space-y-2 max-h-[480px] overflow-y-auto min-h-[80px]">
        {cards.length === 0 ? (
          <p className="text-xs text-amber-100/60 text-center py-4">
            {draggingId ? "Drop here" : "No one to win back yet"}
          </p>
        ) : (
          cards.map((card) => {
            if (card.kind === "policy") {
              const policy = card.policy;
              const callOn = card.sort;
              return (
                <div
                  key={policy.id}
                  className="bg-navy border border-amber-500/30 rounded-lg p-3"
                >
                  <Link
                    href={`/policies/${policy.id}`}
                    className="font-medium text-white text-sm leading-tight hover:text-amber-100"
                  >
                    {policy.client_name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">
                    {CARRIER_LABELS[policy.carrier] ?? policy.carrier}
                  </p>
                  {policy.phone ? (
                    <a
                      href={`tel:${policy.phone}`}
                      className="text-sm text-accent hover:underline block mt-1"
                    >
                      {policy.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">No phone</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{policyWinBackReason(policy)}</p>
                  <p className="text-xs text-amber-100 mt-1">Call around {formatDate(callOn)}</p>
                  <div className="mt-2">
                    <TimingPill callOn={callOn} />
                  </div>
                  {removingId === policy.id ? (
                    <div className="mt-2 pt-2 border-t border-navy-lighter">
                      <p className="text-[11px] text-gray-400 mb-2">
                        Take them off this list? The policy stays in your book.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => removePolicy(policy.id)}
                          className="text-xs text-amber-200 hover:text-white"
                        >
                          Yes, remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemovingId(null)}
                          className="text-xs text-gray-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRemovingId(policy.id)}
                      className="mt-2 text-[11px] text-gray-500 hover:text-amber-200"
                    >
                      Remove from Win Back
                    </button>
                  )}
                </div>
              );
            }

            return (
              <WinBackLeadCard
                key={card.lead.id}
                lead={card.lead}
                callOn={card.sort}
                isDragging={draggingId === card.lead.id}
                onDragStart={onLeadDragStart}
                onDragEnd={onLeadDragEnd}
              />
            );
          })
        )}
      </div>

      {adding ? (
        <form onSubmit={addPerson} className="mt-3 space-y-2">
          <input
            type="text"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Name"
            className={inputClass}
          />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone"
            className={inputClass}
          />
          <div>
            <label className="block text-[11px] text-amber-100/70 mb-1">Date they left</label>
            <input
              type="date"
              required
              value={leftOn}
              onChange={(event) => setLeftOn(event.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-navy text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 w-full px-3 py-2 text-sm font-medium text-amber-100 border border-amber-500/40 hover:bg-amber-500/10 rounded-lg"
        >
          + Add someone who left
        </button>
      )}
    </div>
  );
}

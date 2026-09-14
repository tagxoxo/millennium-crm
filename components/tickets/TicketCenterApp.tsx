"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatVaDateTime,
  VA_CARRIER_LABELS,
  VA_REQUEST_TYPE_LABELS,
  VA_STATUS_LABELS,
  type VaRequest,
  type VaStatus,
} from "@/lib/va";

const STATUS_PILL: Record<VaStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  sent_to_agent: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  completed: "bg-green-500/15 text-green-300 border-green-500/40",
};

function StatusPill({ status }: { status: VaStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_PILL[status]}`}
    >
      {VA_STATUS_LABELS[status]}
    </span>
  );
}

function TicketCard({
  ticket,
  showComplete,
}: {
  ticket: VaRequest;
  showComplete: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to complete ticket.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-4 md:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-medium">{ticket.caller_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatVaDateTime(ticket.created_at)}
          </p>
        </div>
        <StatusPill status={ticket.status} />
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-gray-500 text-xs">Request type</dt>
          <dd className="text-gray-200">
            {VA_REQUEST_TYPE_LABELS[ticket.request_type] ?? ticket.request_type}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Carrier</dt>
          <dd className="text-gray-200">
            {ticket.carrier ? VA_CARRIER_LABELS[ticket.carrier] : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Policy #</dt>
          <dd className="text-gray-200">{ticket.policy_number || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Phone</dt>
          <dd className="text-gray-200">{ticket.phone_number || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Email</dt>
          <dd className="text-gray-200">{ticket.email || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Language</dt>
          <dd className="text-gray-200 capitalize">{ticket.language}</dd>
        </div>
        {ticket.completed_at && (
          <div>
            <dt className="text-gray-500 text-xs">Completed</dt>
            <dd className="text-gray-200">{formatVaDateTime(ticket.completed_at)}</dd>
          </div>
        )}
      </dl>

      {ticket.intake && ticket.intake.length > 0 && (
        <div className="border-t border-navy-lighter pt-3 space-y-1.5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Call script answers</p>
          {ticket.intake.map((item) => (
            <div key={item.label} className="text-sm">
              <p className="text-gray-500 text-xs">{item.label}</p>
              <p className="text-gray-200 whitespace-pre-wrap">{item.answer}</p>
            </div>
          ))}
        </div>
      )}

      {ticket.notes && (
        <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.notes}</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showComplete && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Completing..." : "Mark complete"}
        </button>
      )}
    </div>
  );
}

export default function TicketCenterApp({ tickets }: { tickets: VaRequest[] }) {
  const openTickets = tickets.filter((ticket) => ticket.status !== "completed");
  const completedTickets = tickets.filter((ticket) => ticket.status === "completed");

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Open tickets
          <span className="text-sm font-normal text-gray-400 ml-2">
            {openTickets.length}
          </span>
        </h2>
        {openTickets.length === 0 ? (
          <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
            <p className="text-gray-400">No open tickets. New VA submissions land here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} showComplete />
            ))}
          </div>
        )}
      </section>

      {completedTickets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Completed
            <span className="text-sm font-normal text-gray-400 ml-2">
              {completedTickets.length}
            </span>
          </h2>
          <div className="space-y-3">
            {completedTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} showComplete={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import StateTag from "@/components/ui/StateTag";
import type { ClientDocument } from "@/lib/clients";
import type { PolicyWithDocuments } from "@/lib/policyHistory";
import type { Carrier, Client, PolicyType, Stage, TermMonths } from "@/lib/types";
import {
  CARRIERS,
  CARRIER_LABELS,
  DEFAULT_CLIENT_STATE,
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  STAGE_LABELS,
  STAGES,
  TERM_LABELS,
  TERM_MONTHS,
  normalizeClientState,
} from "@/lib/types";
import {
  getPipelineStageLabel,
  getPipelineStageNote,
} from "@/lib/retentionPipeline";
import {
  daysUntilRenewal,
  formatCurrency,
  formatDate,
  formatFileSize,
  renewalColor,
} from "@/lib/utils";

function PolicyDocumentsList({ documents }: { documents: ClientDocument[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleView(doc: ClientDocument) {
    setLoadingId(doc.id);
    try {
      const res = await fetch("/api/documents/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      const json = await res.json();
      if (json.url) window.open(json.url, "_blank");
    } finally {
      setLoadingId(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-xs text-gray-500">No documents for this policy.</p>;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-navy-lighter">
      <p className="text-xs text-gray-500 font-medium">Documents</p>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-2 text-xs bg-navy/50 rounded-lg px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-gray-300 truncate">{doc.file_name}</p>
            <p className="text-gray-500">
              {formatFileSize(doc.file_size)} · {formatDate(doc.uploaded_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleView(doc)}
            disabled={loadingId === doc.id}
            className="shrink-0 text-accent hover:underline disabled:opacity-50"
          >
            {loadingId === doc.id ? "..." : "View"}
          </button>
        </div>
      ))}
    </div>
  );
}

function PolicyCard({ policy }: { policy: PolicyWithDocuments }) {
  const isPast = Boolean(policy.is_historical);
  const days = daysUntilRenewal(policy.renewal_date);

  return (
    <div
      className={`bg-navy-light border rounded-xl p-4 space-y-3 ${
        isPast ? "border-gray-600/50 opacity-90" : "border-navy-lighter"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white">
              {POLICY_TYPE_LABELS[policy.policy_type ?? "personal_auto"]}
            </p>
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-400 border border-gray-600/50">
                Past Policy
              </span>
            )}
            {normalizeClientState(policy.client_state) !== DEFAULT_CLIENT_STATE && (
              <StateTag state={normalizeClientState(policy.client_state)} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <CarrierBadge carrier={policy.carrier} />
            {policy.prior_carrier && (
              <>
                <span className="text-xs text-gray-500">from</span>
                <CarrierBadge carrier={policy.prior_carrier} />
              </>
            )}
          </div>
        </div>
        {!isPast && (
          <p className="text-lg font-bold text-white">
            {formatCurrency(Number(policy.premium))}
          </p>
        )}
      </div>

      <dl className="text-sm space-y-1">
        <div className="flex justify-between">
          <dt className="text-gray-500">Policy #</dt>
          <dd className="text-gray-300">{policy.policy_number || "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Effective</dt>
          <dd className="text-gray-300">
            {policy.effective_date ? formatDate(policy.effective_date) : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Expiration</dt>
          <dd className="text-gray-300">{formatDate(policy.renewal_date)}</dd>
        </div>
        {!isPast && (
          <>
            <div className="flex justify-between">
              <dt className="text-gray-500">Pipeline stage</dt>
              <dd className="text-gray-300">{getPipelineStageLabel(policy)}</dd>
            </div>
            {getPipelineStageNote(policy) && (
              <p className="text-xs text-gray-500">{getPipelineStageNote(policy)}</p>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Days to expiration</dt>
              <dd className={`font-medium ${renewalColor(days)}`}>
                {days === 0
                  ? "Today"
                  : days < 0
                    ? `${Math.abs(days)}d overdue`
                    : `${days}d away`}
              </dd>
            </div>
          </>
        )}
      </dl>

      <PolicyDocumentsList documents={policy.documents} />

      {!isPast && (
        <Link
          href={`/policies/${policy.id}`}
          className="inline-block text-sm text-accent hover:underline"
        >
          View Policy →
        </Link>
      )}
    </div>
  );
}

interface ClientPolicyCardsProps {
  policies: PolicyWithDocuments[];
}

export function ClientPolicyCards({ policies }: ClientPolicyCardsProps) {
  const current = policies.filter((p) => !p.is_historical);
  const past = policies.filter((p) => p.is_historical);

  if (policies.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No policies linked yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {current.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Current Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {current.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Past Policies</h3>
          <p className="text-xs text-gray-500 mb-3">
            Previous carriers and archived policy documents — not shown on the dashboard pipeline.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {past.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

interface AddClientPolicyFormProps {
  client: Client;
}

export default function AddClientPolicyForm({ client }: AddClientPolicyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [carrier, setCarrier] = useState<Carrier>("trexis");
  const [policyType, setPolicyType] = useState<PolicyType>("personal_auto");
  const [premium, setPremium] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [stage, setStage] = useState<Stage>("active");
  const [termMonths, setTermMonths] = useState<TermMonths>(12);
  const [policyNumber, setPolicyNumber] = useState("");
  const [commercial, setCommercial] = useState(false);
  const [isHistorical, setIsHistorical] = useState(false);
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier,
          policy_type: policyType,
          premium: isHistorical ? "0" : premium,
          effective_date: effectiveDate || null,
          renewal_date: renewalDate,
          stage: isHistorical ? "lapsed" : stage,
          term_months: termMonths,
          policy_number: policyNumber,
          commercial,
          is_historical: isHistorical,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add policy");

      if (isHistorical) {
        router.refresh();
        setOpen(false);
      } else {
        router.push(`/policies/${json.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add policy.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        + Add Policy
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/60 overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Add Policy for {client.full_name}
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_historical"
            checked={isHistorical}
            onChange={(e) => setIsHistorical(e.target.checked)}
            className="rounded border-navy-lighter"
          />
          <label htmlFor="is_historical" className="text-sm text-gray-300">
            Past policy (previous carrier — not active)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Policy Type</label>
            <select
              value={policyType}
              onChange={(e) => setPolicyType(e.target.value as PolicyType)}
              className={inputClass}
            >
              {POLICY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {POLICY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as Carrier)}
              className={inputClass}
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {CARRIER_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {!isHistorical && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Premium</label>
              <input
                type="number"
                min="0"
                required
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Effective Date</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              {isHistorical ? "Expiration Date" : "Expiration Date *"}
            </label>
            <input
              type="date"
              required
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className={inputClass}
            />
          </div>
          {!isHistorical && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
                className={inputClass}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Term</label>
            <select
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value) as TermMonths)}
              className={inputClass}
            >
              {TERM_MONTHS.map((t) => (
                <option key={t} value={t}>
                  {TERM_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Policy Number</label>
            <input
              type="text"
              value={policyNumber}
              onChange={(e) => setPolicyNumber(e.target.value)}
              className={inputClass}
            />
          </div>
          {!isHistorical && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="add_policy_commercial"
                checked={commercial}
                onChange={(e) => setCommercial(e.target.checked)}
                className="rounded border-navy-lighter"
              />
              <label htmlFor="add_policy_commercial" className="text-sm text-gray-300">
                Commercial policy
              </label>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Adding..." : isHistorical ? "Add Past Policy" : "Add Policy"}
        </button>
      </form>
    </div>
  );
}

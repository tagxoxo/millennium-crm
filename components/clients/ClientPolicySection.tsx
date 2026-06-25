"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import type { Carrier, Client, PolicyType, Stage, TermMonths } from "@/lib/types";
import {
  CARRIERS,
  CARRIER_LABELS,
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  STAGE_LABELS,
  STAGES,
  TERM_LABELS,
  TERM_MONTHS,
} from "@/lib/types";
import {
  daysUntilRenewal,
  formatCurrency,
  renewalColor,
} from "@/lib/utils";

interface ClientPolicyCardsProps {
  policies: Array<{
    id: string;
    carrier: Carrier;
    policy_number: string | null;
    renewal_date: string;
    premium: number;
    stage: Stage;
    policy_type: PolicyType;
  }>;
}

export function ClientPolicyCards({ policies }: ClientPolicyCardsProps) {
  if (policies.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No policies linked yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {policies.map((policy) => {
        const days = daysUntilRenewal(policy.renewal_date);
        return (
          <div
            key={policy.id}
            className="bg-navy-light border border-navy-lighter rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {POLICY_TYPE_LABELS[policy.policy_type]}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <CarrierBadge carrier={policy.carrier} />
                </div>
              </div>
              <p className="text-lg font-bold text-white">
                {formatCurrency(Number(policy.premium))}
              </p>
            </div>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Policy #</dt>
                <dd className="text-gray-300">{policy.policy_number || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Stage</dt>
                <dd className="text-gray-300">{STAGE_LABELS[policy.stage]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Renewal</dt>
                <dd className={`font-medium ${renewalColor(days)}`}>
                  {days === 0
                    ? "Today"
                    : days < 0
                      ? `${Math.abs(days)}d overdue`
                      : `${days}d away`}
                </dd>
              </div>
            </dl>
            <Link
              href={`/policies/${policy.id}`}
              className="inline-block text-sm text-accent hover:underline"
            >
              View Policy →
            </Link>
          </div>
        );
      })}
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
  const [renewalDate, setRenewalDate] = useState("");
  const [stage, setStage] = useState<Stage>("upcoming");
  const [termMonths, setTermMonths] = useState<TermMonths>(12);
  const [policyNumber, setPolicyNumber] = useState("");
  const [commercial, setCommercial] = useState(false);
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
          premium,
          renewal_date: renewalDate,
          stage,
          term_months: termMonths,
          policy_number: policyNumber,
          commercial,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add policy");

      router.push(`/policies/${json.id}`);
      router.refresh();
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">Renewal Date</label>
            <input
              type="date"
              required
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              className={inputClass}
            />
          </div>
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
          {saving ? "Adding..." : "Add Policy"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Carrier, Policy, PolicyType, Stage, TermMonths } from "@/lib/types";
import { CARRIERS, CARRIER_LABELS, POLICY_TYPE_LABELS, POLICY_TYPES, STAGE_LABELS, STAGES, TERM_LABELS, TERM_MONTHS } from "@/lib/types";

interface EditPolicyFormProps {
  policy: Policy;
}

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

async function savePolicy(policyId: string, data: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`/api/policies/${policyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Save failed");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function deletePolicy(policyId: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`/api/policies/${policyId}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Delete failed");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

export default function EditPolicyForm({ policy }: EditPolicyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState(policy.client_name);
  const [carrier, setCarrier] = useState<Carrier>(policy.carrier);
  const [priorCarrier, setPriorCarrier] = useState<Carrier | "">(
    policy.prior_carrier ?? ""
  );
  const [premium, setPremium] = useState(String(policy.premium));
  const [renewalDate, setRenewalDate] = useState(policy.renewal_date);
  const [phone, setPhone] = useState(policy.phone ?? "");
  const [email, setEmail] = useState(policy.email ?? "");
  const [policyNumber, setPolicyNumber] = useState(policy.policy_number ?? "");
  const [clientSince, setClientSince] = useState(policy.client_since ?? "");
  const [spanishSpeaker, setSpanishSpeaker] = useState(policy.spanish_speaker);
  const [commercial, setCommercial] = useState(policy.commercial ?? false);
  const [termMonths, setTermMonths] = useState<TermMonths>(policy.term_months ?? 12);
  const [policyType, setPolicyType] = useState<PolicyType>(
    policy.policy_type ?? "personal_auto"
  );
  const [notes, setNotes] = useState(policy.notes ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await savePolicy(policy.id, {
        client_name: clientName,
        carrier,
        prior_carrier: priorCarrier || null,
        premium,
        renewal_date: renewalDate,
        phone,
        email,
        policy_number: policyNumber,
        client_since: clientSince || null,
        spanish_speaker: spanishSpeaker,
        commercial,
        term_months: termMonths,
        policy_type: policyType,
        notes,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Save timed out. Check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deletePolicy(policy.id);
      router.push("/policies");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Delete timed out. Check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Delete failed.");
      }
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        Edit Client Info
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Edit Client Info</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirmingDelete(false);
            setError(null);
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Client Name</label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={inputClass}
          />
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
          <label className="block text-xs text-gray-400 mb-1">Prior Carrier</label>
          <select
            value={priorCarrier}
            onChange={(e) => setPriorCarrier(e.target.value as Carrier | "")}
            className={inputClass}
          >
            <option value="">None</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {CARRIER_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Annual Premium</label>
          <input
            type="number"
            min="0"
            step="1"
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
          <label className="block text-xs text-gray-400 mb-1">Policy Term</label>
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

        <div>
          <label className="block text-xs text-gray-400 mb-1">Policy Number</label>
          <input
            type="text"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Client Since</label>
          <input
            type="date"
            value={clientSince}
            onChange={(e) => setClientSince(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="931-555-0100"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="spanish_speaker"
            checked={spanishSpeaker}
            onChange={(e) => setSpanishSpeaker(e.target.checked)}
            className="rounded border-navy-lighter"
          />
          <label htmlFor="spanish_speaker" className="text-sm text-gray-300">
            Spanish speaker
          </label>
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="commercial"
            checked={commercial}
            onChange={(e) => setCommercial(e.target.checked)}
            className="rounded border-navy-lighter"
          />
          <label htmlFor="commercial" className="text-sm text-gray-300">
            Commercial policy
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-navy-lighter">
        <button
          type="submit"
          disabled={saving || deleting}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={saving || deleting}
            className="px-5 py-2.5 text-red-400 border border-red-500/40 hover:bg-red-500/10 font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Delete Client
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-sm text-red-300">
              Permanently delete {policy.client_name}?
            </p>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

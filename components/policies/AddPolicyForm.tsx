"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DuplicateClientWarning from "@/components/clients/DuplicateClientWarning";
import type { Carrier, Client, PolicyType, Stage, TermMonths, ClientState } from "@/lib/types";
import {
  CARRIERS,
  CARRIER_LABELS,
  CLIENT_STATE_LABELS,
  CLIENT_STATES,
  DEFAULT_CLIENT_STATE,
  POLICY_TYPE_LABELS,
  POLICY_TYPES,
  STAGE_LABELS,
  STAGES,
  TERM_LABELS,
  TERM_MONTHS,
  normalizeClientState,
} from "@/lib/types";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

async function createPolicy(data: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) {
      if (json.duplicate) {
        return { duplicate: true as const, matches: json.matches as Client[] };
      }
      throw new Error(json.error ?? "Failed to add client");
    }
    return json as { id: string; client_id?: string };
  } finally {
    clearTimeout(timeout);
  }
}

export default function AddPolicyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<Client[] | null>(null);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const [clientName, setClientName] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("trexis");
  const [priorCarrier, setPriorCarrier] = useState<Carrier | "">("");
  const [premium, setPremium] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [stage, setStage] = useState<Stage>("upcoming");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [clientSince, setClientSince] = useState("");
  const [spanishSpeaker, setSpanishSpeaker] = useState(false);
  const [clientState, setClientState] = useState<ClientState>(DEFAULT_CLIENT_STATE);
  const [commercial, setCommercial] = useState(false);
  const [termMonths, setTermMonths] = useState<TermMonths>(12);
  const [policyType, setPolicyType] = useState<PolicyType>("personal_auto");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setClientName("");
    setCarrier("trexis");
    setPriorCarrier("");
    setPremium("");
    setEffectiveDate("");
    setRenewalDate("");
    setStage("upcoming");
    setPhone("");
    setEmail("");
    setPolicyNumber("");
    setClientSince("");
    setSpanishSpeaker(false);
    setClientState(DEFAULT_CLIENT_STATE);
    setCommercial(false);
    setTermMonths(12);
    setPolicyType("personal_auto");
    setNotes("");
    setError(null);
    setDuplicateMatches(null);
    setLinkedClientId(null);
    setForceCreate(false);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  function buildPayload(extra: Record<string, unknown> = {}) {
    return {
      client_name: clientName,
      carrier,
      prior_carrier: priorCarrier || null,
      premium,
      effective_date: effectiveDate || null,
      renewal_date: renewalDate,
      stage,
      phone,
      email,
      policy_number: policyNumber,
      client_since: clientSince || null,
      spanish_speaker: spanishSpeaker,
      client_state: clientState,
      commercial,
      term_months: termMonths,
      policy_type: policyType,
      notes,
      client_id: linkedClientId,
      force_create: forceCreate,
      ...extra,
    };
  }

  async function submitPolicy(extra: Record<string, unknown> = {}) {
    setSaving(true);
    setError(null);

    try {
      const result = await createPolicy(buildPayload(extra));
      if ("duplicate" in result && result.duplicate) {
        setDuplicateMatches(result.matches);
        setSaving(false);
        return;
      }
      const success = result as { id: string };
      router.push(`/policies/${success.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to add client.");
      }
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitPolicy();
  }

  function handleLinkExisting(clientId: string) {
    setLinkedClientId(clientId);
    setDuplicateMatches(null);
    submitPolicy({ client_id: clientId });
  }

  function handleCreateNew() {
    setForceCreate(true);
    setLinkedClientId(null);
    setDuplicateMatches(null);
    submitPolicy({ force_create: true });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        + Add Client
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 md:pt-16 bg-black/60 overflow-y-auto"
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add New Client</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        {duplicateMatches && (
          <DuplicateClientWarning
            matches={duplicateMatches}
            onLink={handleLinkExisting}
            onCreateNew={handleCreateNew}
            onCancel={() => setDuplicateMatches(null)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Client Name *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="John Smith"
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
            <label className="block text-xs text-gray-400 mb-1">Carrier *</label>
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
            <label className="block text-xs text-gray-400 mb-1">Annual Premium *</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              placeholder="1200"
              className={inputClass}
            />
          </div>

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
            <label className="block text-xs text-gray-400 mb-1">Expiration Date *</label>
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

          <div>
            <label className="block text-xs text-gray-400 mb-1">State</label>
            <select
              value={clientState}
              onChange={(e) => setClientState(e.target.value as ClientState)}
              className={inputClass}
            >
              {CLIENT_STATES.map((state) => (
                <option key={state} value={state}>
                  {CLIENT_STATE_LABELS[state]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="add_spanish_speaker"
              checked={spanishSpeaker}
              onChange={(e) => setSpanishSpeaker(e.target.checked)}
              className="rounded border-navy-lighter"
            />
            <label htmlFor="add_spanish_speaker" className="text-sm text-gray-300">
              Spanish speaker
            </label>
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="add_commercial"
              checked={commercial}
              onChange={(e) => setCommercial(e.target.checked)}
              className="rounded border-navy-lighter"
            />
            <label htmlFor="add_commercial" className="text-sm text-gray-300">
              Commercial policy
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional"
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
          {saving ? "Adding..." : "Add Client"}
        </button>
      </form>
    </div>
  );
}

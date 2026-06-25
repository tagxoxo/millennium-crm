"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientState, Policy } from "@/lib/types";
import {
  CLIENT_STATE_LABELS,
  CLIENT_STATES,
  DEFAULT_CLIENT_STATE,
  normalizeClientState,
} from "@/lib/types";

interface EditClientInfoFormProps {
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

export default function EditClientInfoForm({ policy }: EditClientInfoFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState(policy.client_name);
  const [phone, setPhone] = useState(policy.phone ?? "");
  const [email, setEmail] = useState(policy.email ?? "");
  const [clientAddress, setClientAddress] = useState(policy.client_address ?? "");
  const [clientSince, setClientSince] = useState(policy.client_since ?? "");
  const [spanishSpeaker, setSpanishSpeaker] = useState(policy.spanish_speaker);
  const [clientState, setClientState] = useState<ClientState>(
    normalizeClientState(policy.client_state)
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await savePolicy(policy.id, {
        client_name: clientName,
        phone,
        email,
        client_address: clientAddress || null,
        client_since: clientSince || null,
        spanish_speaker: spanishSpeaker,
        client_state: clientState,
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto px-5 py-2.5 bg-navy-light border border-navy-lighter hover:border-accent/50 text-white font-medium rounded-lg transition-colors"
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Edit Client Info</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Contact details for this client
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-sm text-gray-400 hover:text-white shrink-0"
        >
          Cancel
        </button>
      </div>

      {policy.client_id && (
        <Link
          href={`/clients/${policy.client_id}`}
          className="text-sm text-accent hover:underline inline-block"
        >
          Open full client profile →
        </Link>
      )}

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

        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Address</label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder="Street, City, State ZIP"
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
            id="edit_client_spanish_speaker"
            checked={spanishSpeaker}
            onChange={(e) => setSpanishSpeaker(e.target.checked)}
            className="rounded border-navy-lighter"
          />
          <label htmlFor="edit_client_spanish_speaker" className="text-sm text-gray-300">
            Spanish speaker
          </label>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Client Info"}
      </button>
    </form>
  );
}

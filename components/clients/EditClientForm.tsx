"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SpanishTag from "@/components/ui/SpanishTag";
import type { Client } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface EditClientFormProps {
  client: Client;
}

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

async function saveClient(clientId: string, data: object) {
  const res = await fetch(`/api/clients/${clientId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Save failed");
}

export default function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(client.full_name);
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [address, setAddress] = useState(client.address ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(client.date_of_birth ?? "");
  const [isSpanishSpeaker, setIsSpanishSpeaker] = useState(client.is_spanish_speaker);
  const [notes, setNotes] = useState(client.notes ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await saveClient(client.id, {
        full_name: fullName,
        email,
        phone,
        address,
        date_of_birth: dateOfBirth || null,
        is_spanish_speaker: isSpanishSpeaker,
        notes,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
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
        Edit Client
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
            setError(null);
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="client_spanish"
            checked={isSpanishSpeaker}
            onChange={(e) => setIsSpanishSpeaker(e.target.checked)}
            className="rounded border-navy-lighter"
          />
          <label htmlFor="client_spanish" className="text-sm text-gray-300">
            Spanish speaker
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

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

interface ClientInfoCardProps {
  client: Client;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {client.full_name}
            </h2>
            {client.is_spanish_speaker && <SpanishTag />}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 mb-1">Email</dt>
          <dd className="text-white">
            {client.email ? (
              <a href={`mailto:${client.email}`} className="text-accent hover:underline">
                {client.email}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Phone</dt>
          <dd className="text-white">
            {client.phone ? (
              <a href={`tel:${client.phone}`} className="text-accent hover:underline">
                {client.phone}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gray-500 mb-1">Address</dt>
          <dd className="text-white">{client.address || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Date of Birth</dt>
          <dd className="text-white">
            {client.date_of_birth ? formatDate(client.date_of_birth) : "—"}
          </dd>
        </div>
        {client.notes && (
          <div className="sm:col-span-2">
            <dt className="text-gray-500 mb-1">Notes</dt>
            <dd className="text-gray-300 whitespace-pre-wrap">{client.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

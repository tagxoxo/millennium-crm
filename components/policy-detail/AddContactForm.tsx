"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { ContactType } from "@/lib/types";

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

interface AddContactFormProps {
  policyId: string;
}

export default function AddContactForm({ policyId }: AddContactFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactType, setContactType] = useState<ContactType>("call");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error: insertError } = await supabase.from("contact_log").insert({
      policy_id: policyId,
      contact_type: contactType,
      outcome: outcome.trim() || null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOutcome("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full md:w-auto px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        + Log Contact
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">New Contact Entry</h3>

      <div>
        <label htmlFor="contact_type" className="block text-xs text-gray-400 mb-1">
          Contact Type
        </label>
        <select
          id="contact_type"
          value={contactType}
          onChange={(e) => setContactType(e.target.value as ContactType)}
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent"
        >
          {CONTACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="outcome" className="block text-xs text-gray-400 mb-1">
          Outcome
        </label>
        <input
          id="outcome"
          type="text"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Left voicemail, Quoted $1200"
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-xs text-gray-400 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Additional details..."
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Contact"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2.5 border border-navy-lighter text-gray-400 hover:text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

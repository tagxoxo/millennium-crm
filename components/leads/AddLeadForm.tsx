"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStage } from "@/lib/types";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/lib/types";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

async function createLead(data: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to add lead");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

export default function AddLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<LeadStage>("new");
  const [label, setLabel] = useState("");

  function resetForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setStage("new");
    setLabel("");
    setError(null);
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createLead({
        full_name: fullName,
        phone,
        email,
        stage,
        label: label || null,
      });
      handleClose();
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to add lead.");
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
        className="shrink-0 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        + Add Lead
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
        className="w-full max-w-lg bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add New Lead</h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
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
            <label className="block text-xs text-gray-400 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as LeadStage)}
              className={inputClass}
            >
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Demo, Referral, etc."
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Lead"}
        </button>
      </form>
    </div>
  );
}

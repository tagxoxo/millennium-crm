"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AgentAvatar, LeadLabelTag } from "@/components/leads/LeadCard";
import type { Lead, LeadStage } from "@/lib/types";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface EditLeadFormProps {
  lead: Lead;
}

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

async function saveLead(leadId: string, data: object) {
  const res = await fetch(`/api/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Save failed");
}

async function deleteLead(leadId: string) {
  const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Delete failed");
}

export default function EditLeadForm({ lead }: EditLeadFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(lead.full_name);
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [label, setLabel] = useState(lead.label ?? "");
  const [agentInitials, setAgentInitials] = useState(lead.agent_initials);
  const [notes, setNotes] = useState(lead.notes ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await saveLead(lead.id, {
        full_name: fullName,
        phone,
        email,
        stage,
        label: label || null,
        agent_initials: agentInitials,
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

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deleteLead(lead.id);
      router.push("/leads");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
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
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        Edit Lead
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Edit Lead</h3>
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
          <label className="block text-xs text-gray-400 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
          <label className="block text-xs text-gray-400 mb-1">Agent initials</label>
          <input
            type="text"
            value={agentInitials}
            onChange={(e) => setAgentInitials(e.target.value)}
            maxLength={4}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Referral, Demo, etc."
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
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
            Delete Lead
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <p className="text-sm text-red-300">
              Permanently delete {lead.full_name}?
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

interface LeadInfoCardProps {
  lead: Lead;
}

export function LeadInfoCard({ lead }: LeadInfoCardProps) {
  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {lead.full_name}
          </h2>
          <AgentAvatar initials={lead.agent_initials} />
          {lead.label && <LeadLabelTag label={lead.label} />}
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-accent/20 text-accent border border-accent/40 font-medium">
          {LEAD_STAGE_LABELS[lead.stage]}
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 mb-1">Phone</dt>
          <dd className="text-white">
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="text-accent hover:underline">
                {lead.phone}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Email</dt>
          <dd className="text-white">
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                {lead.email}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Added</dt>
          <dd className="text-white">{formatDate(lead.created_at)}</dd>
        </div>
        {lead.notes && (
          <div className="sm:col-span-2">
            <dt className="text-gray-500 mb-1">Notes</dt>
            <dd className="text-gray-300 whitespace-pre-wrap">{lead.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface CancelPolicyControlProps {
  policyId: string;
  cancelledOn?: string | null;
}

function todayYmd(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CancelPolicyControl({
  policyId,
  cancelledOn,
}: CancelPolicyControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState((cancelledOn ?? "").slice(0, 10) || todayYmd());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string | null) {
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      setError("Enter the date they cancelled.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled_on: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-white">Cancelled mid-term</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Use this when the client cancelled before the expiration date. The premium
          comes off your book. Lapsed is only for someone who did not renew.
        </p>
      </div>

      {cancelledOn && !open ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-red-300">Cancelled {formatDate(cancelledOn)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDate(cancelledOn.slice(0, 10));
                setOpen(true);
              }}
              disabled={saving}
              className="px-3 py-2 text-sm text-gray-300 hover:text-white"
            >
              Change date
            </button>
            <button
              type="button"
              onClick={() => save(null)}
              disabled={saving}
              className="px-3 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Undo"}
            </button>
          </div>
        </div>
      ) : open ? (
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label htmlFor={`cancelled-on-${policyId}`} className="block text-xs text-gray-400 mb-1">
              Date cancelled
            </label>
            <input
              id={`cancelled-on-${policyId}`}
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent text-sm disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={() => save(date)}
            disabled={saving || !date}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save cancellation"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={saving}
            className="px-3 py-2.5 text-sm text-gray-400 hover:text-white"
          >
            Never mind
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2.5 text-sm font-medium text-red-300 border border-red-500/40 hover:bg-red-500/10 rounded-lg"
        >
          Mark policy cancelled
        </button>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

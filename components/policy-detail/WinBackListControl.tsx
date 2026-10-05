"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface WinBackListControlProps {
  policyId: string;
  closed: boolean;
  callOn: string;
}

export default function WinBackListControl({
  policyId,
  closed,
  callOn,
}: WinBackListControlProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setClosed(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ win_back_closed: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
      <p className="text-sm font-medium text-white">Win Back</p>
      {closed ? (
        <p className="text-sm text-gray-400">
          Taken off the Win Back list in Sales Center.
        </p>
      ) : (
        <p className="text-sm text-amber-100/90">
          On the Win Back list. Call around {formatDate(callOn)} — about 6 months
          after they left.
        </p>
      )}
      <div className="flex flex-wrap gap-3 items-center">
        <Link href="/leads#win-back" className="text-sm text-accent hover:underline">
          Open Win Back
        </Link>
        <button
          type="button"
          disabled={saving}
          onClick={() => setClosed(!closed)}
          className="text-sm text-gray-400 hover:text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : closed ? "Put back on Win Back" : "Remove from Win Back"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}

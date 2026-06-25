"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPipelineStageNote,
  isInRetentionPipeline,
  selectablePipelineStages,
} from "@/lib/retentionPipeline";
import type { Policy, Stage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";

interface StageDropdownProps {
  policyId: string;
  policy: Pick<Policy, "renewal_date" | "stage" | "is_historical">;
}

export default function StageDropdown({ policyId, policy }: StageDropdownProps) {
  const router = useRouter();
  const [stage, setStage] = useState(policy.stage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inPipeline = isInRetentionPipeline(policy);
  const stageNote = getPipelineStageNote(policy as Policy);
  const options = selectablePipelineStages(policy as Policy);

  useEffect(() => {
    setStage(policy.stage);
  }, [policy.stage]);

  async function handleChange(newStage: Stage) {
    setStage(newStage);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setStage(policy.stage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-5">
      <label htmlFor="stage" className="block text-sm font-medium text-gray-300 mb-2">
        Pipeline Stage
      </label>
      <div className="flex items-center gap-3">
        <select
          id="stage"
          value={stage}
          onChange={(e) => handleChange(e.target.value as Stage)}
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50"
        >
          {options.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        {saving && <span className="text-xs text-gray-400">Saving...</span>}
      </div>
      {inPipeline ? (
        <p className="text-xs text-gray-500 mt-2">
          In renewal pipeline — expiration within 60 days.
        </p>
      ) : policy.stage === "active" ? (
        <p className="text-xs text-gray-500 mt-2">
          Active client on your book — not in the renewal pipeline yet.
        </p>
      ) : stageNote ? (
        <p className="text-xs text-gray-400 mt-2">{stageNote}</p>
      ) : policy.stage === "lapsed" ? (
        <p className="text-xs text-gray-500 mt-2">Policy lapsed — not in renewal pipeline.</p>
      ) : (
        <p className="text-xs text-gray-500 mt-2">
          Active policy — not in renewal pipeline yet.
        </p>
      )}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}

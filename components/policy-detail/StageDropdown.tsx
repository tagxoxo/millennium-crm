"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Stage } from "@/lib/types";
import { STAGES, STAGE_LABELS } from "@/lib/types";

interface StageDropdownProps {
  policyId: string;
  currentStage: Stage;
}

export default function StageDropdown({
  policyId,
  currentStage,
}: StageDropdownProps) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newStage: Stage) {
    setStage(newStage);
    setSaving(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error: updateError } = await supabase
      .from("policies")
      .update({ stage: newStage })
      .eq("id", policyId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      setStage(currentStage);
      return;
    }

    router.refresh();
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
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        {saving && (
          <span className="text-xs text-gray-400">Saving...</span>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { CHANNEL_LABELS, TRIGGER_LABELS } from "@/lib/automations";
import type { Automation, Channel } from "@/lib/types";

interface AutomationCardProps {
  automation: Automation;
}

export default function AutomationCard({ automation }: AutomationCardProps) {
  const router = useRouter();
  const [active, setActive] = useState(automation.active);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const newActive = !active;
    setActive(newActive);
    setSaving(true);

    const supabase = getSupabaseBrowser();
    const { error } = await supabase
      .from("automations")
      .update({ active: newActive })
      .eq("id", automation.id);

    setSaving(false);
    if (error) {
      setActive(!newActive);
      return;
    }
    router.refresh();
  }

  const triggerLabel =
    automation.trigger_type === "days_before_renewal" && automation.trigger_days
      ? `${automation.trigger_days} days before renewal`
      : TRIGGER_LABELS[automation.trigger_type];

  return (
    <div
      className={`bg-navy-light border rounded-xl p-5 transition-colors ${
        active ? "border-navy-lighter" : "border-navy-lighter/50 opacity-75"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white leading-tight">
            {automation.name}
          </h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded bg-navy border border-navy-lighter text-gray-400">
              {triggerLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent">
              {CHANNEL_LABELS[automation.channel as Channel]}
            </span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={handleToggle}
          disabled={saving}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
            active ? "bg-accent" : "bg-navy-lighter"
          } ${saving ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              active ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      <p className="text-sm text-gray-400 line-clamp-3 whitespace-pre-wrap">
        {automation.template_text}
      </p>
    </div>
  );
}

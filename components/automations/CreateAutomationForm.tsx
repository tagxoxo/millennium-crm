"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { CHANNEL_LABELS, TEMPLATE_VARIABLES, TRIGGER_LABELS } from "@/lib/automations";
import type { Channel, TriggerType } from "@/lib/types";

const TRIGGER_TYPES: TriggerType[] = [
  "days_before_renewal",
  "non_pay",
  "post_retain",
  "lapsed",
];

const CHANNELS: Channel[] = ["whatsapp", "sms", "email"];

export default function CreateAutomationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("days_before_renewal");
  const [triggerDays, setTriggerDays] = useState("30");
  const [channel, setChannel] = useState<Channel>("sms");
  const [templateText, setTemplateText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = getSupabaseBrowser();
    const { error: insertError } = await supabase.from("automations").insert({
      name: name.trim(),
      trigger_type: triggerType,
      trigger_days:
        triggerType === "days_before_renewal"
          ? parseInt(triggerDays, 10) || null
          : null,
      channel,
      template_text: templateText.trim(),
      active: true,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName("");
    setTriggerType("days_before_renewal");
    setTriggerDays("30");
    setChannel("sms");
    setTemplateText("");
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
        + New Automation
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-white">Create Automation</h3>

      <div>
        <label htmlFor="auto_name" className="block text-xs text-gray-400 mb-1">
          Name
        </label>
        <input
          id="auto_name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 14-Day Renewal Reminder"
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="trigger_type" className="block text-xs text-gray-400 mb-1">
            Trigger Type
          </label>
          <select
            id="trigger_type"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent"
          >
            {TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {triggerType === "days_before_renewal" && (
          <div>
            <label htmlFor="trigger_days" className="block text-xs text-gray-400 mb-1">
              Days Before Renewal
            </label>
            <input
              id="trigger_days"
              type="number"
              min="1"
              required
              value={triggerDays}
              onChange={(e) => setTriggerDays(e.target.value)}
              className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent"
            />
          </div>
        )}

        <div>
          <label htmlFor="channel" className="block text-xs text-gray-400 mb-1">
            Channel
          </label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="template" className="block text-xs text-gray-400 mb-1">
          Message Template
        </label>
        <textarea
          id="template"
          required
          rows={4}
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          placeholder="Hi {{client_name}}, your {{carrier}} policy renews on {{renewal_date}}..."
          className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Variables: {TEMPLATE_VARIABLES.join(", ")}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Automation"}
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

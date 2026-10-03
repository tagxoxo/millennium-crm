"use client";

import { useEffect, useMemo, useState } from "react";
import type { Carrier, Policy } from "@/lib/types";
import { CARRIER_LABELS, CARRIERS } from "@/lib/types";
import { formatCurrency, formatDate, normalizeTermMonths } from "@/lib/utils";
import { buildRenewedNotes, nextRenewalDate, termLabel } from "@/lib/retainPolicy";

interface RetainPolicyDialogProps {
  policy: Policy;
  onCancel: () => void;
  onSaved: (result: { id: string; rewritten: boolean }) => void;
}

export default function RetainPolicyDialog({
  policy,
  onCancel,
  onSaved,
}: RetainPolicyDialogProps) {
  const [premium, setPremium] = useState(String(policy.premium ?? ""));
  const [rewritten, setRewritten] = useState(false);
  const [carrier, setCarrier] = useState<Carrier | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newRenewalDate = useMemo(() => nextRenewalDate(policy), [policy]);
  const carrierChoices = CARRIERS.filter((item) => item !== policy.carrier);
  const parsedPremium = parseFloat(premium);
  const premiumIsValid = Number.isFinite(parsedPremium) && parsedPremium >= 0;

  const preview =
    premiumIsValid
      ? buildRenewedNotes({
          oldRenewalDate: policy.renewal_date,
          newRenewalDate,
          oldPremium: Number(policy.premium) || 0,
          newPremium: parsedPremium,
          oldCarrier: rewritten ? policy.carrier : null,
          newCarrier: rewritten && carrier ? carrier : null,
        })
      : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!premiumIsValid) {
      setError("Enter the new renewal premium.");
      return;
    }
    if (rewritten && !carrier) {
      setError("Choose the new carrier.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policy.id}/retain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premium: parsedPremium,
          rewritten,
          carrier: rewritten ? carrier : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      onSaved({ id: json.id, rewritten: Boolean(json.rewritten) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 md:pt-16 bg-black/60 overflow-y-auto"
      onClick={() => {
        if (!saving) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-navy-light border border-navy-lighter rounded-xl shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="retain-policy-title"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-navy-lighter">
          <div>
            <h2 id="retain-policy-title" className="text-lg font-semibold text-white">
              Retain {policy.client_name}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Current premium {formatCurrency(Number(policy.premium) || 0)} with{" "}
              {CARRIER_LABELS[policy.carrier]}. The next expiration will be{" "}
              {formatDate(newRenewalDate)} ({termLabel(normalizeTermMonths(policy.term_months))}{" "}
              after {formatDate(policy.renewal_date)}).
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="text-gray-400 hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="retain-premium" className="block text-sm text-gray-300 mb-1">
              New renewal premium
            </label>
            <input
              id="retain-premium"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={premium}
              onChange={(event) => setPremium(event.target.value)}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50"
              required
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={rewritten}
              onChange={(event) => {
                setRewritten(event.target.checked);
                if (!event.target.checked) setCarrier("");
              }}
              disabled={saving}
              className="mt-0.5"
            />
            <span>Rewritten with a different carrier?</span>
          </label>

          {rewritten && (
            <div>
              <label htmlFor="retain-carrier" className="block text-sm text-gray-300 mb-1">
                New carrier
              </label>
              <select
                id="retain-carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value as Carrier)}
                disabled={saving}
                className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50"
                required
              >
                <option value="">Choose carrier</option>
                {carrierChoices.map((item) => (
                  <option key={item} value={item}>
                    {CARRIER_LABELS[item]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                The current policy is saved as a past policy. Add the new policy number on the
                new policy page after this saves.
              </p>
            </div>
          )}

          {preview && (
            <p className="text-sm text-gray-400 bg-navy border border-navy-lighter rounded-lg px-3 py-2">
              {preview}
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-navy-lighter">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 text-sm text-gray-300 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm renewal"}
          </button>
        </div>
      </form>
    </div>
  );
}

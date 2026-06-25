"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FlagNonPayButtonProps {
  policyId: string;
  email: string | null;
}

export default function FlagNonPayButton({ policyId, email }: FlagNonPayButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasEmail = Boolean(email?.trim());

  async function handleClick() {
    if (!hasEmail) {
      setError("Add an email in Edit Client Info before sending a non-pay alert.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policyId}/non-pay-alert`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to send alert");
      }

      setToast("Non-pay alert email sent");
      router.refresh();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send alert");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={sending || !hasEmail}
        title={
          hasEmail
            ? "Send non-pay alert email via Make.com"
            : "Add client email in Edit Client Info first"
        }
        className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? "Sending..." : "Flag Non-Pay"}
      </button>

      {!hasEmail && (
        <p className="text-amber-400 text-xs mt-1 sm:text-right">
          Email required — use Edit Client Info above
        </p>
      )}

      {error && <p className="text-red-400 text-sm mt-2 sm:text-right">{error}</p>}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-green-600 text-white text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

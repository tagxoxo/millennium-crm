"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FlagNonPayButtonProps {
  policyId: string;
}

export default function FlagNonPayButton({ policyId }: FlagNonPayButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
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
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {sending ? "Sending..." : "Flag Non-Pay"}
      </button>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-green-600 text-white text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}

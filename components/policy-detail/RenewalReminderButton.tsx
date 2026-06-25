"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EmailPreview {
  subject: string;
  html: string;
}

interface RenewalReminderButtonProps {
  policyId: string;
  email: string | null;
  language: string;
  preview: EmailPreview;
}

export default function RenewalReminderButton({
  policyId,
  email,
  language,
  preview,
}: RenewalReminderButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hasEmail = Boolean(email?.trim());

  function handleClose() {
    if (sending) return;
    setOpen(false);
    setError(null);
  }

  async function handleSend() {
    if (!hasEmail) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/policies/${policyId}/renewal-reminder`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to send email");
      }

      setOpen(false);
      setToast("45-day renewal reminder sent");
      if (json.logWarning) {
        setError(json.logWarning);
      }
      router.refresh();
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={!hasEmail}
        title={
          hasEmail
            ? "Preview and send 45-day renewal reminder email"
            : "Add client email in Edit Client Info first"
        }
        className="w-full sm:w-auto px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send Renewal Reminder
      </button>

      {!hasEmail && (
        <p className="text-amber-400 text-xs mt-1 sm:text-right">
          Email required — use Edit Client Info above
        </p>
      )}

      {error && !open && (
        <p className="text-red-400 text-sm mt-2 sm:text-right">{error}</p>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-green-600 text-white text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 md:pt-16 bg-black/60 overflow-y-auto"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-2xl bg-navy-light border border-navy-lighter rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="renewal-preview-title"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-navy-lighter">
              <div>
                <h2
                  id="renewal-preview-title"
                  className="text-lg font-semibold text-white"
                >
                  Preview renewal reminder
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Review the email below before sending.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="text-gray-400 hover:text-white text-xl leading-none px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500 mb-1">To</dt>
                  <dd className="text-white">{email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">Language</dt>
                  <dd className="text-white">{language}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500 mb-1">Subject</dt>
                  <dd className="text-white font-medium">{preview.subject}</dd>
                </div>
              </dl>

              <div>
                <p className="text-gray-500 text-sm mb-2">Message</p>
                <div
                  className="bg-white rounded-lg p-4 max-h-[50vh] overflow-y-auto text-[#222]"
                  dangerouslySetInnerHTML={{ __html: preview.html }}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-5 border-t border-navy-lighter">
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="px-5 py-2.5 rounded-lg border border-navy-lighter text-gray-300 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

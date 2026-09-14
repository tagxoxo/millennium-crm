"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatVaTime,
  VA_CARRIER_LABELS,
  VA_CARRIERS,
  VA_REQUEST_TYPE_LABELS,
  VA_REQUEST_TYPES,
  type VaCarrier,
  type VaLanguage,
  type VaRequest,
  type VaRequestType,
  type VaStatus,
} from "@/lib/va";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

const STATUS_PILL: Record<VaStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  sent_to_agent: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  completed: "bg-green-500/15 text-green-300 border-green-500/40",
};

const STATUS_LABEL: Record<VaStatus, string> = {
  pending: "Pending",
  sent_to_agent: "Sent to agent",
  completed: "Completed",
};

function StatusPill({ status }: { status: VaStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_PILL[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function VaPortal({
  requests,
  vaEmail,
}: {
  requests: VaRequest[];
  vaEmail: string;
}) {
  const router = useRouter();
  const [callerName, setCallerName] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<VaRequestType | "">("");
  const [carrier, setCarrier] = useState<VaCarrier | "">("");
  const [language, setLanguage] = useState<VaLanguage>("english");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function clearForm() {
    setCallerName("");
    setPolicyNumber("");
    setPhoneNumber("");
    setEmail("");
    setRequestType("");
    setCarrier("");
    setLanguage("english");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/va/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_name: callerName,
          policy_number: policyNumber,
          phone_number: phoneNumber,
          email,
          request_type: requestType,
          carrier,
          language,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit request.");

      clearForm();
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/va/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">VA Desk</h1>
            <p className="text-gray-400 text-sm mt-1">Log calls and track today&apos;s queue</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{vaEmail}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-white mt-1"
            >
              Sign out
            </button>
          </div>
        </div>

        <section className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white mb-4">New Request</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Caller name *</label>
                <input
                  type="text"
                  required
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="Maria Lopez"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Policy number</label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Phone number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="931-555-0100"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Request type *</label>
                <select
                  required
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as VaRequestType | "")}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {VA_REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {VA_REQUEST_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Carrier *</label>
                <select
                  required
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value as VaCarrier | "")}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {VA_CARRIERS.map((value) => (
                    <option key={value} value={value}>
                      {VA_CARRIER_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="block text-xs text-gray-400 mb-1">Language</p>
              <div className="inline-flex rounded-lg border border-navy-lighter overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLanguage("english")}
                  className={`px-4 py-2 text-sm ${
                    language === "english"
                      ? "bg-accent text-white"
                      : "bg-navy text-gray-400 hover:text-white"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("spanish")}
                  className={`px-4 py-2 text-sm ${
                    language === "spanish"
                      ? "bg-accent text-white"
                      : "bg-navy text-gray-400 hover:text-white"
                  }`}
                >
                  Spanish
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What does the caller need?"
                className={`${inputClass} resize-y min-h-[80px]`}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && (
              <p className="text-green-400 text-sm">Request submitted.</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit request"}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            Today&apos;s queue
            <span className="text-sm font-normal text-gray-400 ml-2">
              {requests.length} {requests.length === 1 ? "request" : "requests"}
            </span>
          </h2>

          {requests.length === 0 ? (
            <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
              <p className="text-gray-400">No requests yet today.</p>
            </div>
          ) : (
            <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-lighter text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Caller name</th>
                    <th className="px-4 py-3 font-medium">Policy #</th>
                    <th className="px-4 py-3 font-medium">Request type</th>
                    <th className="px-4 py-3 font-medium">Carrier</th>
                    <th className="px-4 py-3 font-medium">Language</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-navy-lighter/50 last:border-0"
                    >
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatVaTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {row.caller_name}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {row.policy_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {VA_REQUEST_TYPE_LABELS[row.request_type] ?? row.request_type}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {row.carrier ? VA_CARRIER_LABELS[row.carrier] : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">
                        {row.language}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                        {row.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatVaTime,
  VA_CARRIER_LABELS,
  VA_CARRIERS,
  VA_FORM_REQUEST_TYPES,
  VA_REQUEST_TYPE_LABELS,
  type VaCarrier,
  type VaFormRequestType,
  type VaLanguage,
  type VaRequest,
  type VaStatus,
} from "@/lib/va";
import VaCallScript from "./VaCallScript";
import {
  answersFromRecord,
  emptyScriptAnswers,
  VA_POLICY_SCRIPT_ITEMS,
  VA_QUOTE_SCRIPT_ITEMS,
  type VaIntakeAnswer,
  type VaScriptTab,
} from "@/lib/vaScript";

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
  const [requestType, setRequestType] = useState<VaFormRequestType | "">("");
  const [carrier, setCarrier] = useState<VaCarrier | "">("");
  const [language, setLanguage] = useState<VaLanguage>("english");
  const [notes, setNotes] = useState("");
  const [scriptTab, setScriptTab] = useState<VaScriptTab>("greeting");
  const [paymentCarrier, setPaymentCarrier] = useState<"trexis" | "progressive" | null>(
    null
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [policyAnswers, setPolicyAnswers] = useState(() =>
    emptyScriptAnswers(VA_POLICY_SCRIPT_ITEMS)
  );
  const [quoteAnswers, setQuoteAnswers] = useState(() =>
    emptyScriptAnswers(VA_QUOTE_SCRIPT_ITEMS)
  );
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
    setScriptTab("greeting");
    setPaymentCarrier(null);
    setPaymentNotes("");
    setPolicyAnswers(emptyScriptAnswers(VA_POLICY_SCRIPT_ITEMS));
    setQuoteAnswers(emptyScriptAnswers(VA_QUOTE_SCRIPT_ITEMS));
  }

  function guessCarrier(value: string): VaCarrier | "" {
    const text = value.toLowerCase();
    if (text.includes("trexis")) return "trexis";
    if (text.includes("progressive")) return "progressive";
    if (text.includes("safeway")) return "safeway";
    return "";
  }

  function handleScriptTab(tab: VaScriptTab) {
    setScriptTab(tab);
    if (tab === "payment") setRequestType("payment");
    if (tab === "policy") setRequestType("policy_change");
    if (tab === "quote") setRequestType("new_quote");
  }

  function handleRequestType(value: VaFormRequestType | "") {
    setRequestType(value);
    if (value === "payment") setScriptTab("payment");
    if (value === "policy_change") setScriptTab("policy");
    if (value === "new_quote") setScriptTab("quote");
  }

  function handlePaymentCarrier(value: "trexis" | "progressive") {
    setPaymentCarrier(value);
    setCarrier(value);
  }

  function handlePolicyAnswer(key: string, value: string) {
    setPolicyAnswers((current) => ({ ...current, [key]: value }));
    if (key === "full_name") setCallerName(value);
    if (key === "policy_number") setPolicyNumber(value);
    if (key === "phone_number") setPhoneNumber(value);
    if (key === "carrier") {
      const matched = guessCarrier(value);
      if (matched) setCarrier(matched);
    }
  }

  function handleQuoteAnswer(key: string, value: string) {
    setQuoteAnswers((current) => ({ ...current, [key]: value }));
    if (key === "full_name") setCallerName(value);
    if (key === "phone_number") setPhoneNumber(value);
  }

  function buildIntake(): VaIntakeAnswer[] {
    if (requestType === "payment") {
      const rows: VaIntakeAnswer[] = [];
      if (paymentCarrier) {
        rows.push({
          label: "Carrier",
          answer: VA_CARRIER_LABELS[paymentCarrier],
        });
      }
      if (paymentNotes.trim()) {
        rows.push({ label: "Payment notes", answer: paymentNotes.trim() });
      }
      return rows;
    }
    if (requestType === "policy_change") {
      return answersFromRecord(VA_POLICY_SCRIPT_ITEMS, policyAnswers);
    }
    if (requestType === "new_quote") {
      return answersFromRecord(VA_QUOTE_SCRIPT_ITEMS, quoteAnswers);
    }
    return [];
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
          intake: buildIntake(),
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
      <div className="lg:pr-[320px]">
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
                  onChange={(e) =>
                    handleRequestType(e.target.value as VaFormRequestType | "")
                  }
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {VA_FORM_REQUEST_TYPES.map((type) => (
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
                placeholder="Anything extra — answers from the Call Script are saved with the ticket"
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
      <VaCallScript
        tab={scriptTab}
        onTabChange={handleScriptTab}
        paymentCarrier={paymentCarrier}
        onPaymentCarrier={handlePaymentCarrier}
        paymentNotes={paymentNotes}
        onPaymentNotes={setPaymentNotes}
        policyAnswers={policyAnswers}
        onPolicyAnswer={handlePolicyAnswer}
        quoteAnswers={quoteAnswers}
        onQuoteAnswer={handleQuoteAnswer}
      />
    </div>
  );
}

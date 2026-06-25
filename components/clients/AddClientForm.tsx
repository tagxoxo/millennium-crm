"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DuplicateClientWarning from "@/components/clients/DuplicateClientWarning";
import { readJsonResponse } from "@/lib/apiClient";
import type { ExtractedPolicyInfo } from "@/lib/extractPolicyInfo";
import type { Carrier, Client, ClientState } from "@/lib/types";
import { CARRIERS, CARRIER_LABELS, CLIENT_STATE_LABELS, CLIENT_STATES, DEFAULT_CLIENT_STATE } from "@/lib/types";

const inputClass =
  "w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm";

const ACCEPT = ".pdf,application/pdf";
const MAX_BYTES = 20 * 1024 * 1024;

export default function AddClientForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<Client[] | null>(null);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [forceCreate, setForceCreate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSpanishSpeaker, setIsSpanishSpeaker] = useState(false);
  const [clientState, setClientState] = useState<ClientState>(DEFAULT_CLIENT_STATE);
  const [notes, setNotes] = useState("");
  const [carrier, setCarrier] = useState<Carrier>("trexis");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [premium, setPremium] = useState("");
  const [termMonths, setTermMonths] = useState<6 | 12>(12);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIsSpanishSpeaker(false);
    setClientState(DEFAULT_CLIENT_STATE);
    setNotes("");
    setCarrier("trexis");
    setEffectiveDate("");
    setRenewalDate("");
    setPolicyNumber("");
    setPremium("");
    setTermMonths(12);
    setSelectedFile(null);
    setError(null);
    setScanWarning(null);
    setDuplicateMatches(null);
    setLinkedClientId(null);
    setForceCreate(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  function applyExtracted(extracted: ExtractedPolicyInfo, inferredCarrier?: Carrier | null) {
    if (extracted.client_name) setFullName(extracted.client_name);
    if (extracted.client_email) setEmail(extracted.client_email);
    if (extracted.client_phone) setPhone(extracted.client_phone);
    if (extracted.client_address) setAddress(extracted.client_address);
    if (extracted.policy_number) setPolicyNumber(extracted.policy_number);
    if (extracted.effective_date) setEffectiveDate(extracted.effective_date);
    if (extracted.renewal_date) setRenewalDate(extracted.renewal_date);
    if (extracted.premium) setPremium(extracted.premium);
    if (extracted.term_months) setTermMonths(extracted.term_months);
    if (inferredCarrier) setCarrier(inferredCarrier);
  }

  async function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) {
      setError("File must be under 20MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setScanWarning(null);
    setScanning(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-policy-info", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{
        extracted?: ExtractedPolicyInfo;
        carrier?: Carrier | null;
        warning?: string;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Could not scan document.");
      }

      if (json.extracted) {
        applyExtracted(json.extracted, json.carrier ?? null);
      }
      if (json.warning) setScanWarning(json.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not scan document.");
    } finally {
      setScanning(false);
    }
  }

  async function submitClient(extra: Record<string, string | boolean> = {}) {
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("full_name", fullName);
      if (email) formData.append("email", email);
      if (phone) formData.append("phone", phone);
      if (address) formData.append("address", address);
      formData.append("is_spanish_speaker", String(isSpanishSpeaker));
      formData.append("client_state", clientState);
      if (notes) formData.append("notes", notes);
      if (carrier) formData.append("carrier", carrier);
      if (effectiveDate) formData.append("effective_date", effectiveDate);
      if (renewalDate) formData.append("renewal_date", renewalDate);
      if (policyNumber) formData.append("policy_number", policyNumber);
      if (premium) formData.append("premium", premium);
      formData.append("term_months", String(termMonths));
      if (linkedClientId) formData.append("client_id", linkedClientId);
      if (forceCreate) formData.append("force_create", "true");
      if (selectedFile) formData.append("file", selectedFile);

      for (const [key, value] of Object.entries(extra)) {
        formData.set(key, String(value));
      }

      const res = await fetch("/api/clients/onboard", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{
        id?: string;
        policy_id?: string;
        duplicate?: boolean;
        matches?: Client[];
        error?: string;
      }>(res);

      if (!res.ok) {
        if (json.duplicate && json.matches) {
          setDuplicateMatches(json.matches);
          return;
        }
        throw new Error(json.error ?? "Failed to create client.");
      }

      handleClose();
      router.push(`/clients/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (selectedFile && !renewalDate) {
      setError("Expiration date is required when uploading a policy document.");
      return;
    }
    await submitClient();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
      >
        + Add Client
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 overflow-y-auto"
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-5 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Client</h2>
            <p className="text-xs text-gray-500 mt-1">
              Upload a policy PDF to auto-fill client info and create their first policy.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-navy-lighter bg-navy/40 p-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Policy document (PDF)</p>
              <p className="text-xs text-gray-500 mt-1">
                Scans for name, address, email, phone, policy number, and renewal date.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="shrink-0 px-4 py-2.5 bg-navy border border-navy-lighter hover:border-accent/50 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {scanning ? "Scanning…" : selectedFile ? "Change File" : "Upload PDF"}
            </button>
          </div>
          {selectedFile && (
            <p className="text-xs text-gray-400 truncate">Selected: {selectedFile.name}</p>
          )}
          {scanWarning && (
            <p className="text-xs text-amber-300">{scanWarning} You can fill in fields manually.</p>
          )}
        </div>

        {duplicateMatches && (
          <DuplicateClientWarning
            matches={duplicateMatches}
            onLink={(clientId) => {
              setLinkedClientId(clientId);
              setDuplicateMatches(null);
              submitClient({ client_id: clientId });
            }}
            onCreateNew={() => {
              setForceCreate(true);
              setDuplicateMatches(null);
              submitClient({ force_create: "true" });
            }}
            onCancel={() => setDuplicateMatches(null)}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">State</label>
            <select
              value={clientState}
              onChange={(e) => setClientState(e.target.value as ClientState)}
              className={inputClass}
            >
              {CLIENT_STATES.map((state) => (
                <option key={state} value={state}>
                  {CLIENT_STATE_LABELS[state]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="add_client_spanish"
              checked={isSpanishSpeaker}
              onChange={(e) => setIsSpanishSpeaker(e.target.checked)}
              className="rounded border-navy-lighter"
            />
            <label htmlFor="add_client_spanish" className="text-sm text-gray-300">
              Spanish speaker
            </label>
          </div>
        </div>

        {selectedFile && (
          <div className="border-t border-navy-lighter pt-4 space-y-4">
            <h3 className="text-sm font-medium text-white">First Policy (from document)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Carrier *</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value as Carrier)}
                  className={inputClass}
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {CARRIER_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Expiration Date *</label>
                <input
                  type="date"
                  required={Boolean(selectedFile)}
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Premium</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={premium}
                  onChange={(e) => setPremium(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Term</label>
                <select
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value) as 6 | 12)}
                  className={inputClass}
                >
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving || scanning}
          className="w-full px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Creating…" : selectedFile ? "Create Client & Policy" : "Create Client"}
        </button>
      </form>
    </div>
  );
}

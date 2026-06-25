"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/apiClient";
import type { ExtractedPolicyInfo } from "@/lib/extractPolicyInfo";
import { hasAnyExtractedInfo } from "@/lib/extractPolicyInfo";
import { canAutoApplyExtracted } from "@/lib/extractPolicyApply";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_BYTES = 20 * 1024 * 1024;

type ConflictField = "policy_number" | "client_address" | "client_email" | "client_phone";

const FIELD_LABELS: Record<ConflictField, string> = {
  policy_number: "policy number",
  client_address: "address",
  client_email: "email",
  client_phone: "phone",
};

export interface ClientUploadPolicyOption {
  id: string;
  label: string;
  policy_number: string | null;
  client_address: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientDocumentUploadProps {
  policies: ClientUploadPolicyOption[];
}

export default function ClientDocumentUpload({ policies }: ClientDocumentUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState(policies[0]?.id ?? "");
  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractWarning, setExtractWarning] = useState<string | null>(null);
  const [extractFields, setExtractFields] = useState<
    Pick<ExtractedPolicyInfo, ConflictField>
  >({
    policy_number: null,
    client_address: null,
    client_email: null,
    client_phone: null,
  });
  const [overwrites, setOverwrites] = useState<Set<ConflictField>>(new Set());
  const [savingExtract, setSavingExtract] = useState(false);
  const [targetPolicyId, setTargetPolicyId] = useState<string | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function getPolicyById(id: string | null): ClientUploadPolicyOption | undefined {
    if (!id) return undefined;
    return policies.find((p) => p.id === id);
  }

  function getExistingValue(field: ConflictField): string | null {
    const policy = getPolicyById(targetPolicyId);
    if (!policy) return null;
    const map: Record<ConflictField, keyof ClientUploadPolicyOption> = {
      policy_number: "policy_number",
      client_address: "client_address",
      client_email: "email",
      client_phone: "phone",
    };
    const value = policy[map[field]];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function hasConflict(field: ConflictField): boolean {
    const existing = getExistingValue(field);
    const incoming = extractFields[field]?.trim();
    return Boolean(existing && incoming && existing !== incoming);
  }

  function openUploadFlow() {
    if (policies.length === 0) {
      showToast("Add a policy first, then you can upload documents.", "error");
      return;
    }
    if (policies.length === 1) {
      fileInputRef.current?.click();
      return;
    }
    setSelectedPolicyId(policies[0].id);
    setPickerOpen(true);
  }

  async function applyExtractedToPolicy(
    policyId: string,
    fields: Pick<ExtractedPolicyInfo, ConflictField>,
    overwriteFields: ConflictField[] = []
  ) {
    const res = await fetch(`/api/policies/${policyId}/apply-extracted-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields,
        overwrites: overwriteFields,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Save failed");
  }

  async function handleUpload(file: File, policyId: string) {
    if (file.size > MAX_BYTES) {
      setError("File must be under 20MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setPickerOpen(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("policy_id", policyId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{
        error?: string;
        uploaded?: boolean;
        extracted?: ExtractedPolicyInfo | null;
        warning?: string;
        target_policy_id?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }

      const appliedPolicyId = json.target_policy_id ?? policyId;
      setTargetPolicyId(appliedPolicyId);
      showToast("Document uploaded");

      if (json.extracted && hasAnyExtractedInfo(json.extracted)) {
        const fields: Pick<ExtractedPolicyInfo, ConflictField> = {
          policy_number: json.extracted.policy_number ?? "",
          client_address: json.extracted.client_address ?? "",
          client_email: json.extracted.client_email ?? "",
          client_phone: json.extracted.client_phone ?? "",
        };
        const policy = getPolicyById(appliedPolicyId);
        const policyValues = {
          policy_number: policy?.policy_number ?? null,
          client_address: policy?.client_address ?? null,
          email: policy?.email ?? null,
          phone: policy?.phone ?? null,
        };

        if (canAutoApplyExtracted(fields, policyValues)) {
          await applyExtractedToPolicy(appliedPolicyId, fields);
          showToast("Client info updated from document");
          router.refresh();
        } else {
          setExtractFields(fields);
          setOverwrites(new Set());
          setExtractWarning(json.warning ?? null);
          setExtractModalOpen(true);
        }
      } else {
        if (json.warning) setExtractWarning(json.warning);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveExtracted() {
    if (!targetPolicyId) return;

    setSavingExtract(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/policies/${targetPolicyId}/apply-extracted-info`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: extractFields,
            overwrites: Array.from(overwrites),
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      setExtractModalOpen(false);
      showToast("Policy info updated from document");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingExtract(false);
    }
  }

  function updateField(field: ConflictField, value: string) {
    setExtractFields((current) => ({ ...current, [field]: value || null }));
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const policyId = policies.length === 1 ? policies[0].id : selectedPolicyId;
          if (file && policyId) handleUpload(file, policyId);
        }}
      />

      <button
        type="button"
        onClick={openUploadFlow}
        disabled={uploading}
        className="px-5 py-2.5 bg-navy border border-navy-lighter hover:border-accent/50 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload Document"}
      </button>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/60"
          onClick={() => !uploading && setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-navy-light border border-navy-lighter rounded-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Upload Document</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                disabled={uploading}
                className="text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500">
              PDF, JPG, or PNG — max 20MB. PDFs auto-scan for policy info. Old carrier
              files are automatically moved under Past Policies.
            </p>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Attach to policy</label>
              <select
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                className="w-full px-4 py-2.5 bg-navy border border-navy-lighter rounded-lg text-white text-sm focus:outline-none focus:border-accent"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !selectedPolicyId}
              className="w-full px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Choose File"}
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </div>
      )}

      {extractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-navy-lighter bg-navy-light p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-1">Extracted Info</h3>
            <p className="text-sm text-gray-400 mb-4">
              Review fields found in the PDF. Edit anything that looks wrong before saving.
            </p>

            {extractWarning && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {extractWarning}
              </div>
            )}

            <div className="space-y-4">
              {(Object.keys(FIELD_LABELS) as ConflictField[]).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-400 mb-1 capitalize">
                    {FIELD_LABELS[field]}
                  </label>
                  <input
                    type="text"
                    value={extractFields[field] ?? ""}
                    onChange={(event) => updateField(field, event.target.value)}
                    className="w-full px-3 py-2 bg-navy border border-navy-lighter rounded-lg text-white text-sm focus:outline-none focus:border-accent"
                  />
                  {hasConflict(field) && !overwrites.has(field) && (
                    <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      This policy already has a {FIELD_LABELS[field]}. Do you want to replace it?
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setOverwrites((current) => new Set(current).add(field))
                          }
                          className="px-2 py-1 rounded bg-amber-600 text-white text-xs"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(field, getExistingValue(field) ?? "")
                          }
                          className="px-2 py-1 rounded bg-navy border border-navy-lighter text-gray-300 text-xs"
                        >
                          Keep Existing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setExtractModalOpen(false);
                  router.refresh();
                }}
                disabled={savingExtract}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSaveExtracted}
                disabled={savingExtract}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {savingExtract ? "Saving…" : "Save to Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

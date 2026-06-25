"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ExtractedPolicyInfo } from "@/lib/extractPolicyInfo";
import { hasAnyExtractedInfo } from "@/lib/extractPolicyInfo";
import { canAutoApplyExtracted } from "@/lib/extractPolicyApply";
import { readJsonResponse } from "@/lib/apiClient";
import type { Policy, PolicyDocument } from "@/lib/types";
import { formatDate, formatFileSize } from "@/lib/utils";

interface PolicyDocumentsSectionProps {
  policy: Policy;
  initialDocuments: PolicyDocument[];
}

type ConflictField = "policy_number" | "client_address" | "client_email" | "client_phone";

const FIELD_LABELS: Record<ConflictField, string> = {
  policy_number: "policy number",
  client_address: "address",
  client_email: "email",
  client_phone: "phone",
};

const POLICY_FIELD_MAP: Record<
  ConflictField,
  keyof Pick<Policy, "policy_number" | "client_address" | "email" | "phone">
> = {
  policy_number: "policy_number",
  client_address: "client_address",
  client_email: "email",
  client_phone: "phone",
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_BYTES = 20 * 1024 * 1024;

export default function PolicyDocumentsSection({
  policy,
  initialDocuments,
}: PolicyDocumentsSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  function getExistingValue(field: ConflictField): string | null {
    const key = POLICY_FIELD_MAP[field];
    const value = policy[key];
    return value?.trim() ? value.trim() : null;
  }

  function hasConflict(field: ConflictField): boolean {
    const existing = getExistingValue(field);
    const incoming = extractFields[field]?.trim();
    return Boolean(existing && incoming && existing !== incoming);
  }

  async function applyExtractedToPolicy(
    fields: Pick<ExtractedPolicyInfo, ConflictField>,
    overwriteFields: ConflictField[] = []
  ) {
    const res = await fetch(`/api/policies/${policy.id}/apply-extracted-info`, {
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

  async function handleUpload(file: File) {
    if (file.size > MAX_BYTES) {
      setError("File must be under 20MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("policy_id", policy.id);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{
        document?: PolicyDocument;
        extracted?: ExtractedPolicyInfo | null;
        warning?: string;
        error?: string;
        uploaded?: boolean;
      }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }

      setDocuments((current) => [json.document!, ...current]);
      showToast("Document uploaded");

      if (json.extracted && hasAnyExtractedInfo(json.extracted)) {
        const fields: Pick<ExtractedPolicyInfo, ConflictField> = {
          policy_number: json.extracted.policy_number ?? "",
          client_address: json.extracted.client_address ?? "",
          client_email: json.extracted.client_email ?? "",
          client_phone: json.extracted.client_phone ?? "",
        };
        const policyValues = {
          policy_number: policy.policy_number,
          client_address: policy.client_address,
          email: policy.email,
          phone: policy.phone,
        };

        if (canAutoApplyExtracted(fields, policyValues)) {
          await applyExtractedToPolicy(fields);
          showToast("Policy info updated from document");
          router.refresh();
        } else {
          setExtractFields(fields);
          setOverwrites(new Set());
          setExtractWarning(json.warning ?? null);
          setExtractModalOpen(true);
        }
      } else if (json.warning) {
        setExtractWarning(json.warning);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleView(docId: string) {
    setError(null);
    try {
      const res = await fetch("/api/documents/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId }),
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{ url?: string; error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Could not open document");
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open document");
    }
  }

  async function handleDelete(doc: PolicyDocument) {
    if (!window.confirm("Delete this document?")) return;

    setDeletingId(doc.id);
    setError(null);

    try {
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
        credentials: "same-origin",
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json.error ?? "Delete failed");

      setDocuments((current) => current.filter((d) => d.id !== doc.id));
      showToast("Document deleted");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveExtracted() {
    setSavingExtract(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/policies/${policy.id}/apply-extracted-info`,
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
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white">Policy Documents</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload Document"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        PDF, JPG, or PNG — max 20MB. PDF uploads auto-scan for policy info.
      </p>

      {extractWarning && !extractModalOpen && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {extractWarning}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-navy-lighter bg-navy-light p-6 text-center text-sm text-gray-500">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="rounded-xl border border-navy-lighter overflow-hidden">
          <ul className="divide-y divide-navy-lighter">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-navy-light"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(doc.uploaded_at)} · {formatFileSize(doc.file_size)}
                    {doc.notes ? ` · ${doc.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleView(doc.id)}
                    className="px-3 py-1.5 text-sm bg-navy border border-navy-lighter rounded-lg text-gray-200 hover:border-accent/50 transition-colors"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id}
                    title="Delete document"
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {extractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-navy-lighter bg-navy-light p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-1">
              Extracted Info
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Review fields found in the PDF. Edit anything that looks wrong
              before saving.
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
                      This policy already has a {FIELD_LABELS[field]}. Do you
                      want to replace it?
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
                          onClick={() => updateField(field, getExistingValue(field) ?? "")}
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
                onClick={() => setExtractModalOpen(false)}
                disabled={savingExtract}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSaveExtracted}
                disabled={savingExtract}
                className="px-5 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {savingExtract ? "Saving…" : "Save to Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

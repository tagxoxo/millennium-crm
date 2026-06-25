"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/lib/apiClient";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_BYTES = 20 * 1024 * 1024;

export interface ClientUploadPolicyOption {
  id: string;
  label: string;
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

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
      const json = await readJsonResponse<{ error?: string; uploaded?: boolean }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }

      showToast("Document uploaded");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
              PDF, JPG, or PNG — max 20MB. Old carrier files (e.g. Progressive) are
              automatically moved under Past Policies.
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
    </>
  );
}

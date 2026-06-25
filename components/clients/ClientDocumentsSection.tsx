"use client";

import { useState } from "react";
import type { ClientDocument } from "@/lib/clients";
import { formatDate, formatFileSize } from "@/lib/utils";

interface ClientDocumentsSectionProps {
  documents: ClientDocument[];
}

export default function ClientDocumentsSection({
  documents,
}: ClientDocumentsSectionProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleView(doc: ClientDocument) {
    setLoadingId(doc.id);
    try {
      const res = await fetch("/api/documents/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      const json = await res.json();
      if (json.url) window.open(json.url, "_blank");
    } finally {
      setLoadingId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No documents uploaded for this client&apos;s policies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-3 bg-navy-light border border-navy-lighter rounded-xl p-4"
        >
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{doc.file_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Policy {doc.policy_label} · {formatFileSize(doc.file_size)} ·{" "}
              {formatDate(doc.uploaded_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleView(doc)}
            disabled={loadingId === doc.id}
            className="shrink-0 px-3 py-1.5 text-sm text-accent hover:underline disabled:opacity-50"
          >
            {loadingId === doc.id ? "Opening..." : "View"}
          </button>
        </div>
      ))}
    </div>
  );
}

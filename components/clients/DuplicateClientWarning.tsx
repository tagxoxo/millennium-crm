"use client";

import Link from "next/link";
import type { Client } from "@/lib/types";

interface DuplicateClientWarningProps {
  matches: Client[];
  onLink: (clientId: string) => void;
  onCreateNew: () => void;
  onCancel?: () => void;
}

export default function DuplicateClientWarning({
  matches,
  onLink,
  onCreateNew,
  onCancel,
}: DuplicateClientWarningProps) {
  const primary = matches[0];

  return (
    <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-3">
      <p className="text-sm text-amber-200">
        A client with this email or phone already exists:{" "}
        <strong>{primary.full_name}</strong>
        {primary.email && (
          <span className="text-amber-300/80"> ({primary.email})</span>
        )}
        . Do you want to link this policy to them instead of creating a new client?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onLink(primary.id)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          Link to Existing
        </button>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 border border-navy-lighter text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
        >
          Create New
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>
      {matches.length > 1 && (
        <p className="text-xs text-gray-500">
          Other matches:{" "}
          {matches.slice(1).map((m, i) => (
            <span key={m.id}>
              {i > 0 && ", "}
              <Link href={`/clients/${m.id}`} className="text-accent hover:underline">
                {m.full_name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

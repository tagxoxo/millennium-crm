"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Client, Policy } from "@/lib/types";
import { CARRIER_LABELS, POLICY_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";

interface SearchResults {
  clients: Client[];
  policies: Policy[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;

    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults(json as SearchResults);
      } catch {
        setResults({ clients: [], policies: [] });
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    results &&
    (results.clients.length > 0 || results.policies.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        placeholder="Search clients & policies..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full px-4 py-2 bg-navy border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-navy-light border border-navy-lighter rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading && (
            <p className="px-4 py-3 text-sm text-gray-400">Searching...</p>
          )}
          {!loading && !hasResults && (
            <p className="px-4 py-3 text-sm text-gray-400">No results found.</p>
          )}
          {!loading && hasResults && (
            <>
              {results!.clients.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-xs text-gray-500 font-medium">Clients</p>
                  {results!.clients.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      className="block px-3 py-2 rounded-lg hover:bg-navy text-sm"
                    >
                      <span className="text-white font-medium">{client.full_name}</span>
                      {client.email && (
                        <span className="text-gray-400 text-xs ml-2">{client.email}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              {results!.policies.length > 0 && (
                <div className="p-2 border-t border-navy-lighter">
                  <p className="px-2 py-1 text-xs text-gray-500 font-medium">Policies</p>
                  {results!.policies.map((policy) => (
                    <button
                      key={policy.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        router.push(`/policies/${policy.id}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-navy text-sm"
                    >
                      <span className="text-white font-medium">{policy.client_name}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {CARRIER_LABELS[policy.carrier]} · {STAGE_LABELS[policy.stage]}
                        {policy.policy_type && (
                          <> · {POLICY_TYPE_LABELS[policy.policy_type]}</>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

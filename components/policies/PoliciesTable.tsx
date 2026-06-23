"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierBadge from "@/components/ui/CarrierBadge";
import SpanishTag from "@/components/ui/SpanishTag";
import PolicyFilters, { type SpanishFilter } from "./PolicyFilters";
import type { Carrier, Policy, Stage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PoliciesTableProps {
  policies: Policy[];
}

export default function PoliciesTable({ policies }: PoliciesTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState<Carrier | "all">("all");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [spanish, setSpanish] = useState<SpanishFilter>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return policies.filter((p) => {
      if (query && !p.client_name.toLowerCase().includes(query)) return false;
      if (carrier !== "all" && p.carrier !== carrier) return false;
      if (stage !== "all" && p.stage !== stage) return false;
      if (spanish === "yes" && !p.spanish_speaker) return false;
      if (spanish === "no" && p.spanish_speaker) return false;
      return true;
    });
  }, [policies, search, carrier, stage, spanish]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by client name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:max-w-md px-4 py-2.5 bg-navy-light border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent"
      />

      <PolicyFilters
        carrier={carrier}
        stage={stage}
        spanish={spanish}
        onCarrierChange={setCarrier}
        onStageChange={setStage}
        onSpanishChange={setSpanish}
      />

      <p className="text-sm text-gray-400">
        Showing {filtered.length} of {policies.length} policies
      </p>

      {filtered.length === 0 ? (
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
          <p className="text-gray-400">No policies match your filters.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => router.push(`/policies/${policy.id}`)}
                className="w-full text-left bg-navy-light border border-navy-lighter rounded-xl p-4 hover:border-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-white">{policy.client_name}</p>
                  {policy.spanish_speaker && <SpanishTag />}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <CarrierBadge carrier={policy.carrier} />
                  <span className="text-sm text-gray-400">
                    {STAGE_LABELS[policy.stage]}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{formatCurrency(Number(policy.premium))}</span>
                  <span>{formatDate(policy.renewal_date)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-lighter text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <th className="px-4 py-3 font-medium">Premium</th>
                  <th className="px-4 py-3 font-medium">Renewal Date</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Spanish</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((policy) => (
                  <tr
                    key={policy.id}
                    onClick={() => router.push(`/policies/${policy.id}`)}
                    className="border-b border-navy-lighter/50 hover:bg-navy-lighter/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {policy.client_name}
                    </td>
                    <td className="px-4 py-3">
                      <CarrierBadge carrier={policy.carrier} />
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatCurrency(Number(policy.premium))}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatDate(policy.renewal_date)}
                    </td>
                    <td className="px-4 py-3 text-accent">
                      {STAGE_LABELS[policy.stage]}
                    </td>
                    <td className="px-4 py-3">
                      {policy.spanish_speaker ? (
                        <SpanishTag />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

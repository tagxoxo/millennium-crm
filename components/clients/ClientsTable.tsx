"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import type { ClientWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ClientsTableProps {
  clients: ClientWithStats[];
}

export default function ClientsTable({ clients }: ClientsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const phone = c.phone?.replace(/\D/g, "") ?? "";
      const qPhone = q.replace(/\D/g, "");
      return (
        c.full_name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (qPhone.length >= 3 && phone.includes(qPhone))
      );
    });
  }, [clients, search]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by name, email, or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 bg-navy-light border border-navy-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent text-sm"
      />

      {filtered.length === 0 ? (
        <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
          <p className="text-gray-400">No clients found.</p>
        </div>
      ) : (
        <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-lighter text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Policies</th>
                  <th className="px-4 py-3 font-medium">Total Premium</th>
                  <th className="px-4 py-3 font-medium">Carriers</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-navy-lighter/50 hover:bg-navy/50"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {client.full_name}
                      {client.is_spanish_speaker && (
                        <span className="ml-2 text-xs text-cyan-400">ES</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {client.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {client.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-navy text-gray-300 border border-navy-lighter">
                        {client.active_policy_count} active
                        {client.policy_count !== client.active_policy_count &&
                          ` / ${client.policy_count} total`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {formatCurrency(client.total_premium)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.carriers.slice(0, 3).map((c) => (
                          <CarrierBadge key={c} carrier={c} />
                        ))}
                        {client.carriers.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{client.carriers.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-accent hover:underline text-sm"
                      >
                        View Client
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

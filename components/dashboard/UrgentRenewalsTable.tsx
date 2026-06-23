import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import type { Policy } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface UrgentRenewalsTableProps {
  policies: Policy[];
}

export default function UrgentRenewalsTable({
  policies,
}: UrgentRenewalsTableProps) {
  if (policies.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No renewals due in the next 14 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
      {/* Mobile: card list */}
      <div className="md:hidden divide-y divide-navy-lighter">
        {policies.map((policy) => (
          <Link
            key={policy.id}
            href={`/policies/${policy.id}`}
            className="block p-4 hover:bg-navy-lighter/50"
          >
            <div className="flex justify-between items-start mb-2">
              <p className="font-medium text-white">{policy.client_name}</p>
              <CarrierBadge carrier={policy.carrier} />
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatCurrency(Number(policy.premium))}</span>
              <span>{formatDate(policy.renewal_date)}</span>
            </div>
            <p className="text-xs text-accent mt-1">
              {STAGE_LABELS[policy.stage]}
            </p>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-lighter text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Carrier</th>
              <th className="px-4 py-3 font-medium">Premium</th>
              <th className="px-4 py-3 font-medium">Renewal Date</th>
              <th className="px-4 py-3 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr
                key={policy.id}
                className="border-b border-navy-lighter/50 hover:bg-navy-lighter/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/policies/${policy.id}`}
                    className="text-white hover:text-accent"
                  >
                    {policy.client_name}
                  </Link>
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
                <td className="px-4 py-3">
                  <span className="text-accent">{STAGE_LABELS[policy.stage]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

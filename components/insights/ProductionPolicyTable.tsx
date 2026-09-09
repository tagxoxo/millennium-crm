import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import type { Policy } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProductionPolicyTableProps {
  policies: Policy[];
  monthLabel: string;
}

export default function ProductionPolicyTable({
  policies,
  monthLabel,
}: ProductionPolicyTableProps) {
  const sorted = [...policies].sort(
    (a, b) => Number(b.premium) - Number(a.premium)
  );

  return (
    <section className="bg-navy-light border border-navy-lighter rounded-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-navy-lighter">
        <h2 className="text-lg font-semibold text-white">Policies Written</h2>
        <p className="text-xs text-gray-500 mt-1">{monthLabel}</p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          No production recorded for this month.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-lighter text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Carrier</th>
                <th className="px-4 py-3 font-medium">Effective</th>
                <th className="px-4 py-3 font-medium text-right">Premium</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((policy) => (
                <tr
                  key={policy.id}
                  className="border-b border-navy-lighter/50 hover:bg-navy/30"
                >
                  <td className="px-4 py-3">
                    {policy.client_id ? (
                      <Link
                        href={`/clients/${policy.client_id}`}
                        className="text-white font-medium hover:text-accent"
                      >
                        {policy.client_name}
                      </Link>
                    ) : (
                      <Link
                        href={`/policies/${policy.id}`}
                        className="text-white font-medium hover:text-accent"
                      >
                        {policy.client_name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CarrierBadge carrier={policy.carrier} />
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {formatDate(policy.effective_date || policy.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right whitespace-nowrap">
                    {formatCurrency(Number(policy.premium))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

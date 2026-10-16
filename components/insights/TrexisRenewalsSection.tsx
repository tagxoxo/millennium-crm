import type { TrexisRenewalMonth } from "@/lib/trexisRenewals";
import { formatCurrencyExact, formatDate } from "@/lib/utils";

interface TrexisRenewalsSectionProps {
  monthLabel: string;
  summary: TrexisRenewalMonth;
}

export default function TrexisRenewalsSection({
  monthLabel,
  summary,
}: TrexisRenewalsSectionProps) {
  const hasRenewals = summary.policyCount > 0;
  const rateLabel =
    hasRenewals && summary.renewals[0]
      ? `${(summary.renewals[0].commission_rate * 100).toFixed(0)}%`
      : "15%";

  return (
    <section className="bg-navy-light border border-teal-500/30 rounded-xl overflow-hidden">
      <div className="p-5 md:p-6 border-b border-navy-lighter flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-300">
            Acquired book
          </p>
          <h2 className="text-lg font-semibold text-white mt-1">
            Trexis Renewals · {monthLabel}
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Automatic renewals that came into your new code. These stay separate
            from new business policies.
          </p>
        </div>
        {hasRenewals ? (
          <div className="text-sm text-gray-300 md:text-right shrink-0">
            <p className="text-white font-semibold">
              {formatCurrencyExact(summary.annualPremium)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {summary.policyCount} renewal{summary.policyCount === 1 ? "" : "s"} ·{" "}
              {formatCurrencyExact(summary.commission)} commission ({rateLabel})
            </p>
          </div>
        ) : null}
      </div>

      {hasRenewals ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-lighter text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Policy</th>
                <th className="px-4 py-3 font-medium">Renewed</th>
                <th className="px-4 py-3 font-medium text-right">Payment</th>
                <th className="px-4 py-3 font-medium text-right">Commission</th>
                <th className="px-4 py-3 font-medium text-right">12-month premium</th>
              </tr>
            </thead>
            <tbody>
              {summary.renewals.map((renewal) => (
                <tr
                  key={renewal.id}
                  className="border-b border-navy-lighter/50"
                >
                  <td className="px-4 py-3 text-white font-medium">
                    {renewal.insured_name}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {renewal.policy_number}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {formatDate(renewal.renewal_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right whitespace-nowrap">
                    {formatCurrencyExact(renewal.monthly_premium)}
                    {renewal.paid_in_full ? (
                      <span className="ml-2 inline-block text-[10px] uppercase tracking-wide text-teal-300 border border-teal-500/40 rounded px-1.5 py-0.5">
                        Paid in full
                      </span>
                    ) : (
                      <span className="text-gray-500"> / mo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right whitespace-nowrap">
                    {formatCurrencyExact(renewal.commission_amount)}
                  </td>
                  <td className="px-4 py-3 text-white text-right whitespace-nowrap">
                    {formatCurrencyExact(renewal.annual_written_premium)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy/40 text-white">
                <td className="px-4 py-3 font-semibold" colSpan={3}>
                  {monthLabel} total
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  {formatCurrencyExact(summary.commission)}
                </td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  {formatCurrencyExact(summary.annualPremium)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-amber-200/90 px-5 md:px-6 py-8">
          No Trexis renewals on file for {monthLabel}. If the monthly carrier
          report came in, it has not been added yet.
        </p>
      )}
    </section>
  );
}

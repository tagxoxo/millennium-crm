import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import SpanishTag from "@/components/ui/SpanishTag";
import type { Policy } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import {
  daysUntilRenewal,
  formatCurrency,
  formatDate,
  renewalColor,
} from "@/lib/utils";

interface PolicyInfoProps {
  policy: Policy;
}

export default function PolicyInfo({ policy }: PolicyInfoProps) {
  const days = daysUntilRenewal(policy.renewal_date);

  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {policy.client_name}
            </h2>
            {policy.spanish_speaker && <SpanishTag />}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <CarrierBadge carrier={policy.carrier} />
            <span className="text-sm text-gray-400">
              {STAGE_LABELS[policy.stage]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {formatCurrency(Number(policy.premium))}
          </p>
          <p className="text-xs text-gray-400">annual premium</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 mb-1">Renewal Date</dt>
          <dd className="text-white">
            {formatDate(policy.renewal_date)}
            <span className={`ml-2 font-medium ${renewalColor(days)}`}>
              ({days === 0
                ? "today"
                : days < 0
                  ? `${Math.abs(days)}d overdue`
                  : `${days}d away`}
              )
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Policy Number</dt>
          <dd className="text-white">{policy.policy_number || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Phone</dt>
          <dd className="text-white">
            {policy.phone ? (
              <a href={`tel:${policy.phone}`} className="text-accent hover:underline">
                {policy.phone}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Email</dt>
          <dd className="text-white">
            {policy.email ? (
              <a href={`mailto:${policy.email}`} className="text-accent hover:underline">
                {policy.email}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {policy.notes && (
          <div className="sm:col-span-2">
            <dt className="text-gray-500 mb-1">Notes</dt>
            <dd className="text-gray-300 whitespace-pre-wrap">{policy.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function BackLink() {
  return (
    <Link
      href="/policies"
      className="inline-flex items-center text-sm text-gray-400 hover:text-accent transition-colors mb-4"
    >
      ← Back to Policies
    </Link>
  );
}

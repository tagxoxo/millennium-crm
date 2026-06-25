import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import CommercialTag from "@/components/ui/CommercialTag";
import SpanishTag from "@/components/ui/SpanishTag";
import StateTag from "@/components/ui/StateTag";
import TermTag from "@/components/ui/TermTag";
import type { Policy } from "@/lib/types";
import { DEFAULT_CLIENT_STATE, normalizeClientState, POLICY_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";
import {
  annualizedPremium,
  daysUntilRenewal,
  formatCurrency,
  formatDate,
  normalizeTermMonths,
  renewalColor,
} from "@/lib/utils";

interface PolicyInfoProps {
  policy: Policy;
}

export default function PolicyInfo({ policy }: PolicyInfoProps) {
  const isPast = Boolean(policy.is_historical);
  const days = daysUntilRenewal(policy.renewal_date);
  const termMonths = normalizeTermMonths(policy.term_months);
  const annualPremium = annualizedPremium(Number(policy.premium), termMonths);

  return (
    <div className="bg-navy-light border border-navy-lighter rounded-xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {policy.client_name}
            </h2>
            {policy.commercial && <CommercialTag />}
            <TermTag termMonths={termMonths} />
            {policy.spanish_speaker && <SpanishTag />}
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-400 border border-gray-600/50">
                Past Policy
              </span>
            )}
            {normalizeClientState(policy.client_state) !== DEFAULT_CLIENT_STATE && (
              <StateTag state={normalizeClientState(policy.client_state)} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <CarrierBadge carrier={policy.carrier} />
            {policy.prior_carrier && (
              <>
                <span className="text-xs text-gray-500">from</span>
                <CarrierBadge carrier={policy.prior_carrier} />
              </>
            )}
            <span className="text-sm text-gray-400">
              {POLICY_TYPE_LABELS[policy.policy_type ?? "personal_auto"]}
            </span>
            <span className="text-sm text-gray-400">
              {STAGE_LABELS[policy.stage]}
            </span>
          </div>
          {policy.client_id && (
            <Link
              href={`/clients/${policy.client_id}`}
              className="text-sm text-accent hover:underline mt-2 inline-block"
            >
              View client profile →
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {formatCurrency(Number(policy.premium))}
          </p>
          <p className="text-xs text-gray-400">
            {termMonths === 6 ? "6-month premium" : "annual premium"}
          </p>
          {termMonths === 6 && (
            <p className="text-xs text-cyan-400 mt-1">
              {formatCurrency(annualPremium)} annualized
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 mb-1">Effective Date</dt>
          <dd className="text-white">
            {policy.effective_date ? formatDate(policy.effective_date) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Expiration Date</dt>
          <dd className="text-white">
            {formatDate(policy.renewal_date)}
            {!isPast && (
              <span className={`ml-2 font-medium ${renewalColor(days)}`}>
                ({days === 0
                  ? "today"
                  : days < 0
                    ? `${Math.abs(days)}d overdue`
                    : `${days}d away`}
                )
              </span>
            )}
            {isPast && (
              <span className="ml-2 text-sm text-gray-500">(archived term)</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Prior Carrier</dt>
          <dd className="text-white">
            {policy.prior_carrier ? (
              <CarrierBadge carrier={policy.prior_carrier} />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 mb-1">Client Since</dt>
          <dd className="text-white">
            {policy.client_since ? formatDate(policy.client_since) : "—"}
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
              <span className="text-amber-400 text-sm">
                Not on file — add in Edit Client Info for non-pay alerts
              </span>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gray-500 mb-1">Address</dt>
          <dd className="text-white">{policy.client_address || "—"}</dd>
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

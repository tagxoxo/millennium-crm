import Link from "next/link";
import CarrierBadge from "@/components/ui/CarrierBadge";
import SpanishTag from "@/components/ui/SpanishTag";
import type { Policy } from "@/lib/types";
import {
  daysUntilRenewal,
  formatCurrency,
  renewalColor,
} from "@/lib/utils";

interface PolicyCardProps {
  policy: Policy;
}

export default function PolicyCard({ policy }: PolicyCardProps) {
  const days = daysUntilRenewal(policy.renewal_date);

  return (
    <Link
      href={`/policies/${policy.id}`}
      className="block bg-navy border border-navy-lighter rounded-lg p-3 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-white text-sm leading-tight">
          {policy.client_name}
        </p>
        {policy.spanish_speaker && <SpanishTag />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <CarrierBadge carrier={policy.carrier} />
        <span className="text-sm text-gray-300">
          {formatCurrency(Number(policy.premium))}
        </span>
      </div>
      <p className={`text-xs mt-2 font-medium ${renewalColor(days)}`}>
        {days === 0
          ? "Renews today"
          : days < 0
            ? `${Math.abs(days)}d overdue`
            : `${days}d until renewal`}
      </p>
    </Link>
  );
}

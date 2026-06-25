import type { RenewalEmailStatus } from "@/lib/renewalReminders";

interface RenewalEmailIconProps {
  status: RenewalEmailStatus;
}

export default function RenewalEmailIcon({ status }: RenewalEmailIconProps) {
  if (status === "none") return null;

  const isSent = status === "sent";

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${
        isSent ? "text-green-400" : "text-yellow-400"
      }`}
      title={
        isSent
          ? "45-day renewal reminder sent (last 50 days)"
          : "Renewal within 45 days — reminder not sent yet"
      }
      aria-label={
        isSent ? "Renewal reminder sent" : "Renewal reminder needed"
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    </span>
  );
}

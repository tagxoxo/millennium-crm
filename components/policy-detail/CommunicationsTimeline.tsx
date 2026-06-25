import type { ContactLog } from "@/lib/types";
import {
  EMAIL_COMMUNICATION_TYPES,
  formatContactDateTime,
  languageFromNotes,
} from "@/lib/renewalReminders";

const TYPE_LABELS: Record<string, string> = {
  renewal_reminder_45: "45-Day Renewal Reminder",
  non_pay_alert: "Non-Pay Alert",
  manual_policy_review: "Manual Policy Review",
  email: "Email",
};

const TYPE_COLORS: Record<string, string> = {
  renewal_reminder_45: "bg-green-500/20 text-green-400 border-green-500/40",
  non_pay_alert: "bg-red-500/20 text-red-400 border-red-500/40",
  manual_policy_review: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  email: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

interface CommunicationsTimelineProps {
  contacts: ContactLog[];
}

export default function CommunicationsTimeline({
  contacts,
}: CommunicationsTimelineProps) {
  const emails = contacts.filter((c) =>
    EMAIL_COMMUNICATION_TYPES.includes(
      c.contact_type as (typeof EMAIL_COMMUNICATION_TYPES)[number]
    )
  );

  if (emails.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No emails sent yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {emails.map((contact, index) => {
        const language = languageFromNotes(contact.notes);
        const label = TYPE_LABELS[contact.contact_type] ?? contact.contact_type;
        const color =
          TYPE_COLORS[contact.contact_type] ??
          "bg-gray-500/20 text-gray-400 border-gray-500/40";

        return (
          <div key={contact.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-accent border-2 border-navy-light shrink-0" />
              {index < emails.length - 1 && (
                <div className="w-px flex-1 bg-navy-lighter min-h-[2rem]" />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${color}`}
                  >
                    {label}
                  </span>
                  {language && (
                    <span className="text-xs text-gray-400">{language}</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatContactDateTime(contact.contact_date)}
                  </span>
                </div>
                {contact.notes && (
                  <p className="text-sm text-gray-400">{contact.notes}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

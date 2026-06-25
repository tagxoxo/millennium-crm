import type { ContactLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<ContactLog["contact_type"], string> = {
  call: "Call",
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  non_pay_alert: "Non-Pay Alert",
  renewal_reminder_45: "45-Day Reminder",
  manual_policy_review: "Policy Review",
};

const TYPE_COLORS: Record<ContactLog["contact_type"], string> = {
  call: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  sms: "bg-green-500/20 text-green-400 border-green-500/40",
  whatsapp: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  email: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  non_pay_alert: "bg-red-500/20 text-red-400 border-red-500/40",
  renewal_reminder_45: "bg-green-500/20 text-green-400 border-green-500/40",
  manual_policy_review: "bg-blue-500/20 text-blue-400 border-blue-500/40",
};

interface ContactTimelineProps {
  contacts: ContactLog[];
}

export default function ContactTimeline({ contacts }: ContactTimelineProps) {
  if (contacts.length === 0) {
    return (
      <div className="bg-navy-light border border-navy-lighter rounded-xl p-8 text-center">
        <p className="text-gray-400">No contact history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {contacts.map((contact, index) => (
        <div key={contact.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-accent border-2 border-navy-light shrink-0" />
            {index < contacts.length - 1 && (
              <div className="w-px flex-1 bg-navy-lighter min-h-[2rem]" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <div className="bg-navy-light border border-navy-lighter rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[contact.contact_type]}`}
                >
                  {TYPE_LABELS[contact.contact_type]}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(contact.contact_date)}
                </span>
              </div>
              {contact.outcome && (
                <p className="text-sm text-white font-medium mb-1">
                  {contact.outcome}
                </p>
              )}
              {contact.notes && (
                <p className="text-sm text-gray-400">{contact.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

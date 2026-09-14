import { sendEmail } from "@/lib/mail";
import {
  formatVaDateTime,
  VA_CARRIER_LABELS,
  VA_REQUEST_TYPE_LABELS,
  type VaRequest,
} from "@/lib/va";

const TICKET_ALERT_EMAIL = "jacob@wilshireinsure.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string | null | undefined): string {
  const display = value?.trim() ? escapeHtml(value.trim()) : "—";
  return `<tr>
    <td style="padding:8px 12px;color:#6b7280;width:160px;vertical-align:top;">${label}</td>
    <td style="padding:8px 12px;color:#111827;">${display}</td>
  </tr>`;
}

export async function sendTicketAlertEmail(ticket: VaRequest) {
  const typeLabel =
    VA_REQUEST_TYPE_LABELS[ticket.request_type] ?? ticket.request_type;
  const carrierLabel = ticket.carrier
    ? VA_CARRIER_LABELS[ticket.carrier]
    : "—";

  const subject = `New VA ticket: ${typeLabel} — ${ticket.caller_name}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#111827;">
      <h2 style="margin:0 0 8px;">New VA ticket</h2>
      <p style="margin:0 0 16px;color:#6b7280;">
        Open Ticket Center in Millennium CRM to complete this.
      </p>
      <table style="border-collapse:collapse;width:100%;background:#f9fafb;border-radius:8px;">
        ${row("When", formatVaDateTime(ticket.created_at))}
        ${row("Caller", ticket.caller_name)}
        ${row("Policy #", ticket.policy_number)}
        ${row("Phone", ticket.phone_number)}
        ${row("Request type", typeLabel)}
        ${row("Carrier", carrierLabel)}
        ${row("Language", ticket.language === "spanish" ? "Spanish" : "English")}
        ${row("Notes", ticket.notes)}
      </table>
    </div>
  `;

  await sendEmail({
    to: TICKET_ALERT_EMAIL,
    subject,
    html,
  });
}

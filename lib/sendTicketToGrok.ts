import { sendEmail } from "@/lib/mail";
import {
  formatVaDateTime,
  VA_CARRIER_LABELS,
  VA_REQUEST_TYPE_LABELS,
  VA_STATUS_LABELS,
  type VaRequest,
} from "@/lib/va";

const GROK_TICKET_EMAIL = "millenniumquotes@mail.grokbot.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function display(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function row(label: string, value: string | null | undefined): string {
  return `<tr>
    <td style="padding:8px 12px;color:#6b7280;width:160px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;color:#111827;white-space:pre-wrap;">${escapeHtml(display(value))}</td>
  </tr>`;
}

export async function sendTicketToGrok(ticket: VaRequest) {
  const typeLabel =
    VA_REQUEST_TYPE_LABELS[ticket.request_type] ?? ticket.request_type;
  const carrierLabel = ticket.carrier ? VA_CARRIER_LABELS[ticket.carrier] : "—";
  const languageLabel = ticket.language === "spanish" ? "Spanish" : "English";
  const statusLabel = VA_STATUS_LABELS[ticket.status] ?? ticket.status;

  const fields: [string, string][] = [
    ["Ticket id", ticket.id],
    ["When", formatVaDateTime(ticket.created_at)],
    ["Caller", display(ticket.caller_name)],
    ["Policy #", display(ticket.policy_number)],
    ["Phone", display(ticket.phone_number)],
    ["Email", display(ticket.email)],
    ["Request type", typeLabel],
    ["Carrier", carrierLabel],
    ["Language", languageLabel],
    ["Status", statusLabel],
  ];

  if (ticket.completed_at) {
    fields.push(["Completed", formatVaDateTime(ticket.completed_at)]);
  }

  for (const item of ticket.intake ?? []) {
    fields.push([item.label, display(item.answer)]);
  }

  if (ticket.notes?.trim()) {
    fields.push(["Notes", ticket.notes.trim()]);
  }

  const subject = `VA ticket: ${typeLabel} — ${ticket.caller_name}`;

  const text = [
    "VA ticket from Millennium CRM Ticket Center",
    "",
    ...fields.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#111827;">
      <h2 style="margin:0 0 8px;">VA ticket</h2>
      <p style="margin:0 0 16px;color:#6b7280;">
        Sent from Ticket Center in Millennium CRM.
      </p>
      <table style="border-collapse:collapse;width:100%;background:#f9fafb;border-radius:8px;">
        ${fields.map(([label, value]) => row(label, value)).join("")}
      </table>
    </div>
  `;

  await sendEmail({
    to: GROK_TICKET_EMAIL,
    subject,
    html,
    text,
  });
}

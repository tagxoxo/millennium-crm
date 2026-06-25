import { getBusinessEmail, getBusinessPhone } from "@/lib/mail";

function footerHtml(): string {
  const email = getBusinessEmail();
  const phone = getBusinessPhone();

  return `
    <p>📞 ${phone}<br>📧 ${email}</p>
    <p>
      Wilshire Insurance Group<br>
      111 17th Ave S<br>
      Nashville, TN, 37203
    </p>
  `;
}

function wrapHtml(body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
      ${body}
      ${footerHtml()}
    </div>
  `;
}

export function buildEnglishNonPayAlert(
  clientName: string,
  carrier: string
): { subject: string; html: string } {
  const subject =
    "Important: Payment Issue on Your Wilshire Insurance Group Policy";

  const html = wrapHtml(`
    <p>Hi ${clientName},</p>
    <p>
      This is Wilshire Insurance Group. We noticed a payment issue on your ${carrier}
      policy. Please call us at your earliest convenience to avoid a lapse in coverage.
    </p>
  `);

  return { subject, html };
}

export function buildSpanishNonPayAlert(
  clientName: string,
  carrier: string
): { subject: string; html: string } {
  const subject =
    "Importante: Problema de pago en su póliza de Wilshire Insurance Group";

  const html = wrapHtml(`
    <p>Hola ${clientName},</p>
    <p>
      Le contactamos de Wilshire Insurance Group. Notamos un problema de pago en su
      póliza de ${carrier}. Por favor llámenos a la brevedad posible para evitar
      una cancelación de su cobertura.
    </p>
  `);

  return { subject, html };
}

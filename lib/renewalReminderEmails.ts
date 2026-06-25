import { getBusinessEmail, getBusinessPhone } from "@/lib/mail";

function footerHtml(): string {
  const email = getBusinessEmail();
  const phone = getBusinessPhone();

  return `
    <p>${email}<br>${phone}</p>
    <p>
      Wilshire Insurance Group<br>
      111 17th Ave S<br>
      Nashville, TN 37203
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

export function buildEnglishRenewalReminder45(
  clientName: string,
  carrier: string
): { subject: string; html: string } {
  const subject = "It's Time for Your Policy Review — Millennium Insurance";

  const html = wrapHtml(`
    <p>Hi ${clientName},</p>
    <p>
      It's time for your ${carrier} policy review. This review is a great opportunity
      to ensure that your policy still provides your coverage needs. Can you please
      reply to this email with answers to the following questions:
    </p>
    <ul>
      <li>Have there been any changes with your employment?</li>
      <li>Have there been any changes to your marital status?</li>
      <li>Do you have any new toys? (motorcycle, boat, cars, etc.)</li>
      <li>Did you have any life insurance/mortgage protection outside of work?</li>
      <li>Has there been any new changes to your address or contact info?</li>
    </ul>
    <p>
      We greatly appreciate your business and look forward to serving you for a very long time!
    </p>
  `);

  return { subject, html };
}

export function buildSpanishRenewalReminder45(
  clientName: string,
  carrier: string
): { subject: string; html: string } {
  const subject = "Es hora de revisar su póliza — Millennium Insurance";

  const html = wrapHtml(`
    <p>Hola ${clientName},</p>
    <p>
      Es hora de revisar su póliza de ${carrier}. Esta revisión es una gran oportunidad
      para asegurarse de que su póliza siga cubriendo todas sus necesidades.
      ¿Puede responder a este correo con las respuestas a las siguientes preguntas?
    </p>
    <ul>
      <li>¿Ha habido algún cambio en su empleo?</li>
      <li>¿Ha habido algún cambio en su estado civil?</li>
      <li>¿Tiene algún juguete nuevo? (motocicleta, bote, carros, etc.)</li>
      <li>¿Tiene algún seguro de vida o protección hipotecaria fuera de su trabajo?</li>
      <li>¿Ha habido algún cambio en su dirección o información de contacto?</li>
    </ul>
    <p>
      ¡Agradecemos mucho su preferencia y esperamos servirle por mucho tiempo!
    </p>
  `);

  return { subject, html };
}

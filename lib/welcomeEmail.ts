import { getBusinessEmail, getBusinessPhone } from "@/lib/mail";

export function getClientFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function wrapHtml(body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
      ${body}
    </div>
  `;
}

export function buildEnglishWelcomeEmail(fullName: string): {
  subject: string;
  html: string;
} {
  const firstName = getClientFirstName(fullName);
  const phone = getBusinessPhone();
  const email = getBusinessEmail();

  const subject = "Welcome to the Wilshire Insurance Group Family";

  const html = wrapHtml(`
    <p>Dear ${firstName},</p>
    <p>
      Myself and the whole staff would like to welcome you to our family and thank you
      for trusting us with your insurance needs. We couldn't be more excited to provide
      you excellent service.
    </p>
    <p>
      Feel free to contact us at any time with your questions or concerns regarding your
      coverage. We can be reached via phone or email during regular business hours.
    </p>
    <p>
      • Phone: ${phone}<br>
      • Email: ${email}
    </p>
    <p>
      Finally, we would like to mention that, as a family run business, your word is key
      to our success. If a family member or friend may require additional coverage, we
      always welcome referrals.
    </p>
    <p>
      Once again, ${firstName}, myself and the whole staff would like to welcome you to
      our family. We look forward to serving your needs to the best of our ability.
    </p>
    <p>
      Jacob Gavrilov<br>
      ${phone}<br>
      ${email}<br>
      Wilshire Insurance Group
    </p>
  `);

  return { subject, html };
}

export function buildSpanishWelcomeEmail(fullName: string): {
  subject: string;
  html: string;
} {
  const firstName = getClientFirstName(fullName);
  const phone = getBusinessPhone();
  const email = getBusinessEmail();

  const subject = "Bienvenido a la familia de Wilshire Insurance Group";

  const html = wrapHtml(`
    <p>Estimado/a ${firstName},</p>
    <p>
      Yo y todo nuestro equipo deseamos darle la bienvenida a nuestra familia y
      agradecerle por confiar en nosotros para sus necesidades de seguro. Estamos muy
      entusiasmados de brindarle un excelente servicio.
    </p>
    <p>
      No dude en contactarnos en cualquier momento con sus preguntas o inquietudes sobre
      su cobertura. Puede comunicarse con nosotros por teléfono o correo electrónico
      durante el horario comercial habitual.
    </p>
    <p>
      • Teléfono: ${phone}<br>
      • Correo: ${email}
    </p>
    <p>
      Por último, nos gustaría mencionar que, como negocio familiar, su recomendación es
      clave para nuestro éxito. Si un familiar o amigo necesita cobertura adicional,
      siempre agradecemos sus referidos.
    </p>
    <p>
      Una vez más, ${firstName}, yo y todo nuestro equipo deseamos darle la bienvenida a
      nuestra familia. Esperamos servirle lo mejor posible.
    </p>
    <p>
      Jacob Gavrilov<br>
      ${phone}<br>
      ${email}<br>
      Wilshire Insurance Group
    </p>
  `);

  return { subject, html };
}

export function buildWelcomeEmail(
  fullName: string,
  spanishSpeaker: boolean
): { subject: string; html: string } {
  return spanishSpeaker
    ? buildSpanishWelcomeEmail(fullName)
    : buildEnglishWelcomeEmail(fullName);
}

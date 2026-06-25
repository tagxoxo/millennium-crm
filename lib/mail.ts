import nodemailer from "nodemailer";
import { cleanEnv, getEnv } from "@/lib/env";

/** Gmail app passwords are 16 chars — strip spaces if pasted from Google's UI. */
function getGmailAppPassword(): string {
  return cleanEnv(getEnv("GMAIL_APP_PASSWORD")).replace(/\s+/g, "");
}

export function getMailTransport() {
  const user = getEnv("GMAIL_USER");
  const pass = getGmailAppPassword();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export function getBusinessEmail(): string {
  return getEnv("BUSINESS_EMAIL");
}

export function getBusinessPhone(): string {
  return getEnv("BUSINESS_PHONE");
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const transport = getMailTransport();
  const from = getEnv("GMAIL_USER");

  await transport.sendMail({
    from: `Millennium Insurance <${from}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

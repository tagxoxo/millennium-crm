import { generateSecret, generateURI, verifySync } from "otplib";

const ISSUER = "Millennium CRM";

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export function verifyTotpCode(token: string, secret: string): boolean {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const result = verifySync({ token: normalized, secret });
  return result.valid;
}

export const MAX_2FA_ATTEMPTS = 5;

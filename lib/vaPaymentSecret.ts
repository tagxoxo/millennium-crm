import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getEnv, getEnvOptional } from "@/lib/env";
import {
  CARD_CVC_LABEL,
  CARD_EXP_LABEL,
  CARD_NAME_LABEL,
  CARD_NUMBER_LABEL,
  CARD_SECRET_LABEL,
  CARD_ZIP_LABEL,
  digitsOnly,
  formatCardNumberDisplay,
  formatExpInput,
  maskCardNumber,
  paymentCardError,
  type PaymentCardInput,
} from "@/lib/vaPayment";
import type { VaIntakeAnswer } from "@/lib/vaScript";

type CardSecret = {
  pan: string;
  cvc: string;
};

function encryptionKey(): Buffer {
  const secret =
    getEnvOptional("SUPABASE_SECRET_KEY") || getEnv("CRM_PASSWORD");
  return createHash("sha256").update(secret).digest();
}

export function encryptCardSecret(payload: CardSecret): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptCardSecret(blob: string): CardSecret | null {
  try {
    const buf = Buffer.from(blob, "base64");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(json) as Partial<CardSecret>;
    const pan = digitsOnly(String(parsed.pan ?? ""));
    const cvc = digitsOnly(String(parsed.cvc ?? ""));
    if (pan.length < 13 || cvc.length < 3) return null;
    return { pan, cvc };
  } catch {
    return null;
  }
}

export function buildPaymentIntake(
  card: PaymentCardInput,
  extra: VaIntakeAnswer[]
): { intake: VaIntakeAnswer[]; error: string | null } {
  const error = paymentCardError(card);
  if (error) return { intake: [], error };

  const pan = digitsOnly(card.number);
  const cvc = digitsOnly(card.cvc);
  const name = `${card.first_name.trim()} ${card.last_name.trim()}`.replace(/\s+/g, " ");
  const exp = formatExpInput(card.exp);
  const zip = digitsOnly(card.zip);

  const intake: VaIntakeAnswer[] = [
    ...extra,
    { label: CARD_NAME_LABEL, answer: name },
    { label: CARD_NUMBER_LABEL, answer: maskCardNumber(pan) },
    { label: CARD_EXP_LABEL, answer: exp },
    { label: CARD_CVC_LABEL, answer: "***" },
    { label: CARD_ZIP_LABEL, answer: zip },
    {
      label: CARD_SECRET_LABEL,
      answer: encryptCardSecret({ pan, cvc }),
    },
  ];

  return { intake, error: null };
}

export function maskIntakeForVa(intake: VaIntakeAnswer[]): VaIntakeAnswer[] {
  return intake
    .filter((item) => item.label !== CARD_SECRET_LABEL)
    .map((item) => {
      if (item.label === CARD_NUMBER_LABEL) {
        return { ...item, answer: maskCardNumber(item.answer) };
      }
      if (item.label === CARD_CVC_LABEL) {
        return { ...item, answer: "***" };
      }
      return item;
    });
}

export function revealIntakeForCrm(intake: VaIntakeAnswer[]): VaIntakeAnswer[] {
  const secretRow = intake.find((item) => item.label === CARD_SECRET_LABEL);
  const secret = secretRow ? decryptCardSecret(secretRow.answer) : null;

  return intake
    .filter((item) => item.label !== CARD_SECRET_LABEL)
    .map((item) => {
      if (secret && item.label === CARD_NUMBER_LABEL) {
        return { ...item, answer: formatCardNumberDisplay(secret.pan) };
      }
      if (secret && item.label === CARD_CVC_LABEL) {
        return { ...item, answer: secret.cvc };
      }
      return item;
    });
}

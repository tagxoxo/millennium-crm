export const CARD_NUMBER_LABEL = "Card number";
export const CARD_CVC_LABEL = "CVC";
export const CARD_EXP_LABEL = "Expiration";
export const CARD_NAME_LABEL = "Name on card";
export const CARD_ZIP_LABEL = "Zip code";
export const CARD_SECRET_LABEL = "_card_secret";

export type PaymentCardInput = {
  number: string;
  exp: string;
  cvc: string;
  first_name: string;
  last_name: string;
  zip: string;
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCardNumberInput(value: string): string {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

export function formatCardNumberDisplay(digits: string): string {
  const d = digitsOnly(digits);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpInput(value: string): string {
  const d = digitsOnly(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function maskCardNumber(value: string): string {
  const d = digitsOnly(value);
  if (d.length < 4) return "***";
  return `${"*".repeat(Math.max(d.length - 4, 4))}${d.slice(-4)}`;
}

export function cardLast4(value: string): string {
  const d = digitsOnly(value);
  return d.length >= 4 ? d.slice(-4) : "";
}

export function intakeCardLast4(
  intake: { label: string; answer: string }[]
): string | null {
  const row = intake.find((item) => item.label === CARD_NUMBER_LABEL);
  if (!row) return null;
  const last4 = cardLast4(row.answer);
  return last4 || null;
}

export function emptyPaymentCard(): PaymentCardInput {
  return {
    number: "",
    exp: "",
    cvc: "",
    first_name: "",
    last_name: "",
    zip: "",
  };
}

export function paymentCardError(card: PaymentCardInput): string | null {
  const number = digitsOnly(card.number);
  const exp = digitsOnly(card.exp);
  const cvc = digitsOnly(card.cvc);
  const zip = digitsOnly(card.zip);
  const first = card.first_name.trim();
  const last = card.last_name.trim();

  if (number.length < 13 || number.length > 19) {
    return "Enter a valid card number.";
  }
  if (exp.length !== 4) {
    return "Enter expiration as MM/YY.";
  }
  const month = Number(exp.slice(0, 2));
  if (month < 1 || month > 12) {
    return "Enter a valid expiration month.";
  }
  if (cvc.length < 3 || cvc.length > 4) {
    return "Enter a valid CVC.";
  }
  if (!first || !last) {
    return "Enter the first and last name on the card.";
  }
  if (zip.length < 5) {
    return "Enter a valid zip code.";
  }
  return null;
}

export function parsePaymentCard(raw: unknown): PaymentCardInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  return {
    number: String(body.number ?? ""),
    exp: formatExpInput(String(body.exp ?? "")),
    cvc: digitsOnly(String(body.cvc ?? "")).slice(0, 4),
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    zip: digitsOnly(String(body.zip ?? "")).slice(0, 10),
  };
}

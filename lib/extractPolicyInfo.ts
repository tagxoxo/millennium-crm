export interface ExtractedPolicyInfo {
  policy_number: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

export function extractPolicyNumber(text: string): string | null {
  const patterns = [
    /policy\s*(?:#|no\.?|number)\s*:?\s*([A-Z0-9][A-Z0-9\-\/]{3,})/i,
    /(?:policy|pol\.?)\s*(?:#|no\.?)\s*([A-Z0-9][A-Z0-9\-\/]{3,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }

  return null;
}

export function extractEmail(text: string): string | null {
  const match = text.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  );
  return clean(match?.[0]?.toLowerCase() ?? null);
}

export function extractPhone(text: string): string | null {
  const patterns = [
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
    /\b\d{10}\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return clean(match[0]);
  }

  return null;
}

export function extractAddress(text: string): string | null {
  const patterns = [
    /\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9\s.'#-]{2,40}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl)\.?(?:\s*(?:#|Apt|Unit|Ste)\.?\s*[A-Za-z0-9-]+)?,?\s+[A-Za-z\s.'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/i,
    /\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9\s.'#-]{2,40},?\s+[A-Za-z\s.'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return clean(match[0]);
  }

  return null;
}

export function extractPolicyInfoFromText(text: string): ExtractedPolicyInfo {
  return {
    policy_number: extractPolicyNumber(text),
    client_address: extractAddress(text),
    client_email: extractEmail(text),
    client_phone: extractPhone(text),
  };
}

export function hasAnyExtractedInfo(info: ExtractedPolicyInfo): boolean {
  return Boolean(
    info.policy_number ||
      info.client_address ||
      info.client_email ||
      info.client_phone
  );
}

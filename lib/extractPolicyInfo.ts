export interface ExtractedPolicyInfo {
  client_name: string | null;
  policy_number: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  renewal_date: string | null;
  effective_date: string | null;
  premium: string | null;
  term_months: 6 | 12 | null;
}

const AGENT_LABELS = [
  "writing agent",
  "insurance agent",
  "agent #",
  "agent number",
  "agent:",
  "agent ",
  "producer:",
  "producer ",
  "agency:",
  "agency ",
  "broker:",
  "broker ",
];

const INSURED_LABELS = [
  "named insured:",
  "named insured",
  "primary named insured:",
  "primary named insured",
  "insured name:",
  "insured:",
  "insured ",
];

const AGENT_EMAIL_DOMAINS = [
  "smartchoiceagents.com",
  "smartchoiceagent.com",
];

const SECTION_BREAK =
  /\n\s*(?:agent|producer|agency|broker|policy\s*(?:#|number|information)|driver|vehicle|coverage|premium|effective|declarations)\b/i;

interface ExtractOptions {
  fullText?: string;
  /** When true, text is already scoped to the insured block. */
  insuredSection?: boolean;
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

function indexOfLastLabelBefore(text: string, position: number, labels: string[]): number {
  const before = text.slice(0, position).toLowerCase();
  let last = -1;
  for (const label of labels) {
    const idx = before.lastIndexOf(label);
    if (idx > last) last = idx;
  }
  return last;
}

/** True when the match sits in an agent/producer/agency block, not the insured block. */
export function isInAgentContext(fullText: string, position: number): boolean {
  const agentIdx = indexOfLastLabelBefore(fullText, position, AGENT_LABELS);
  const insuredIdx = indexOfLastLabelBefore(fullText, position, INSURED_LABELS);

  if (agentIdx === -1) return false;
  if (insuredIdx === -1) return true;
  return agentIdx > insuredIdx;
}

export function isAgentEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1] ?? "";

  if (!domain) return true;

  if (AGENT_EMAIL_DOMAINS.includes(domain)) return true;

  if (
    /(?:^|\.)(?:agents?|agency|agencies|broker(?:s)?|insnetwork|insurance)(?:\.|$)/i.test(
      domain
    )
  ) {
    return true;
  }

  return false;
}

function removeAgentBlocks(text: string): string {
  return text.replace(
    /\b(?:writing\s+agent|insurance\s+agent|agent|producer|agency|broker)\s*(?:#|no\.?|number)?\s*:?\s*[\s\S]*?(?=(?:\n\s*(?:named\s+insured|primary\s+named\s+insured|insured(?:\s+name)?|policy(?:\s*(?:#|number|information))?|driver|vehicle|coverage|premium|effective|mailing|garaging|page\s+\d|\f)|$))/gi,
    "\n"
  );
}

function captureSection(text: string, headerPattern: RegExp): string | null {
  const match = text.match(headerPattern);
  if (!match?.[1]?.trim()) return null;
  return match[1].trim();
}

function getInsuredSection(text: string): string | null {
  const progressiveBlock = captureSection(
    text,
    /Named\s+Insureds?\s*:\s*([\s\S]*?)(?=\r?\n\s*\.{4,}|\r?\n\s*Agent\s*:)/i
  );
  if (progressiveBlock) return progressiveBlock;

  const geicoBlock = captureSection(
    text,
    /Named\s+Insured\s*\/\s*Insureds?\s*:?\s*([\s\S]*?)(?=\r?\n\s*(?:Financial\s+responsibility|Policy\s+period|Total\s+policy|Broker\/Agent|Agent|Producer|Agency|Broker|Driver|Vehicle|Coverage|Premium|Effective|Payment\s+plan)\b)/i
  );
  if (geicoBlock) return geicoBlock;

  const patterns = [
    /(?:primary\s+named\s+insured|named\s+insureds?|named\s+insured(?:\s+and\s+mailing\s+address)?|named\s+insured\s*\/\s*insureds?|policyholder)\s*:?\s*([\s\S]*?)(?=\r?\n\s*(?:\.{4,}|financial\s+responsibility|policy\s+period|total\s+policy|broker\/agent|agent\s*:|producer|agency|broker|policy\s*(?:#|no\.?|number|information)|driver|vehicle|coverage|premium|effective|payment\s+plan)\b)/i,
  ];

  for (const pattern of patterns) {
    const section = captureSection(text, pattern);
    if (section) return section;
  }

  return null;
}

function getMailingAddressSection(text: string): string | null {
  const patterns = [
    /mailing\s+address\s*:?\s*([\s\S]*?)(?=\n\s*(?:garaging|agent|producer|agency|broker|policy|driver|vehicle|coverage|phone|email)\b)/i,
    /(?:residence|home)\s+address\s*:?\s*([\s\S]*?)(?=\n\s*(?:garaging|agent|producer|agency|broker|policy|driver|vehicle|coverage|phone|email)\b)/i,
  ];

  for (const pattern of patterns) {
    const section = captureSection(text, pattern);
    if (section && parseAddressFromLines(section)) return section;
  }

  return null;
}

function getClientSearchText(text: string): { text: string; insuredSection: boolean } {
  const insured = getInsuredSection(text);
  const mailing = getMailingAddressSection(text);

  if (insured) {
    if (mailing) return { text: `${insured}\n${mailing}`, insuredSection: true };
    return { text: insured, insuredSection: true };
  }

  if (mailing) return { text: mailing, insuredSection: true };

  return { text: removeAgentBlocks(text), insuredSection: false };
}

function absoluteIndex(
  fullText: string,
  sectionText: string,
  localIndex: number,
  insuredSection: boolean
): number {
  if (insuredSection) {
    const marker =
      /(?:mailing\s+address|garaging\s+address|residence\s+address|primary\s+named\s+insured|named\s+insured|insured(?:\s+name)?)\s*:?\s*/i;
    const headerMatch = fullText.match(marker);
    if (headerMatch?.index !== undefined) {
      return headerMatch.index + headerMatch[0].length + localIndex;
    }
  }

  const sectionStart = fullText.indexOf(sectionText);
  return sectionStart >= 0 ? sectionStart + localIndex : localIndex;
}

function titleCaseName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function parseMonthDayYear(month: string, day: string, year: string): string | null {
  const key = month.toLowerCase().replace(/\./g, "");
  const mm = MONTHS[key];
  if (!mm) return null;
  const dd = String(Number(day)).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function extractPolicyPeriod(text: string): {
  effective_date: string | null;
  expiration_date: string | null;
} {
  const range = text.match(
    /Policy\s+period:\s*([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})\s*-\s*([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})/i
  );
  if (range) {
    return {
      effective_date: parseMonthDayYear(range[1], range[2], range[3]),
      expiration_date: parseMonthDayYear(range[4], range[5], range[6]),
    };
  }

  return { effective_date: null, expiration_date: null };
}

export function extractEffectiveDate(text: string): string | null {
  const fromPeriod = extractPolicyPeriod(text).effective_date;
  if (fromPeriod) return fromPeriod;

  const patterns = [
    /Effective\s+date(?:\s+and\s+time)?:\s*([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})/i,
    /(?:policy\s+)?effective(?:\s+date)?:\s*([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[2] && match[3]) {
      const parsed = parseMonthDayYear(match[1], match[2], match[3]);
      if (parsed) return parsed;
    }
  }

  return null;
}

export function extractRenewalDate(text: string): string | null {
  const fromPeriod = extractPolicyPeriod(text).expiration_date;
  if (fromPeriod) return fromPeriod;

  const patterns = [
    /expire(?:s|d)?\s+(?:at\s+)?(?:12:01\s*(?:am)?\s+)?(?:on\s+)?([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})/i,
    /(?:renewal|expiration)\s+date\s*:?\s*([A-Za-z]+\.?)\s+(\d{1,2}),?\s*(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match[2] && match[3]) {
      const parsed = parseMonthDayYear(match[1], match[2], match[3]);
      if (parsed) return parsed;
    }
  }

  return null;
}

export function extractPremium(text: string): string | null {
  const marker = text.match(/Total\s+policy\s+premium:/i);
  if (marker?.index === undefined) return null;

  const slice = text.slice(marker.index, marker.index + 1200);
  const amount = slice.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (!amount?.[1]) return null;
  return amount[1].replace(/,/g, "");
}

export function extractTermMonths(text: string): 6 | 12 | null {
  if (/\b(?:six[\s-]*month|6[\s-]*month|\b6\s+payments?\b)/i.test(text)) return 6;
  if (/\b(?:twelve[\s-]*month|12[\s-]*month|\b12\s+payments?\b)/i.test(text)) return 12;
  return null;
}

export function extractClientName(text: string): string | null {
  const insured = getInsuredSection(text);
  if (insured) {
    for (const line of insured.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (looksLikePersonName(trimmed)) return titleCaseName(trimmed);
      if (
        /^[A-Za-z]{2,}$/.test(trimmed.replace(/\s/g, "")) &&
        !/\d/.test(trimmed) &&
        !/@/.test(trimmed) &&
        /[A-Z]/.test(trimmed)
      ) {
        return titleCaseName(trimmed);
      }
    }
  }

  const policyholder = text.match(/Policyholder:\s*\r?\n([^\r\n]+)/i);
  if (policyholder?.[1]?.trim()) {
    const raw = policyholder[1].trim();
    if (!/\d/.test(raw) && !/@/.test(raw)) return titleCaseName(raw);
  }

  return null;
}

export function clientNameFromFileName(
  fileName: string,
  isCarrierHint?: (value: string) => boolean
): string | null {
  const decoded = decodeURIComponent(fileName.replace(/\+/g, " "));
  const base = decoded.replace(/\.[^.]+$/i, "").trim();
  const commaParts = base.split(",").map((part) => part.trim()).filter(Boolean);

  if (commaParts.length >= 2) {
    const second = commaParts[1];
    if (isCarrierHint?.(second)) {
      return titleCaseName(commaParts[0].replace(/_/g, " "));
    }
    return titleCaseName(`${commaParts[1]} ${commaParts[0]}`.replace(/_/g, " "));
  }

  if (commaParts.length === 1 && commaParts[0]) {
    return titleCaseName(commaParts[0].replace(/_/g, " "));
  }

  return null;
}

function looksLikePersonName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/\d/.test(trimmed)) return false;
  if (/@/.test(trimmed)) return false;
  if (/^(?:policy|agent|insured|mailing|garaging|phone|email)\b/i.test(trimmed)) {
    return false;
  }
  return /^[A-Za-z][A-Za-z\s.'-]+$/.test(trimmed);
}

function isIgnoredAddressLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^\.+$/.test(trimmed.replace(/\s/g, ""))) return true;
  if (/\$|premium|payment plan|insurance company|return to|fax:/i.test(trimmed)) {
    return true;
  }
  if (/\b(?:INC|LLC|CORP|AGENCY|NETWORK)\b/i.test(trimmed) && !/^\d/.test(trimmed)) {
    return true;
  }
  return false;
}

function isValidClientAddress(address: string): boolean {
  if (/\$|premium|month policy|payment plan|insurance company/i.test(address)) {
    return false;
  }
  const streetPart = address.split(",")[0]?.trim() ?? "";
  if (!/\d/.test(streetPart)) return false;
  return /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(address);
}

function isStreetLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || isIgnoredAddressLine(trimmed)) return false;
  if (/^P\.?\s*O\.?\s*BOX\b/i.test(trimmed)) return true;
  if (/^\d+[A-Za-z]?\s+[A-Za-z]/.test(trimmed)) return true;
  if (/^\d+\s+\S/.test(trimmed)) return true;
  if (
    /\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|circle|cir|place|pl|highway|hwy|parkway|pkwy|trail|trl|loop|lp|path|pass|route|rte|pike|run|point|pt|crossing|xing)\.?\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

function isCityStateZipLine(line: string): boolean {
  return /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(line.trim());
}

function formatCityStateZipLine(line: string): string {
  const trimmed = line.trim();
  const withComma = trimmed.match(
    /^([A-Za-z][A-Za-z\s.'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/
  );
  if (withComma) {
    return `${withComma[1].trim()}, ${withComma[2]} ${withComma[3]}`;
  }

  const withoutComma = trimmed.match(
    /^([A-Za-z][A-Za-z\s.'-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/
  );
  if (withoutComma) {
    return `${withoutComma[1].trim()}, ${withoutComma[2]} ${withoutComma[3]}`;
  }

  return trimmed;
}

function parseAddressFromLines(block: string): string | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let streetLine: string | null = null;
  let cityLine: string | null = null;

  for (const line of lines) {
    if (isIgnoredAddressLine(line)) continue;
    if (looksLikePersonName(line) && !streetLine && !cityLine) continue;

    if (isCityStateZipLine(line)) {
      cityLine = formatCityStateZipLine(line);
      continue;
    }

    if (isStreetLine(line)) {
      streetLine = line;
    }
  }

  if (streetLine && cityLine) {
    const combined = clean(`${streetLine}, ${cityLine}`);
    return combined && isValidClientAddress(combined) ? combined : null;
  }
  if (cityLine && /^\d+\s/.test(cityLine) && isValidClientAddress(cityLine)) {
    return clean(cityLine);
  }
  if (streetLine && /\b[A-Z]{2}\s+\d{5}/.test(streetLine) && isValidClientAddress(streetLine)) {
    return clean(streetLine);
  }

  return null;
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

function iterateMatches(text: string, regex: RegExp): RegExpExecArray[] {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const pattern = new RegExp(regex.source, flags);
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    matches.push(match);
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return matches;
}

export function extractEmail(text: string, options: ExtractOptions = {}): string | null {
  const fullText = options.fullText ?? text;
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  for (const match of iterateMatches(text, regex)) {
    const email = clean(match[0]?.toLowerCase() ?? null);
    if (!email) continue;

    if (isAgentEmail(email)) continue;

    if (!options.insuredSection) {
      const pos = absoluteIndex(
        fullText,
        text,
        match.index ?? 0,
        Boolean(options.insuredSection)
      );
      if (isInAgentContext(fullText, pos)) continue;
    }

    return email;
  }

  return null;
}

function isVendorOrTollFreePhone(line: string, phone: string): boolean {
  const context = line.toLowerCase();
  if (
    /(?:vendor|transunion|dispute|report|geico|broker|agent|agency|insurance company|financial responsibility|fax)/i.test(
      context
    )
  ) {
    return true;
  }

  const digits = phone.replace(/\D/g, "");
  if (/^(?:800|888|877|866|855|844|833|822)\d{7}$/.test(digits)) {
    return true;
  }

  return false;
}

export function extractPhone(text: string, options: ExtractOptions = {}): string | null {
  const fullText = options.fullText ?? text;
  const patterns = [
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/g,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
  ];

  for (const pattern of patterns) {
    for (const match of iterateMatches(text, pattern)) {
      const phone = clean(match[0]);
      if (!phone) continue;

      const lineStart = text.lastIndexOf("\n", match.index ?? 0) + 1;
      const lineEnd = text.indexOf("\n", match.index ?? 0);
      const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (isVendorOrTollFreePhone(line, phone)) continue;

      if (!options.insuredSection) {
        const pos = absoluteIndex(
          fullText,
          text,
          match.index ?? 0,
          Boolean(options.insuredSection)
        );
        if (isInAgentContext(fullText, pos)) continue;
      }

      return phone;
    }
  }

  return null;
}

function extractAddressWithRegex(text: string, options: ExtractOptions = {}): string | null {
  const fullText = options.fullText ?? text;
  const patterns = [
    /\d{1,6}[A-Za-z]?\s+[A-Za-z0-9][A-Za-z0-9\s.'#-]{2,50}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Highway|Hwy|Parkway|Pkwy|Trail|Trl|Loop|Lp|Pike|Run|Point|Pt)\.?(?:\s*(?:#|Apt|Unit|Ste)\.?\s*[A-Za-z0-9-]+)?,?\s+[A-Za-z][A-Za-z\s.'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/gi,
    /P\.?\s*O\.?\s*BOX\s+\d+[A-Za-z0-9-]*,?\s+[A-Za-z][A-Za-z\s.'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/gi,
    /\d{1,6}[A-Za-z]?\s+[A-Za-z0-9][A-Za-z0-9\s.'#-]{2,50},?\s+[A-Za-z][A-Za-z\s.'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?/g,
  ];

  for (const pattern of patterns) {
    for (const match of iterateMatches(text, pattern)) {
      const address = clean(match[0]);
      if (!address || !isValidClientAddress(address)) continue;

      if (!options.insuredSection) {
        const pos = absoluteIndex(
          fullText,
          text,
          match.index ?? 0,
          Boolean(options.insuredSection)
        );
        if (isInAgentContext(fullText, pos)) continue;
      }

      return address;
    }
  }

  return null;
}

export function extractAddress(text: string, options: ExtractOptions = {}): string | null {
  const fromLines = parseAddressFromLines(text);
  if (fromLines) return fromLines;

  const fromRegex = extractAddressWithRegex(text, options);
  if (fromRegex) return fromRegex;

  return null;
}

export function extractPolicyInfoFromText(text: string): ExtractedPolicyInfo {
  const { text: clientText, insuredSection } = getClientSearchText(text);
  const options: ExtractOptions = { fullText: text, insuredSection };

  return {
    client_name: extractClientName(text),
    policy_number: extractPolicyNumber(text),
    client_address: extractAddress(clientText, options),
    client_email: extractEmail(clientText, options),
    client_phone: extractPhone(clientText, options),
    renewal_date: extractRenewalDate(text),
    effective_date: extractEffectiveDate(text),
    premium: extractPremium(text),
    term_months: extractTermMonths(text),
  };
}

export function hasAnyExtractedInfo(info: ExtractedPolicyInfo): boolean {
  return Boolean(
    info.client_name ||
      info.policy_number ||
      info.client_address ||
      info.client_email ||
      info.client_phone ||
      info.renewal_date ||
      info.effective_date ||
      info.premium ||
      info.term_months
  );
}

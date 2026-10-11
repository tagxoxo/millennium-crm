import { spawnSync } from "child_process";
import { createRequire, register } from "module";
import { existsSync, readFileSync } from "fs";

const silenceWarning = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";
if (!process.execArgv.includes(silenceWarning)) {
  const child = spawnSync(
    process.execPath,
    [silenceWarning, ...process.execArgv, ...process.argv.slice(1)],
    { stdio: "inherit" }
  );
  process.exit(child.status ?? 1);
}
import { basename, extname } from "path";

register(new URL("./ts-import-hook.mjs", import.meta.url));

const require = createRequire(import.meta.url);

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/debug-pdf-extract.mjs <pdf-or-image-path>");
  process.exit(1);
}

const { extractPolicyInfoFromText, extractAddress } = await import(
  "../lib/extractPolicyInfo.ts"
);
const { extractPolicyFromFile, normalizePolicyMime } = await import(
  "../lib/extractPolicyInfoAI.ts"
);

const buffer = readFileSync(path);
const fileName = basename(path);
const mimeType = normalizePolicyMime("", fileName);
if (!mimeType) {
  console.error("File must be a PDF, JPG, or PNG.");
  process.exit(1);
}

let regexExtracted = null;
if (extname(path).toLowerCase() === ".pdf") {
  try {
    const pdfParse = require("pdf-parse");
    const text = (await pdfParse(buffer)).text ?? "";
    const insuredMatch = text.match(
      /Named\s+Insureds?\s*:\s*([\s\S]*?)(?=\r?\n\s*\.{4,}|\r?\n\s*Agent\s*:)/i
    );
    console.log("INSURED BLOCK:\n", insuredMatch?.[1] ?? "none");
    console.log(
      "ADDRESS FROM BLOCK:",
      insuredMatch?.[1]
        ? extractAddress(insuredMatch[1], { fullText: text, insuredSection: true })
        : null
    );
    regexExtracted = extractPolicyInfoFromText(text);
  } catch (error) {
    console.log("REGEX: could not read this PDF.", error instanceof Error ? error.message : error);
  }
} else {
  console.log("REGEX: image files have no text layer, so the regex extractor is skipped.");
}

const claude = await extractPolicyFromFile({ buffer, mimeType, fileName });

const fields = [
  "client_name",
  "policy_number",
  "client_address",
  "client_email",
  "client_phone",
  "effective_date",
  "renewal_date",
  "premium",
  "term_months",
];

function cell(value) {
  if (value == null || value === "") return "—";
  return String(value).replace(/\s+/g, " ");
}

console.log("\nFIELD             REGEX                                       CLAUDE");
for (const field of fields) {
  const left = cell(regexExtracted?.[field]);
  const right = cell(claude.extracted[field]);
  console.log(field.padEnd(18) + left.slice(0, 44).padEnd(44) + right.slice(0, 44));
  if (left.length > 44) console.log("  regex:  " + left);
  if (right.length > 44) console.log("  claude: " + right);
}

console.log("\nCLAUDE SOURCE:", claude.source);
console.log("CLAUDE CARRIER:", claude.carrier);
console.log("CLAUDE POLICY TYPE:", claude.policy_type);
console.log("CONFIDENCE:", JSON.stringify(claude.confidence, null, 2));
console.log("LOW CONFIDENCE:", claude.low_confidence_fields.join(", ") || "none");
console.log("LIENHOLDER:", claude.lienholder);
console.log("SR-22:", claude.sr22);
console.log("VEHICLES:", JSON.stringify(claude.vehicles, null, 2));
console.log("DRIVERS:", JSON.stringify(claude.drivers, null, 2));
console.log("\nREGEX JSON:", JSON.stringify(regexExtracted, null, 2));
console.log("CLAUDE JSON:", JSON.stringify(claude, null, 2));

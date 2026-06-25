import { createRequire } from "module";
import { readFileSync } from "fs";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/debug-pdf-extract.mjs <pdf-path>");
  process.exit(1);
}

const { extractPolicyInfoFromText, extractAddress } = await import(
  "../lib/extractPolicyInfo.ts"
);

const buffer = readFileSync(path);
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
console.log("FULL EXTRACT:", JSON.stringify(extractPolicyInfoFromText(text), null, 2));

import { createRequire } from "module";

const require = createRequire(import.meta.url);

type PdfParseFn = (buffer: Buffer) => Promise<{ text?: string }>;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse") as PdfParseFn;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

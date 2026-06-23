/** Remove invisible characters that break HTTP headers when copy-pasted into Vercel */
export function cleanEnv(value: string): string {
  return value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u2028\u2029\u00A0]/g, "");
}

export function getEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return cleanEnv(raw);
}

export function getEnvOptional(name: string): string | undefined {
  const raw = process.env[name];
  return raw ? cleanEnv(raw) : undefined;
}

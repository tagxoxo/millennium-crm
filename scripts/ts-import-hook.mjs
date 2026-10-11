/**
 * Lets `node scripts/debug-pdf-extract.mjs` import TypeScript files that use
 * extensionless relative imports (the same style the Next.js app uses).
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(?:js|mjs|cjs|ts|json|node)$/.test(specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // Fall through and let Node report the original specifier.
    }
  }
  return nextResolve(specifier, context);
}

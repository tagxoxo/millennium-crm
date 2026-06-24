/** Create a session token from the password (used in cookie) */
export async function createAuthToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:millennium-crm-v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(
  cookieValue: string | undefined,
  password: string
): Promise<boolean> {
  if (!cookieValue || !password) return false;
  const expected = await createAuthToken(password);
  return cookieValue === expected;
}

export const AUTH_COOKIE = "crm_session";

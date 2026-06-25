/** Create a session token from the password (used in cookie) */
export async function createAuthToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:millennium-crm-v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createTwoFaToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:millennium-crm-2fa-v1`);
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

export async function isTwoFaSessionValid(
  cookieValue: string | undefined,
  password: string
): Promise<boolean> {
  if (!cookieValue || !password) return false;
  const expected = await createTwoFaToken(password);
  return cookieValue === expected;
}

export const AUTH_COOKIE = "crm_session";
export const TWO_FA_COOKIE = "crm_2fa_verified";
export const TWO_FA_REQUIRED_COOKIE = "crm_2fa_required";
export const TWO_FA_ATTEMPTS_COOKIE = "crm_2fa_attempts";

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

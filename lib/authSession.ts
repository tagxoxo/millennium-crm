import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createAuthToken,
  getCookieOptions,
  isValidSession,
  TWO_FA_REQUIRED_COOKIE,
} from "@/lib/auth";
import { cleanEnv } from "@/lib/env";
import { getCrmUser } from "@/lib/users";

function getPassword() {
  return process.env.CRM_PASSWORD ? cleanEnv(process.env.CRM_PASSWORD) : "";
}

export async function requirePasswordSession(
  request: NextRequest
): Promise<boolean> {
  const password = getPassword();
  if (!password) return true;
  const session = request.cookies.get(AUTH_COOKIE)?.value;
  return await isValidSession(session, password);
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function buildLoginResponse(requires2fa: boolean) {
  const password = getPassword();
  const token = await createAuthToken(password);
  const response = NextResponse.json({ ok: true, requires2fa });

  response.cookies.set(AUTH_COOKIE, token, getCookieOptions());

  if (requires2fa) {
    response.cookies.set(TWO_FA_REQUIRED_COOKIE, "1", getCookieOptions());
    response.cookies.delete("crm_2fa_verified");
  } else {
    response.cookies.delete(TWO_FA_REQUIRED_COOKIE);
    response.cookies.delete("crm_2fa_verified");
    response.cookies.delete("crm_2fa_attempts");
  }

  return response;
}

export async function checkRequires2fa(): Promise<boolean> {
  const user = await getCrmUser();
  return Boolean(user?.two_factor_enabled);
}

import { NextRequest, NextResponse } from "next/server";
import {
  createTwoFaToken,
  getCookieOptions,
  TWO_FA_ATTEMPTS_COOKIE,
  TWO_FA_COOKIE,
  TWO_FA_REQUIRED_COOKIE,
  AUTH_COOKIE,
} from "@/lib/auth";
import {
  requirePasswordSession,
  unauthorizedResponse,
} from "@/lib/authSession";
import { MAX_2FA_ATTEMPTS, verifyTotpCode } from "@/lib/twoFactor";
import { getCrmUser } from "@/lib/users";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cleanEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (!(await requirePasswordSession(request))) {
    return unauthorizedResponse();
  }

  const user = await getCrmUser();
  if (!user?.two_factor_enabled || !user.two_factor_secret) {
    return NextResponse.json(
      { error: "Two-factor authentication is not enabled." },
      { status: 400 }
    );
  }

  const attempts = Number(request.cookies.get(TWO_FA_ATTEMPTS_COOKIE)?.value ?? 0);
  if (attempts >= MAX_2FA_ATTEMPTS) {
    const response = NextResponse.json(
      { error: "Too many failed attempts. Please sign in again.", locked: true },
      { status: 429 }
    );
    response.cookies.delete(AUTH_COOKIE);
    response.cookies.delete(TWO_FA_REQUIRED_COOKIE);
    response.cookies.delete(TWO_FA_COOKIE);
    response.cookies.delete(TWO_FA_ATTEMPTS_COOKIE);
    return response;
  }

  const body = await request.json();
  const code = String(body.code ?? "").trim();

  const valid = verifyTotpCode(code, user.two_factor_secret);
  if (!valid) {
    const response = NextResponse.json(
      { error: "Invalid code. Please try again." },
      { status: 401 }
    );
    response.cookies.set(TWO_FA_ATTEMPTS_COOKIE, String(attempts + 1), {
      ...getCookieOptions(),
      maxAge: 60 * 15,
    });
    return response;
  }

  const password = cleanEnv(process.env.CRM_PASSWORD ?? "");
  const twoFaToken = await createTwoFaToken(password);

  const supabase = getSupabaseServer();
  await supabase
    .from("users")
    .update({ two_factor_verified: true })
    .eq("id", user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TWO_FA_COOKIE, twoFaToken, getCookieOptions());
  response.cookies.delete(TWO_FA_REQUIRED_COOKIE);
  response.cookies.delete(TWO_FA_ATTEMPTS_COOKIE);

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createAuthToken,
  getCookieOptions,
  TWO_FA_REQUIRED_COOKIE,
} from "@/lib/auth";
import {
  buildLoginResponse,
  checkRequires2fa,
} from "@/lib/authSession";
import { cleanEnv } from "@/lib/env";

export async function POST(request: NextRequest) {
  const password = process.env.CRM_PASSWORD
    ? cleanEnv(process.env.CRM_PASSWORD)
    : "";

  if (!password) {
    return NextResponse.json(
      { error: "CRM_PASSWORD is not configured on the server." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const attempt = String(body.password ?? "").trim();

  if (attempt !== password) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const requires2fa = await checkRequires2fa();
  return buildLoginResponse(requires2fa);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(TWO_FA_REQUIRED_COOKIE);
  response.cookies.delete("crm_2fa_verified");
  response.cookies.delete("crm_2fa_attempts");
  return response;
}

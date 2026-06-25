import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  TWO_FA_COOKIE,
  TWO_FA_REQUIRED_COOKIE,
  isTwoFaSessionValid,
  isValidSession,
} from "@/lib/auth";
import { cleanEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const password = process.env.CRM_PASSWORD
    ? cleanEnv(process.env.CRM_PASSWORD)
    : "";

  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/verify-2fa") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = await isValidSession(session, password);

  if (!authed) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const twoFaRequired =
    request.cookies.get(TWO_FA_REQUIRED_COOKIE)?.value === "1";
  const twoFaSession = request.cookies.get(TWO_FA_COOKIE)?.value;
  const twoFaVerified = await isTwoFaSessionValid(twoFaSession, password);

  if (twoFaRequired && !twoFaVerified) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Two-factor verification required." },
        { status: 403 }
      );
    }
    const verifyUrl = new URL("/verify-2fa", request.url);
    verifyUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

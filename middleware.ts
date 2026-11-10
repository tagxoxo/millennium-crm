import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  TWO_FA_COOKIE,
  TWO_FA_REQUIRED_COOKIE,
  getCookieOptions,
  isTwoFaSessionValid,
  isValidSession,
} from "@/lib/auth";
import { cleanEnv } from "@/lib/env";
import {
  VA_ACCESS_COOKIE,
  isConfusableVaInsightsPath,
  isVaPortalPath,
} from "@/lib/va";

function isOwnerAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/verify-2fa") ||
    pathname.startsWith("/api/auth")
  );
}

function clearVaSession(response: NextResponse): NextResponse {
  response.cookies.set(VA_ACCESS_COOKIE, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/icon.") ||
    pathname === "/apple-icon.png" ||
    pathname.startsWith("/apple-icon")
  ) {
    return NextResponse.next();
  }

  if (isConfusableVaInsightsPath(pathname)) {
    return NextResponse.redirect(new URL("/va", request.url));
  }

  if (isVaPortalPath(pathname)) {
    return NextResponse.next();
  }

  const password = process.env.CRM_PASSWORD
    ? cleanEnv(process.env.CRM_PASSWORD)
    : "";

  if (!password) return NextResponse.next();

  const session = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = await isValidSession(session, password);
  const vaToken = request.cookies.get(VA_ACCESS_COOKIE)?.value;

  // Owner login must stay on /login even if this browser still has a VA session.
  // Opening it also drops the VA cookie so the homepage stops jumping to the VA desk.
  if (isOwnerAuthPath(pathname)) {
    const response = NextResponse.next();
    return vaToken ? clearVaSession(response) : response;
  }

  if (vaToken && !authed) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "VA accounts cannot access the main CRM." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/va", request.url));
  }

  if (!authed) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 }
      );
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidSession } from "@/lib/auth";
import { cleanEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const password = process.env.CRM_PASSWORD
    ? cleanEnv(process.env.CRM_PASSWORD)
    : "";

  // No password set = no lock (local dev without CRM_PASSWORD)
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = await isValidSession(session, password);

  if (!authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

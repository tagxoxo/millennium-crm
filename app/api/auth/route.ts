import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, createAuthToken } from "@/lib/auth";
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

  const token = await createAuthToken(password);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}

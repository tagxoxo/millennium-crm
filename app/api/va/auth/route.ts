import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCookieOptions } from "@/lib/auth";
import { getEnv, getEnvOptional } from "@/lib/env";
import { VA_ACCESS_COOKIE } from "@/lib/va";

function getAuthClient() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    getEnvOptional("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { data, error } = await getAuthClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Wrong email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(VA_ACCESS_COOKIE, data.session.access_token, getCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(VA_ACCESS_COOKIE, "", { ...getCookieOptions(), maxAge: 0 });
  return response;
}

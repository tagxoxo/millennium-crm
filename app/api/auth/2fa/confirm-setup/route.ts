import { NextRequest, NextResponse } from "next/server";
import {
  requirePasswordSession,
  unauthorizedResponse,
} from "@/lib/authSession";
import { verifyTotpCode } from "@/lib/twoFactor";
import { getCrmUser } from "@/lib/users";
import { getSupabaseServer } from "@/lib/supabase/server";
import { TWO_FA_REQUIRED_COOKIE, getCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!(await requirePasswordSession(request))) {
    return unauthorizedResponse();
  }

  const user = await getCrmUser();
  if (!user?.two_factor_secret) {
    return NextResponse.json(
      { error: "Generate a QR code first." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const code = String(body.code ?? "").trim();

  if (!verifyTotpCode(code, user.two_factor_secret)) {
    return NextResponse.json(
      { error: "Invalid code. Please try again." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("users")
    .update({
      two_factor_enabled: true,
      two_factor_verified: true,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TWO_FA_REQUIRED_COOKIE, "1", getCookieOptions());
  response.cookies.delete("crm_2fa_verified");

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  requirePasswordSession,
  unauthorizedResponse,
} from "@/lib/authSession";
import {
  buildOtpAuthUri,
  createTotpSecret,
} from "@/lib/twoFactor";
import { getCrmUser, getCrmUserEmail } from "@/lib/users";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (!(await requirePasswordSession(request))) {
    return unauthorizedResponse();
  }

  const user = await getCrmUser();
  if (!user) {
    return NextResponse.json(
      {
        error:
          "Users table not set up yet. Run supabase/add-users-2fa.sql in Supabase SQL Editor, then try again.",
      },
      { status: 500 }
    );
  }

  if (user.two_factor_enabled) {
    return NextResponse.json(
      { error: "2FA is already enabled. Disable it first to reconfigure." },
      { status: 400 }
    );
  }

  const secret = createTotpSecret();
  const email = user.email || getCrmUserEmail();
  const otpauthUrl = buildOtpAuthUri(email, secret);

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("users")
    .update({
      two_factor_secret: secret,
      two_factor_enabled: false,
      two_factor_verified: false,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({
    qrDataUrl,
    manualCode: secret,
    email,
  });
}

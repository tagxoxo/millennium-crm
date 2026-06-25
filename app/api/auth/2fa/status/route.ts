import { NextRequest, NextResponse } from "next/server";
import {
  requirePasswordSession,
  unauthorizedResponse,
} from "@/lib/authSession";
import { getCrmUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requirePasswordSession(request))) {
    return unauthorizedResponse();
  }

  const user = await getCrmUser();
  if (!user) {
    return NextResponse.json({ enabled: false, verified: false });
  }

  return NextResponse.json({
    enabled: user.two_factor_enabled,
    verified: user.two_factor_verified,
    email: user.email,
  });
}

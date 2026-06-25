import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, normalizePhone } from "@/lib/clients";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { Client, Policy } from "@/lib/types";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ clients: [], policies: [] });
  }

  const supabase = getSupabaseServer();
  const { data: clientsData } = await supabase.from("clients").select("*");
  const { data: policiesData } = await supabase.from("policies").select("*");

  const clients = ((clientsData ?? []) as Client[]).filter((c) => {
    const name = c.full_name.toLowerCase();
    const email = normalizeEmail(c.email);
    const phone = normalizePhone(c.phone);
    const qPhone = normalizePhone(q);
    return (
      name.includes(q) ||
      email.includes(q) ||
      (qPhone.length >= 3 && phone.includes(qPhone))
    );
  });

  const policies = ((policiesData ?? []) as Policy[]).filter((p) => {
    const name = p.client_name.toLowerCase();
    const email = normalizeEmail(p.email);
    const phone = normalizePhone(p.phone);
    const qPhone = normalizePhone(q);
    return (
      name.includes(q) ||
      email.includes(q) ||
      (qPhone.length >= 3 && phone.includes(qPhone))
    );
  });

  return NextResponse.json({
    clients: clients.slice(0, 8),
    policies: policies.slice(0, 8),
  });
}

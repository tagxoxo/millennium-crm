import { getSupabaseServer } from "@/lib/supabase/server";
import { getEnvOptional } from "@/lib/env";

export interface CrmUser {
  id: string;
  email: string;
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
  two_factor_verified: boolean;
  created_at: string;
}

export function getCrmUserEmail(): string {
  return getEnvOptional("BUSINESS_EMAIL") ?? "jacob@wilshireinsure.com";
}

/** Load the CRM admin user, creating the row if the table exists but is empty. */
export async function getCrmUser(): Promise<CrmUser | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getCrmUser:", error.message, error.code);
    return null;
  }

  if (data) {
    return data as CrmUser;
  }

  const email = getCrmUserEmail();
  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({ email })
    .select()
    .single();

  if (insertError) {
    console.error("getCrmUser insert:", insertError.message);
    return null;
  }

  return inserted as CrmUser;
}

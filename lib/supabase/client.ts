import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";

function browserEnv(name: string): string {
  const raw = process.env[name];
  if (!raw) throw new Error(`Missing environment variable: ${name}`);
  return cleanEnv(raw);
}

/** Browser-side Supabase client for interactive pages */
export function getSupabaseBrowser() {
  return createClient(
    browserEnv("NEXT_PUBLIC_SUPABASE_URL"),
    browserEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  );
}

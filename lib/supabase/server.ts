import { createClient } from "@supabase/supabase-js";
import { getEnv, getEnvOptional } from "@/lib/env";

/** Server-side Supabase client — uses secret key, never caches data */
export function getSupabaseServer() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key =
    getEnvOptional("SUPABASE_SECRET_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return createClient(url, key, {
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  });
}

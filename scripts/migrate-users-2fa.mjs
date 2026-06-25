#!/usr/bin/env node
/**
 * Verify the users table exists and seed the admin row for 2FA.
 * Run: npm run migrate:users-2fa
 * If the table is missing, paste supabase/add-users-2fa.sql in Supabase SQL Editor.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i);
      let val = t.slice(i + 1);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env.local */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.BUSINESS_EMAIL ?? "jacob@wilshireinsure.com";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: existing, error: selectError } = await supabase
  .from("users")
  .select("id, email")
  .limit(1)
  .maybeSingle();

if (selectError) {
  console.error("✗ users table not found:", selectError.message);
  console.log("\nPaste and run supabase/add-users-2fa.sql in Supabase SQL Editor:");
  console.log("https://supabase.com/dashboard → your project → SQL Editor → New query\n");
  process.exit(1);
}

if (existing) {
  console.log(`✓ users table exists. Admin user: ${existing.email}`);
  process.exit(0);
}

const { data: inserted, error: insertError } = await supabase
  .from("users")
  .insert({ email })
  .select("id, email")
  .single();

if (insertError) {
  console.error("✗ Could not create admin user:", insertError.message);
  process.exit(1);
}

console.log(`✓ Created admin user: ${inserted.email}`);

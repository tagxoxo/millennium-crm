#!/usr/bin/env node
/**
 * Verify (or remind you to create) the leads table in Supabase.
 * Run: node scripts/migrate-leads.mjs
 * If missing, paste supabase/add-leads.sql in Supabase SQL Editor.
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

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const { error } = await supabase.from("leads").select("id").limit(1);

if (!error) {
  console.log("✓ leads table exists and is accessible.");
  process.exit(0);
}

console.error("✗ leads table not found:", error.message);
console.log("\nPaste and run supabase/add-leads.sql in Supabase SQL Editor:");
console.log("https://supabase.com/dashboard → your project → SQL Editor → New query\n");
process.exit(1);

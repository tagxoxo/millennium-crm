#!/usr/bin/env node
/**
 * Apply a SQL migration file to Supabase automatically.
 *
 * Uses (in order):
 * 1. Supabase MCP (when connected in Cursor)
 * 2. Supabase Management API — set SUPABASE_ACCESS_TOKEN in .env.local
 * 3. Direct Postgres — set SUPABASE_DB_URL in .env.local
 *
 * Usage:
 *   npm run db:apply supabase/add-users-2fa.sql
 *   node scripts/apply-supabase-sql.mjs supabase/add-users-2fa.sql
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, "utf8");
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
  }
}

loadEnv();

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: node scripts/apply-supabase-sql.mjs <path-to.sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(sqlPath), "utf8");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

async function applyViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Management API failed (${res.status}): ${body}`);
  }

  console.log(`✓ Applied ${sqlPath} via Supabase Management API`);
  return true;
}

async function applyViaPostgres() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) return false;

  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`✓ Applied ${sqlPath} via direct Postgres`);
    return true;
  } finally {
    await client.end();
  }
}

try {
  if (await applyViaManagementApi()) process.exit(0);
  if (await applyViaPostgres()) process.exit(0);

  console.error("Could not apply migration automatically.");
  console.error("\nAdd ONE of these to .env.local, then re-run:");
  console.error("  SUPABASE_ACCESS_TOKEN=sbp_...  (from https://supabase.com/dashboard/account/tokens)");
  console.error("  SUPABASE_DB_URL=postgresql://...  (from Supabase → Settings → Database)");
  console.error("\nOr connect the Supabase plugin in Cursor (Settings → Tools & MCP → Supabase) and ask the agent to run the SQL.");
  process.exit(1);
} catch (err) {
  console.error("✗ Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}

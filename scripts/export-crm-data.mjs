#!/usr/bin/env node
/**
 * Export CRM data snapshot to backups/data/crm-snapshot.json (for disaster recovery).
 * Does NOT export .env, 2FA secrets, or R2 file bytes — only Supabase rows.
 * Run: node scripts/export-crm-data.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars — skip data export");
  process.exit(0);
}

const supabase = createClient(url, key);

async function fetchAll(table, select = "*") {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const policies = await fetchAll("policies");
const contactLog = await fetchAll("contact_log");
const policyDocuments = await fetchAll("policy_documents");
const automations = await fetchAll("automations");
const leads = await fetchAll("leads");

let users = [];
try {
  users = await fetchAll(
    "users",
    "id, email, two_factor_enabled, two_factor_verified, created_at"
  );
} catch {
  /* users table may not exist */
}

const snapshot = {
  exported_at: new Date().toISOString(),
  counts: {
    policies: policies.length,
    contact_log: contactLog.length,
    policy_documents: policyDocuments.length,
    automations: automations.length,
    leads: leads.length,
    users: users.length,
  },
  policies,
  contact_log: contactLog,
  policy_documents: policyDocuments,
  automations,
  leads,
  users,
};

mkdirSync("backups/data", { recursive: true });
writeFileSync(
  "backups/data/crm-snapshot.json",
  JSON.stringify(snapshot, null, 2)
);
console.log(
  `✓ Exported CRM snapshot (${policies.length} policies) → backups/data/crm-snapshot.json`
);

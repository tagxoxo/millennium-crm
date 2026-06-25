#!/usr/bin/env node
/**
 * Starts the Supabase MCP server using SUPABASE_ACCESS_TOKEN from .env.local
 */
import { readFileSync, existsSync } from "fs";
import { spawn } from "child_process";

function loadEnv() {
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
}

loadEnv();

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN in .env.local — create one at https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

const child = spawn(
  "npx",
  ["-y", "@supabase/mcp-server-supabase@latest"],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

child.on("exit", (code) => process.exit(code ?? 1));

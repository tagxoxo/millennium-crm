#!/bin/bash
# Sets Vercel env vars from .env.local (run from project root)
set -e
export PATH="/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

add_env() {
  local name="$1"
  local value="$2"
  local env="$3"
  printf '%s' "$value" | vercel env add "$name" "$env" 2>/dev/null || \
    printf '%s' "$value" | vercel env add "$name" "$env" --force
}

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  case "$key" in
    NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|CRM_PASSWORD)
      for env in production preview development; do
        add_env "$key" "$value" "$env"
        echo "Set $key for $env"
      done
      ;;
  esac
done < .env.local

echo "Done. Redeploying..."
vercel --prod --yes

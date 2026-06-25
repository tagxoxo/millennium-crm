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
  [[ -z "$value" ]] && continue
  case "$key" in
    NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|CRM_PASSWORD|GMAIL_USER|GMAIL_APP_PASSWORD|BUSINESS_EMAIL|BUSINESS_PHONE|CRON_SECRET|SUPABASE_ACCESS_TOKEN|CLOUDFLARE_API_TOKEN|CLOUDFLARE_R2_ACCESS_KEY_ID|CLOUDFLARE_R2_SECRET_ACCESS_KEY|CLOUDFLARE_R2_BUCKET_NAME|CLOUDFLARE_R2_ACCOUNT_ID|CLOUDFLARE_R2_S3_ENDPOINT)
      for env in production preview development; do
        add_env "$key" "$value" "$env"
        echo "Set $key for $env"
      done
      ;;
  esac
done < .env.local

echo "Done. Redeploying..."
vercel --prod --yes

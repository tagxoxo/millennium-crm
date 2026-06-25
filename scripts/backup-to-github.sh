#!/bin/bash
# Commit all CRM code changes and push to GitHub.
# Run: npm run backup   or   bash scripts/backup-to-github.sh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."

echo "=== Millennium CRM — backup to GitHub ==="

# Optional: refresh data snapshot before commit
if [ -f scripts/export-crm-data.mjs ] && [ -f .env.local ]; then
  node scripts/export-crm-data.mjs || echo "Note: data snapshot skipped (check .env.local)"
fi

git add -A

# Never stage secrets
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD .env 2>/dev/null || true

if git diff --staged --quiet; then
  echo "✓ Code already up to date on GitHub (nothing new to commit)"
else
  MSG="Auto-backup $(date '+%Y-%m-%d %H:%M %Z')"
  git commit -m "$MSG"
  echo "✓ Committed: $MSG"
fi

git push origin main
echo "✓ Pushed to https://github.com/tagxoxo/millennium-crm"
echo "Done."

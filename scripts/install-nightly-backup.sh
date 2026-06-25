#!/bin/bash
# Install automatic nightly CRM backup (8 PM Eastern daily → GitHub).
# Run once: bash scripts/install-nightly-backup.sh
set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$REPO/scripts/com.millennium-crm.nightly-backup.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.millennium-crm.nightly-backup.plist"
LOG_DIR="$REPO/backups/logs"

mkdir -p "$LOG_DIR"
chmod +x "$REPO/scripts/nightly-backup.sh"
chmod +x "$REPO/scripts/backup-to-github.sh"

cp "$PLIST_SRC" "$PLIST_DEST"
launchctl bootout "gui/$(id -u)/com.millennium-crm.nightly-backup" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"
launchctl enable "gui/$(id -u)/com.millennium-crm.nightly-backup"
launchctl kickstart -k "gui/$(id -u)/com.millennium-crm.nightly-backup" 2>/dev/null || true

echo ""
echo "✓ Nightly backup installed!"
echo "  Every night at 8:00 PM (Eastern) your Mac will:"
echo "    1. Export all policies/contacts from Supabase"
echo "    2. Save everything to GitHub"
echo ""
echo "  Log file: $LOG_DIR/nightly-backup.log"
echo "  Manual backup anytime: cd $REPO && npm run backup"
echo ""

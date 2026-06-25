#!/bin/bash
# Runs every night at 2 AM — exports CRM data and pushes to GitHub.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /Users/ai/millennium-crm
npm run backup >> backups/logs/nightly-backup.log 2>&1
echo "--- finished $(date) ---" >> backups/logs/nightly-backup.log

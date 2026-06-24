#!/bin/bash
# Helper script to push Millennium CRM to GitHub
# Run: bash publish-to-github.sh

echo ""
echo "=========================================="
echo "  Millennium CRM - Publish to GitHub"
echo "=========================================="
echo ""

# Make sure gh/git are available
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

read -p "What is your GitHub username? (see top-right of github.com when logged in): " USERNAME

if [ -z "$USERNAME" ]; then
  echo "Error: username is required."
  exit 1
fi

REPO="millennium-crm"
REMOTE="https://github.com/${USERNAME}/${REPO}.git"

echo ""
echo "STEP 1 - Create the repo in your browser (do this now):"
echo ""
echo "  Open: https://github.com/new"
echo ""
echo "  - Repository name: millennium-crm"
echo "  - Visibility: Private"
echo "  - Leave ALL checkboxes UNCHECKED (no README, no .gitignore)"
echo "  - Click green 'Create repository' button"
echo ""
read -p "Press ENTER after you created the repo..."

echo ""
echo "STEP 2 - Create a password token in your browser:"
echo ""
echo "  Open: https://github.com/settings/tokens/new?scopes=repo&description=Millennium+CRM"
echo ""
echo "  - Click 'Generate token' at the bottom"
echo "  - COPY the token (starts with ghp_...) — you only see it once!"
echo ""
read -p "Paste your token here and press ENTER: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "Error: token is required."
  exit 1
fi

echo ""
echo "STEP 3 - Uploading your code..."
echo ""

cd "$(dirname "$0")"

git remote remove origin 2>/dev/null
git remote add origin "$REMOTE"

# Push using token (token is not saved to disk)
git push "https://${TOKEN}@github.com/${USERNAME}/${REPO}.git" main

if [ $? -eq 0 ]; then
  echo ""
  echo "SUCCESS! Your CRM is on GitHub:"
  echo "  https://github.com/${USERNAME}/${REPO}"
  echo ""
  # Set remote back to normal URL without token embedded
  git remote set-url origin "$REMOTE"
else
  echo ""
  echo "Push failed. Double-check your username, token, and that you created the repo."
  exit 1
fi

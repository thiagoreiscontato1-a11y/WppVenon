#!/bin/bash
# Runs once when the Codespace is created: installs Chromium and dependencies, builds everything
# and creates a .env with a random password (unless ADMIN_PASSWORD comes from a Codespaces secret).
set -e
cd "$(dirname "$0")/.."

sudo apt-get update
sudo apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji

npm ci
(cd web && npm ci)
npm run build
npm run web:build

if [ -z "$ADMIN_PASSWORD" ] && [ ! -f .env ]; then
  random() { node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"; }
  cat > .env <<ENV
ADMIN_USER=admin
ADMIN_PASSWORD=$(random 10)
SESSION_SECRET=$(random 32)
ENV
  echo "Created .env with a random password."
fi

#!/usr/bin/env bash
#
# setup-mainnet-env.sh — Configure mainnet environment on the RuneBolt server.
# Appends missing env vars, verifies required vars, and restarts PM2.
#
set -euo pipefail

SERVER="64.23.226.113"
SSH_KEY="$HOME/.ssh/runebolt"
REMOTE_ENV="/root/runebolt/.env"

echo "=== RuneBolt Mainnet Environment Setup ==="
echo "Server: $SERVER"
echo ""

ssh -i "$SSH_KEY" "root@$SERVER" bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

ENV_FILE="/root/runebolt/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

echo "Current .env found. Checking for missing vars..."

# Helper: append a var if it's not already in the file
ensure_var() {
  local key="$1"
  local value="$2"
  if ! grep -q "^${key}=" "$ENV_FILE"; then
    echo "${key}=${value}" >> "$ENV_FILE"
    echo "  ADDED: ${key}=${value}"
  else
    echo "  EXISTS: ${key} ($(grep "^${key}=" "$ENV_FILE"))"
  fi
}

ensure_var "BITCOIN_NETWORK" "mainnet"
ensure_var "CORS_ORIGIN" "https://app.runebolt.io"
ensure_var "MEMPOOL_API_URL" "https://mempool.space/api"
ensure_var "NODE_ENV" "production"

echo ""
echo "--- Verifying required env vars ---"

REQUIRED_VARS="PORT NODE_ENV DATABASE_URL JWT_SECRET BITCOIN_NETWORK CORS_ORIGIN REDIS_HOST REDIS_PORT"
MISSING=0

for var in $REQUIRED_VARS; do
  if grep -q "^${var}=" "$ENV_FILE"; then
    echo "  OK: $var"
  else
    echo "  MISSING: $var"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "WARNING: $MISSING required variable(s) missing from $ENV_FILE"
  echo "Fix these before restarting the service."
  exit 1
fi

echo ""
echo "All required vars present. Restarting PM2..."
cd /root/runebolt
pm2 restart runebolt --update-env || pm2 start dist/index.js --name runebolt
pm2 save

echo ""
echo "=== Mainnet environment setup complete ==="
REMOTE_SCRIPT

echo "Done."

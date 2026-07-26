#!/usr/bin/env bash
# deploy-production.sh — Deploy RuneBolt backend to production server
#
# Usage: ./scripts/deploy-production.sh
#
# Prerequisites:
#   - SSH key access to the production server
#   - Node.js and pm2 installed on the server
#   - PostgreSQL configured and accessible from the server

set -euo pipefail

# ==================== Configuration ====================
SERVER_IP="${SERVER_IP:-your.server.ip}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/runebolt/backend}"
SSH_USER="${SSH_USER:-deploy}"
PM2_APP_NAME="runebolt-backend"
HEALTH_ENDPOINT="http://localhost:3141/health"
AUTH_ENDPOINT="http://localhost:3141/api/v1/auth/auth/challenge"

# ==================== Helpers ====================
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { log "ERROR: $*"; exit 1; }

ssh_cmd() {
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER_IP}" "$@"
}

# ==================== Pre-flight Checks ====================
log "Starting RuneBolt production deployment"

if [ "$SERVER_IP" = "your.server.ip" ]; then
  die "Set SERVER_IP before deploying (export SERVER_IP=x.x.x.x)"
fi

if [ ! -f "$SSH_KEY" ]; then
  die "SSH key not found at $SSH_KEY"
fi

# ==================== Step 1: Build ====================
log "Building TypeScript..."
npm run build || die "Build failed"
log "Build succeeded"

# ==================== Step 2: Local Smoke Tests ====================
log "Running local smoke tests..."
if [ -f scripts/smoke-test.sh ]; then
  bash scripts/smoke-test.sh "http://localhost:3141" || log "WARN: Local smoke tests failed (server may not be running locally)"
else
  log "WARN: smoke-test.sh not found, skipping local smoke tests"
fi

# ==================== Step 3: Sync to Server ====================
log "Syncing dist/ to ${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/"
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
  dist/ \
  package.json \
  package-lock.json \
  "${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/"

# Also sync migrations if they exist
if [ -d migrations ]; then
  rsync -avz \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
    migrations/ \
    "${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/migrations/"
fi

log "Sync complete"

# ==================== Step 4: Remote Deploy ====================
log "Deploying on remote server..."
ssh_cmd bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/runebolt/backend}"
PM2_APP_NAME="runebolt-backend"

cd "$DEPLOY_PATH"

echo "[remote] Installing production dependencies..."
npm install --omit=dev

echo "[remote] Running database migrations..."
if [ -d migrations ]; then
  node -e "
    const Database = require('./dist/db/Database').default;
    const db = Database.getInstance();
    db.initialize();
    db.runMigrations().then(() => {
      console.log('Migrations complete');
      return db.close();
    }).catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
  "
fi

echo "[remote] Restarting application..."
pm2 restart "$PM2_APP_NAME" || pm2 start dist/index.js --name "$PM2_APP_NAME"

echo "[remote] Waiting for server to start..."
sleep 5

echo "[remote] Verifying health endpoint..."
HEALTH=$(curl -sf http://localhost:3141/health) || { echo "Health check failed"; exit 1; }
STATUS=$(echo "$HEALTH" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).status" 2>/dev/null || echo "unknown")
if [ "$STATUS" != "ok" ]; then
  echo "Health check returned status: $STATUS"
  exit 1
fi
echo "[remote] Health check passed: $STATUS"

echo "[remote] Verifying auth challenge endpoint..."
AUTH_RESULT=$(curl -sf -X POST http://localhost:3141/api/v1/auth/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}') || { echo "Auth challenge check failed"; exit 1; }
echo "[remote] Auth challenge check passed"

echo "[remote] Deployment verified successfully"
REMOTE_SCRIPT

log "========================================"
log "Deployment successful!"
log "Server: ${SSH_USER}@${SERVER_IP}"
log "Path: ${DEPLOY_PATH}"
log "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
log "========================================"

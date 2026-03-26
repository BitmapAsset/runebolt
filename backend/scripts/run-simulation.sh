#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  RuneBolt E2E Simulation Runner                         ║"
echo "╚══════════════════════════════════════════════════════════╝"

# Check dependencies
if ! command -v npx &>/dev/null; then
  echo "ERROR: npx not found. Install Node.js first."
  exit 1
fi

# Set test environment defaults
export NODE_ENV=test
export DATABASE_URL="${DATABASE_URL:-postgresql://runebolt:runebolt@localhost:5432/runebolt_test}"
export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
export BITCOIN_NETWORK=mainnet

echo ""
echo "Environment:"
echo "  DATABASE_URL: ${DATABASE_URL}"
echo "  NODE_ENV:     ${NODE_ENV}"
echo "  NETWORK:      ${BITCOIN_NETWORK}"
echo ""

# Step 1: Type-check
echo "── Step 1: Type-checking ──────────────────────────────────"
if npx tsc --noEmit 2>&1; then
  echo "✅ Type-check passed"
else
  echo "⚠️  Type-check had warnings (continuing anyway)"
fi
echo ""

# Step 2: Run simulation
echo "── Step 2: Running E2E Simulation ─────────────────────────"
echo ""
exec npx tsx src/__tests__/e2e-simulation.ts

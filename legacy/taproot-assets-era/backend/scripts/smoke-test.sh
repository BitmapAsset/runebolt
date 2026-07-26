#!/usr/bin/env bash
# smoke-test.sh — Quick validation of RuneBolt backend endpoints
#
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL: http://localhost:3141

set -uo pipefail

BASE_URL="${1:-http://localhost:3141}"
PASSED=0
FAILED=0

# Test helper: check HTTP status and optional body match
check() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_status="$4"
  local body_match="${5:-}"
  local data="${6:-}"

  local args=(-s -o /tmp/smoke_body -w "%{http_code}" -X "$method")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi

  local status
  status=$(curl "${args[@]}" "$url" 2>/dev/null)

  local body
  body=$(cat /tmp/smoke_body 2>/dev/null || echo "")

  if [ "$status" != "$expected_status" ]; then
    echo "FAIL  $name — expected $expected_status, got $status"
    FAILED=$((FAILED + 1))
    return
  fi

  if [ -n "$body_match" ]; then
    if ! echo "$body" | grep -q "$body_match"; then
      echo "FAIL  $name — response body missing '$body_match'"
      FAILED=$((FAILED + 1))
      return
    fi
  fi

  echo "PASS  $name"
  PASSED=$((PASSED + 1))
}

echo "Running smoke tests against $BASE_URL"
echo "========================================"

# 1. Health endpoint
check "GET /health → 200 + status ok" \
  GET "$BASE_URL/health" 200 '"status":"ok"'

# 2. Root endpoint
check "GET / → 200 + version" \
  GET "$BASE_URL/" 200 '"version"'

# 3. Auth challenge
check "POST /api/v1/auth/auth/challenge → 200 + success" \
  POST "$BASE_URL/api/v1/auth/auth/challenge" 200 '"success":true' \
  '{"pubkey":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'

# 4. Fee schedule
check "GET /api/v1/fees/schedule → 200 + success" \
  GET "$BASE_URL/api/v1/fees/schedule" 200 '"success":true'

# 5. Stats endpoint
check "GET /api/v1/stats → 200 + success" \
  GET "$BASE_URL/api/v1/stats" 200 '"success":true'

echo "========================================"
echo "Results: $PASSED passed, $FAILED failed"

rm -f /tmp/smoke_body

if [ "$FAILED" -gt 0 ]; then
  echo "Smoke tests FAILED"
  exit 1
fi

echo "All smoke tests PASSED"
exit 0

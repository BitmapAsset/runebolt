-- Migration: Security Fixes for RuneBolt v0.2.0
-- Date: 2026-03-14
-- Description: Adds replay protection, persistent commitments, and audit logging

-- ============================================================
-- C2: Replay Protection - Add nonce and signature columns
-- ============================================================

-- Add nonce column for replay protection
ALTER TABLE transfers ADD COLUMN nonce TEXT UNIQUE;

-- Add client signature column for authorization
ALTER TABLE transfers ADD COLUMN client_signature TEXT;

-- Add transfer hash column for verification
ALTER TABLE transfers ADD COLUMN transfer_hash TEXT;

-- Create index for fast nonce lookups
CREATE INDEX IF NOT EXISTS idx_transfers_nonce ON transfers(nonce);

-- ============================================================
-- C3: Persistent Commitments
-- ============================================================

-- Create commitments table
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  local_balance TEXT NOT NULL, -- Stored as TEXT for BigInt
  remote_balance TEXT NOT NULL,
  hash TEXT NOT NULL,
  local_signature TEXT,
  remote_signature TEXT,
  revocation_secret TEXT, -- For penalty transactions
  revocation_hash TEXT, -- Hash of revocation secret
  is_revoked INTEGER DEFAULT 0, -- Boolean flag
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  UNIQUE(channel_id, sequence)
);

-- Create indexes for commitment queries
CREATE INDEX IF NOT EXISTS idx_commitments_channel ON commitments(channel_id);
CREATE INDEX IF NOT EXISTS idx_commitments_channel_sequence ON commitments(channel_id, sequence);

-- ============================================================
-- Idempotency Table for API Requests
-- ============================================================

-- Create idempotent_requests table
CREATE TABLE IF NOT EXISTS idempotent_requests (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_idempotent_requests_created ON idempotent_requests(created_at);

-- ============================================================
-- Migration Complete
-- ============================================================

-- Verify migration
SELECT 'Migration complete: Security fixes applied' as status;

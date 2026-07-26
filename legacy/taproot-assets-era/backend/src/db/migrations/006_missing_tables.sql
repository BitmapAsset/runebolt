-- Migration 006: Create all missing tables required for mainnet
-- Ensures tables exist that other migrations/code depend on

-- ============================================================
-- user_transaction_counts: tracks per-user transaction counts and free tier
-- ============================================================
CREATE TABLE IF NOT EXISTS user_transaction_counts (
  pubkey TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  free_remaining INTEGER NOT NULL DEFAULT 500,
  total_fees_paid BIGINT NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- fee_records: individual fee collection records
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID,
  pubkey TEXT NOT NULL,
  amount BIGINT NOT NULL,
  fee_type TEXT NOT NULL,
  fee_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_records_pubkey ON fee_records(pubkey);
CREATE INDEX IF NOT EXISTS idx_fee_records_transfer ON fee_records(transfer_id);

-- ============================================================
-- fee_ledger: detailed per-transfer fee audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pubkey TEXT NOT NULL,
  transfer_id UUID,
  fee_amount BIGINT NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'off_chain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_user ON fee_ledger(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_transfer ON fee_ledger(transfer_id);

-- ============================================================
-- user_tiers: tracks user pricing tier
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tiers (
  pubkey TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'free',
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- transaction_status: WebSocket-driven transaction tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  from_pubkey TEXT,
  to_pubkey TEXT,
  amount BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transaction_status_from ON transaction_status(from_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_to ON transaction_status(to_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_status ON transaction_status(status);

-- ============================================================
-- Security tables (re-create with IF NOT EXISTS for safety)
-- ============================================================
CREATE TABLE IF NOT EXISTS revocation_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  sequence INTEGER NOT NULL,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_revocation_secrets_channel ON revocation_secrets(channel_id);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  latest_sequence INTEGER NOT NULL,
  challenge_deadline TIMESTAMPTZ NOT NULL,
  broadcast_txid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

CREATE TABLE IF NOT EXISTS breach_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  breach_txid TEXT NOT NULL,
  breach_tx_hex TEXT,
  penalty_txid TEXT,
  penalty_tx_hex TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_attempts_channel ON breach_attempts(channel_id);
CREATE INDEX IF NOT EXISTS idx_breach_attempts_status ON breach_attempts(status);

-- ============================================================
-- DB constraints
-- ============================================================

-- Ensure channel balances never go negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'channels_balance_positive'
  ) THEN
    ALTER TABLE channels ADD CONSTRAINT channels_balance_positive
      CHECK (local_balance >= 0 AND remote_balance >= 0);
  END IF;
END $$;

-- Ensure transfer nonces are unique (may already exist from migration 001_security_fixes)
-- The nonce column already has UNIQUE constraint from ALTER TABLE, skip if exists

-- Remove FK constraint on challenges.pubkey so new users can auth before existing in users table
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_pubkey_fkey;

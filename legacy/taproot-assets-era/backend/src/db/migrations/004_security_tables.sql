-- Migration 004: Security tables for penalty, dispute, and breach detection
-- Required for mainnet safety: revocation enforcement, dispute resolution, watchtower

-- Revocation secrets: stored when counterparty reveals secret for old commitment
CREATE TABLE IF NOT EXISTS revocation_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id),
  sequence INTEGER NOT NULL,
  secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_revocation_secrets_channel
  ON revocation_secrets(channel_id);

-- Disputes: tracks unilateral close disputes and challenge windows
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id),
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  latest_sequence INTEGER NOT NULL,
  challenge_deadline TIMESTAMPTZ NOT NULL,
  broadcast_txid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON disputes(status);

-- Breach attempts: records detected old-state broadcasts and penalty responses
CREATE TABLE IF NOT EXISTS breach_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  breach_txid TEXT NOT NULL,
  breach_tx_hex TEXT NOT NULL,
  penalty_txid TEXT,
  penalty_tx_hex TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breach_attempts_channel
  ON breach_attempts(channel_id);
CREATE INDEX IF NOT EXISTS idx_breach_attempts_status
  ON breach_attempts(status);

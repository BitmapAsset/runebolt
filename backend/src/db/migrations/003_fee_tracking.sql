-- RuneBolt Migration 003: Enhanced fee tracking
-- Adds free_remaining and total_fees_paid columns to user_transaction_counts,
-- and creates fee_ledger table for detailed fee audit trail.

-- ============================================================
-- Enhance user_transaction_counts with free_remaining and total_fees_paid
-- ============================================================
ALTER TABLE user_transaction_counts
    ADD COLUMN IF NOT EXISTS free_remaining INTEGER NOT NULL DEFAULT 500,
    ADD COLUMN IF NOT EXISTS total_fees_paid BIGINT NOT NULL DEFAULT 0;

-- Backfill free_remaining from existing count data
UPDATE user_transaction_counts
SET free_remaining = GREATEST(0, 500 - count)
WHERE free_remaining = 500 AND count > 0;

-- ============================================================
-- Fee ledger — detailed per-transfer fee audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pubkey TEXT NOT NULL,
    transfer_id UUID NOT NULL,
    fee_amount BIGINT NOT NULL,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('free', 'off_chain', 'settlement')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_ledger_user ON fee_ledger(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_transfer ON fee_ledger(transfer_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_created ON fee_ledger(created_at);

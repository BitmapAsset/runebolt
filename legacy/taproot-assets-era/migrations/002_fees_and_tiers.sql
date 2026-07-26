-- RuneBolt Migration 002: Fee system and user tiers
-- Adds free tier tracking, fee records, and user tier management

-- ============================================================
-- User transaction counts (tracks free tier usage)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_transaction_counts (
    pubkey TEXT PRIMARY KEY REFERENCES users(pubkey),
    count INTEGER NOT NULL DEFAULT 0,
    last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tx_counts_last_reset ON user_transaction_counts(last_reset);

-- ============================================================
-- Fee records (accounting trail for all fees collected)
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL,
    pubkey TEXT NOT NULL REFERENCES users(pubkey),
    amount BIGINT NOT NULL,
    fee_type TEXT NOT NULL CHECK (fee_type IN ('off_chain', 'settlement')),
    fee_rate NUMERIC(10, 6) NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_records_transfer ON fee_records(transfer_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_pubkey ON fee_records(pubkey);
CREATE INDEX IF NOT EXISTS idx_fee_records_collected ON fee_records(collected_at);

-- ============================================================
-- User tiers
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tiers (
    pubkey TEXT PRIMARY KEY REFERENCES users(pubkey),
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'standard')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at on user_tiers
CREATE OR REPLACE FUNCTION update_user_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_tiers_updated_at ON user_tiers;
CREATE TRIGGER trigger_user_tiers_updated_at
    BEFORE UPDATE ON user_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tiers_updated_at();

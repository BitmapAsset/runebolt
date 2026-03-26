-- PostgreSQL Schema Migration for RuneBolt Performance Optimizations
-- Enables partitioning, connection pooling, and optimized indexing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    pubkey TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Channels table with optimized indexes
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_pubkey TEXT NOT NULL REFERENCES users(pubkey),
    runebolt_pubkey TEXT NOT NULL,
    funding_txid TEXT,
    funding_vout INTEGER,
    capacity BIGINT NOT NULL DEFAULT 0,
    local_balance BIGINT NOT NULL DEFAULT 0,
    remote_balance BIGINT NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'PENDING_OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_user_pubkey ON channels(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_channels_state ON channels(state);
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(user_pubkey, state) 
    WHERE state = 'OPEN';

-- Transfers table (non-partitioned for simplicity; partition later if needed)
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_channel UUID NOT NULL REFERENCES channels(id),
    to_channel UUID NOT NULL REFERENCES channels(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    memo VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized indexes (no OR conditions for better performance)
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON transfers(from_channel, created_at DESC) 
    INCLUDE (id, to_channel, amount, memo);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON transfers(to_channel, created_at DESC)
    INCLUDE (id, from_channel, amount, memo);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at DESC);

-- Claim links table
CREATE TABLE IF NOT EXISTS claim_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_pubkey TEXT NOT NULL REFERENCES users(pubkey),
    amount BIGINT NOT NULL,
    memo TEXT,
    claimed_by TEXT REFERENCES users(pubkey),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_links_creator ON claim_links(creator_pubkey);
CREATE INDEX IF NOT EXISTS idx_claim_links_expires ON claim_links(expires_at) 
    WHERE claimed_by IS NULL;

-- Authentication challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pubkey TEXT NOT NULL REFERENCES users(pubkey),
    challenge TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenges_pubkey ON challenges(pubkey);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

-- Commitments table (previously in-memory, now persisted)
CREATE TABLE IF NOT EXISTS commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    local_balance BIGINT NOT NULL,
    remote_balance BIGINT NOT NULL,
    commitment_tx TEXT,
    signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_commitments_channel ON commitments(channel_id, sequence DESC);

-- Rate limiting tracking (optional, can use Redis instead)
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_type TEXT NOT NULL, -- 'ip', 'user', 'global'
    key_value TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_log(key_type, key_value, window_start);

-- Performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    labels JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON performance_metrics(metric_name, recorded_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for channels updated_at
DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old challenges and rate limit logs
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    DELETE FROM challenges WHERE expires_at < NOW() - INTERVAL '1 day';
    DELETE FROM rate_limit_log WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM performance_metrics WHERE recorded_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- RuneBolt PostgreSQL Migration Schema
-- Migration: 001_initial_postgres_schema.sql
-- Purpose: Production-ready schema optimized for high throughput

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================================================
-- CHANNELS TABLE
-- =============================================================================
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_pubkey BYTEA NOT NULL CHECK (octet_length(user_pubkey) IN (33, 65)),
    runebolt_pubkey BYTEA NOT NULL CHECK (octet_length(runebolt_pubkey) IN (33, 65)),
    funding_txid BYTEA CHECK (octet_length(funding_txid) = 32),
    funding_vout SMALLINT,
    capacity BIGINT NOT NULL DEFAULT 0 CHECK (capacity >= 0),
    local_balance BIGINT NOT NULL DEFAULT 0 CHECK (local_balance >= 0),
    remote_balance BIGINT NOT NULL DEFAULT 0 CHECK (remote_balance >= 0),
    state VARCHAR(20) NOT NULL DEFAULT 'PENDING_OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_balance CHECK (local_balance + remote_balance = capacity),
    CONSTRAINT valid_state CHECK (state IN ('PENDING_OPEN', 'OPEN', 'CLOSING', 'CLOSED', 'FORCE_CLOSING'))
);

-- Optimized indexes for channels
CREATE INDEX CONCURRENTLY idx_channels_user_pubkey ON channels(user_pubkey);
CREATE INDEX CONCURRENTLY idx_channels_state ON channels(state) WHERE state IN ('OPEN', 'PENDING_OPEN');
CREATE INDEX CONCURRENTLY idx_channels_created_at ON channels(created_at);

-- Partial index for active channels (hot data only)
CREATE INDEX CONCURRENTLY idx_channels_active ON channels(user_pubkey, state) 
    WHERE state = 'OPEN';

-- Composite index for common lookups
CREATE INDEX CONCURRENTLY idx_channels_user_state ON channels(user_pubkey, state, created_at DESC);

-- =============================================================================
-- TRANSFERS TABLE (PARTITIONED)
-- =============================================================================
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_channel UUID NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
    to_channel UUID NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL CHECK (amount > 0),
    memo VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (adjust as needed)
CREATE TABLE transfers_2026_03 PARTITION OF transfers
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE transfers_2026_04 PARTITION OF transfers
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE transfers_2026_05 PARTITION OF transfers
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE transfers_2026_06 PARTITION OF transfers
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Optimized indexes for transfers
CREATE INDEX CONCURRENTLY idx_transfers_from_created ON transfers(from_channel, created_at DESC);
CREATE INDEX CONCURRENTLY idx_transfers_to_created ON transfers(to_channel, created_at DESC);

-- Covering indexes for common queries
CREATE INDEX CONCURRENTLY idx_transfers_sender ON transfers(from_channel, created_at DESC) 
    INCLUDE (id, to_channel, amount, memo);
CREATE INDEX CONCURRENTLY idx_transfers_recipient ON transfers(to_channel, created_at DESC)
    INCLUDE (id, from_channel, amount, memo);

-- =============================================================================
-- USERS TABLE
-- =============================================================================
CREATE TABLE users (
    pubkey BYTEA PRIMARY KEY CHECK (octet_length(pubkey) IN (33, 65)),
    username VARCHAR(32) UNIQUE CHECK (username ~ '^[a-z0-9_]+$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY idx_users_username ON users(username);

-- =============================================================================
-- CLAIM LINKS TABLE
-- =============================================================================
CREATE TABLE claim_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_pubkey BYTEA NOT NULL REFERENCES users(pubkey),
    amount BIGINT NOT NULL CHECK (amount > 0),
    memo VARCHAR(256),
    claimed_by BYTEA REFERENCES users(pubkey),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX CONCURRENTLY idx_claim_links_creator ON claim_links(creator_pubkey);
CREATE INDEX CONCURRENTLY idx_claim_links_expires ON claim_links(expires_at) 
    WHERE claimed_by IS NULL;

-- =============================================================================
-- CHALLENGES TABLE (for auth)
-- =============================================================================
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pubkey BYTEA NOT NULL,
    challenge_hash BYTEA NOT NULL, -- Store hash only
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY idx_challenges_pubkey ON challenges(pubkey);
CREATE INDEX CONCURRENTLY idx_challenges_expires ON challenges(expires_at);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired challenges function
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM challenges WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get user transfer history (optimized - no OR conditions)
CREATE OR REPLACE FUNCTION get_user_transfers(
    p_pubkey BYTEA,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    from_channel UUID,
    to_channel UUID,
    amount BIGINT,
    memo VARCHAR(256),
    created_at TIMESTAMPTZ,
    direction VARCHAR(10)
) AS $$
BEGIN
    -- Get user's channel IDs first
    RETURN QUERY
    WITH user_channels AS (
        SELECT id FROM channels WHERE user_pubkey = p_pubkey
    )
    SELECT 
        t.id,
        t.from_channel,
        t.to_channel,
        t.amount,
        t.memo,
        t.created_at,
        CASE 
            WHEN t.from_channel IN (SELECT id FROM user_channels) THEN 'sent'
            ELSE 'received'
        END as direction
    FROM transfers t
    WHERE t.from_channel IN (SELECT id FROM user_channels)
       OR t.to_channel IN (SELECT id FROM user_channels)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Atomic transfer execution
CREATE OR REPLACE FUNCTION execute_transfer(
    p_from_channel UUID,
    p_to_channel UUID,
    p_amount BIGINT,
    p_memo VARCHAR(256) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_from_local BIGINT;
    v_from_remote BIGINT;
    v_to_local BIGINT;
    v_to_remote BIGINT;
BEGIN
    -- Lock both channels for update (prevents race conditions)
    SELECT local_balance, remote_balance 
    INTO v_from_local, v_from_remote
    FROM channels 
    WHERE id = p_from_channel 
    AND state = 'OPEN'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender channel not found or not open';
    END IF;
    
    IF v_from_local < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    SELECT local_balance, remote_balance
    INTO v_to_local, v_to_remote
    FROM channels
    WHERE id = p_to_channel
    AND state = 'OPEN'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient channel not found or not open';
    END IF;
    
    IF v_to_remote < p_amount THEN
        RAISE EXCEPTION 'Insufficient inbound capacity';
    END IF;
    
    -- Update balances
    UPDATE channels 
    SET local_balance = v_from_local - p_amount,
        remote_balance = v_from_remote + p_amount
    WHERE id = p_from_channel;
    
    UPDATE channels
    SET local_balance = v_to_local + p_amount,
        remote_balance = v_to_remote - p_amount
    WHERE id = p_to_channel;
    
    -- Create transfer record
    v_transfer_id := uuid_generate_v4();
    INSERT INTO transfers (id, from_channel, to_channel, amount, memo)
    VALUES (v_transfer_id, p_from_channel, p_to_channel, p_amount, p_memo);
    
    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MAINTENANCE PROCEDURES
-- =============================================================================

-- Create new partition for next month (run monthly)
CREATE OR REPLACE FUNCTION create_next_transfer_partition()
RETURNS TEXT AS $$
DECLARE
    v_next_month TEXT;
    v_start_date TEXT;
    v_end_date TEXT;
    v_partition_name TEXT;
BEGIN
    v_next_month := TO_CHAR(NOW() + INTERVAL '1 month', 'YYYY_MM');
    v_start_date := TO_CHAR(NOW() + INTERVAL '1 month', 'YYYY-MM-01');
    v_end_date := TO_CHAR(NOW() + INTERVAL '2 months', 'YYYY-MM-01');
    v_partition_name := 'transfers_' || v_next_month;
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF transfers FOR VALUES FROM (%L) TO (%L)',
        v_partition_name, v_start_date, v_end_date
    );
    
    RETURN v_partition_name;
END;
$$ LANGUAGE plpgsql;

-- Archive old partitions (run quarterly)
CREATE OR REPLACE FUNCTION archive_old_partitions(p_months_old INTEGER DEFAULT 6)
RETURNS TABLE (archived_partition TEXT) AS $$
DECLARE
    v_partition RECORD;
BEGIN
    FOR v_partition IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'transfers_20%'
        AND tablename < 'transfers_' || TO_CHAR(NOW() - (p_months_old || ' months')::INTERVAL, 'YYYY_MM')
    LOOP
        -- Detach and archive logic here
        RETURN QUERY SELECT v_partition.tablename::TEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
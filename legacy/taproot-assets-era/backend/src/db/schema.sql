CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  user_pubkey TEXT NOT NULL,
  runebolt_pubkey TEXT NOT NULL,
  funding_txid TEXT,
  funding_vout INTEGER,
  capacity BIGINT NOT NULL DEFAULT 0,
  local_balance BIGINT NOT NULL DEFAULT 0,
  remote_balance BIGINT NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'PENDING_OPEN',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_channels_user_pubkey ON channels(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_channels_state ON channels(state);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  from_channel TEXT NOT NULL,
  to_channel TEXT NOT NULL,
  amount BIGINT NOT NULL,
  memo TEXT,
  nonce TEXT UNIQUE, -- REPLAY PROTECTION: prevents double-spends
  client_signature TEXT, -- Client signature for the transfer
  transfer_hash TEXT, -- Hash of transfer details for verification
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_channel) REFERENCES channels(id),
  FOREIGN KEY (to_channel) REFERENCES channels(id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_channel);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_channel);
CREATE INDEX IF NOT EXISTS idx_transfers_nonce ON transfers(nonce); -- Fast nonce lookups for replay protection

CREATE TABLE IF NOT EXISTS users (
  pubkey TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS claim_links (
  id TEXT PRIMARY KEY,
  creator_pubkey TEXT NOT NULL,
  amount BIGINT NOT NULL,
  memo TEXT,
  claimed_by TEXT,
  claimed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_links_creator ON claim_links(creator_pubkey);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenges_pubkey ON challenges(pubkey);

-- Commitments table for persistent storage of channel commitment states
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

CREATE INDEX IF NOT EXISTS idx_commitments_channel ON commitments(channel_id);
CREATE INDEX IF NOT EXISTS idx_commitments_channel_sequence ON commitments(channel_id, sequence);

-- Idempotency table for API requests to prevent duplicate operations
CREATE TABLE IF NOT EXISTS idempotent_requests (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotent_requests_created ON idempotent_requests(created_at);

-- Transaction status tracking for real-time WebSocket updates
CREATE TABLE IF NOT EXISTS transaction_status (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'transfer', 'claim', 'deposit', 'withdrawal'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirming', 'confirmed', 'failed'
  from_pubkey TEXT,
  to_pubkey TEXT,
  amount BIGINT,
  metadata TEXT, -- JSON blob for additional data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_status_from ON transaction_status(from_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_to ON transaction_status(to_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_status ON transaction_status(status);
CREATE INDEX IF NOT EXISTS idx_transaction_status_updated ON transaction_status(updated_at);

-- Username registry table with additional constraints
CREATE TABLE IF NOT EXISTS username_registry (
  username TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pubkey) REFERENCES users(pubkey) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_username_registry_pubkey ON username_registry(pubkey);

-- Social auth providers table
CREATE TABLE IF NOT EXISTS social_auth (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- 'google', 'apple', 'email'
  provider_user_id TEXT NOT NULL,
  email TEXT,
  username TEXT,
  pubkey TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_auth_pubkey ON social_auth(pubkey);
CREATE INDEX IF NOT EXISTS idx_social_auth_provider ON social_auth(provider, provider_user_id);

-- Claim links enhanced table (already exists, but document here)
-- Supports both registered and unregistered recipients

-- Transaction status tracking for WebSocket updates
CREATE TABLE IF NOT EXISTS transaction_status (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'transfer', 'claim', 'deposit', 'withdrawal'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirming', 'confirmed', 'failed'
  from_pubkey TEXT,
  to_pubkey TEXT,
  amount INTEGER,
  metadata TEXT, -- JSON blob for additional data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transaction_status_from ON transaction_status(from_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_to ON transaction_status(to_pubkey);
CREATE INDEX IF NOT EXISTS idx_transaction_status_status ON transaction_status(status);

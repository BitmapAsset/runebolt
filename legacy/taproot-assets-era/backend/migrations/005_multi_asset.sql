-- Migration 005: Multi-asset support
-- Adds tables for asset registry, escrows (Bitmap NFT trading), and asset balances (BRC-20 channel tracking).
--
-- NOTE: BRC-20 and Bitmap inscriptions use DIFFERENT on-chain mechanisms than Runes.
-- Runes use Runestone OP_RETURN; BRC-20 uses inscription JSON; Bitmap uses escrow model.

-- ==================== Assets Table ====================
-- Central registry of supported assets and their configuration.
CREATE TABLE IF NOT EXISTS assets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('rune', 'btc', 'brc20', 'inscription')),
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);

-- Seed initial assets
INSERT INTO assets (id, name, type, config) VALUES
  ('dog',    'DOG',     'rune',        '{"runeId": "840000:3", "decimals": 5}'),
  ('btc',    'Bitcoin', 'btc',         '{"decimals": 8}'),
  ('ordi',   'ORDI',    'brc20',       '{"ticker": "ordi", "decimals": 18}'),
  ('bitmap', 'Bitmap',  'inscription', '{"decimals": 0}')
ON CONFLICT (id) DO NOTHING;

-- ==================== Escrows Table ====================
-- Bitmap (NFT inscription) escrow for atomic swaps.
-- Seller deposits inscription, buyer deposits payment, hub releases both atomically.
CREATE TABLE IF NOT EXISTS escrows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pubkey   TEXT NOT NULL,
  buyer_pubkey    TEXT NOT NULL,
  inscription_id  TEXT NOT NULL,
  price_asset     TEXT NOT NULL REFERENCES assets(id),
  price_amount    NUMERIC NOT NULL CHECK (price_amount > 0),
  status          TEXT NOT NULL DEFAULT 'created'
                    CHECK (status IN ('created', 'inscription_deposited', 'payment_deposited',
                                      'both_deposited', 'executing', 'completed', 'refunded', 'expired')),
  timeout_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrows_seller ON escrows(seller_pubkey);
CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer_pubkey);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status) WHERE status NOT IN ('completed', 'refunded', 'expired');
CREATE INDEX IF NOT EXISTS idx_escrows_timeout ON escrows(timeout_at) WHERE status NOT IN ('completed', 'refunded', 'expired');

-- ==================== Escrow Deposits Table ====================
-- Tracks individual deposits (inscription or payment) for each escrow.
CREATE TABLE IF NOT EXISTS escrow_deposits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id   UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,
  side        TEXT NOT NULL CHECK (side IN ('seller', 'buyer')),
  txid        TEXT NOT NULL,
  confirmed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_deposits_escrow ON escrow_deposits(escrow_id);

-- ==================== Asset Balances Table ====================
-- Off-chain asset balances tracked by the hub (used for BRC-20 channel balances).
CREATE TABLE IF NOT EXISTS asset_balances (
  user_pubkey TEXT NOT NULL,
  asset_id    TEXT NOT NULL REFERENCES assets(id),
  balance     NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_pubkey, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_balances_user ON asset_balances(user_pubkey);
CREATE INDEX IF NOT EXISTS idx_asset_balances_asset ON asset_balances(asset_id);

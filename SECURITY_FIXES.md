# RuneBolt Security Fixes - Implementation Guide

This document provides specific code fixes for each security vulnerability identified in the audit.

---

## CRITICAL FIXES

### C1: Fix Mock Signature Verification

**File:** `src/auth/ChallengeManager.ts`

Replace lines 80-90 with:

```typescript
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

async verifyChallenge(challengeId: string, signature: string): Promise<{ valid: boolean; pubkey: string | null }> {
  const challenge = this.db.getChallenge(challengeId);
  if (!challenge) {
    console.log(`[ChallengeManager] Challenge ${challengeId} not found`);
    return { valid: false, pubkey: null };
  }

  // Check expiry
  const expiresAt = new Date(challenge.expires_at).getTime();
  if (Date.now() > expiresAt) {
    console.log(`[ChallengeManager] Challenge ${challengeId} expired`);
    this.db.deleteChallenge(challengeId);
    return { valid: false, pubkey: null };
  }

  // CRITICAL: Actually verify the signature
  try {
    const messageHash = sha256(challenge.challenge);
    const sigBytes = Buffer.from(signature, 'hex');
    const pubkeyBytes = Buffer.from(challenge.pubkey, 'hex');
    
    if (sigBytes.length !== 64) {
      console.log(`[ChallengeManager] Invalid signature length: ${sigBytes.length}`);
      return { valid: false, pubkey: null };
    }
    
    const isValid = await secp256k1.schnorr.verify(sigBytes, messageHash, pubkeyBytes);
    
    if (!isValid) {
      console.log(`[ChallengeManager] Signature verification failed for ${challenge.pubkey.slice(0, 16)}...`);
      return { valid: false, pubkey: null };
    }
    
    this.db.deleteChallenge(challengeId);
    console.log(`[ChallengeManager] Challenge ${challengeId} verified successfully`);
    return { valid: true, pubkey: challenge.pubkey };
  } catch (err) {
    console.error('[ChallengeManager] Signature verification error:', err);
    return { valid: false, pubkey: null };
  }
}
```

---

### C2: Add Replay Protection with Nonces

**1. Update Database Schema** (`src/db/schema.sql`):

```sql
-- Add nonce and signature columns to transfers
ALTER TABLE transfers ADD COLUMN nonce TEXT UNIQUE;
ALTER TABLE transfers ADD COLUMN client_signature TEXT;
ALTER TABLE transfers ADD COLUMN transfer_hash TEXT;

-- Create index for nonce lookups
CREATE INDEX IF NOT EXISTS idx_transfers_nonce ON transfers(nonce);

-- Idempotency table for API requests
CREATE TABLE IF NOT EXISTS idempotent_requests (
  key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_idempotent_requests_created ON idempotent_requests(created_at);
```

**2. Update Transfer Interface** (`src/ledger/Transfer.ts`):

```typescript
export interface Transfer {
  id: string;
  fromChannel: string;
  toChannel: string;
  amount: bigint;
  memo: string | null;
  nonce: string; // REQUIRED - prevents replay
  clientSignature: string; // REQUIRED - client signs transfer
  transferHash: string; // Hash of transfer details
  createdAt: string;
}

// Zod schema update
export const TransferRequestSchema = z.object({
  fromChannelId: z.string().uuid(),
  toChannelId: z.string().uuid().optional(),
  recipientPubkey: z.string().min(64).max(66).optional(),
  amount: z.string().regex(/^\d+$/),
  memo: z.string().max(256).optional(),
  nonce: z.string().uuid(), // REQUIRED
  signature: z.string().min(128), // REQUIRED - client signature
}).refine((data) => data.toChannelId || data.recipientPubkey, {
  message: 'Either toChannelId or recipientPubkey must be provided',
});
```

**3. Update RuneLedger** (`src/ledger/RuneLedger.ts`):

```typescript
transfer(
  fromChannelId: string,
  toChannelId: string,
  amount: bigint,
  memo: string | undefined,
  nonce: string, // REQUIRED
  clientSignature: string, // REQUIRED
): Transfer {
  if (amount <= 0n) {
    throw new Error('Transfer amount must be positive');
  }

  if (!nonce || !clientSignature) {
    throw new Error('Transfer nonce and signature are required');
  }

  return this.db.transaction(() => {
    // CRITICAL: Check for replay attack
    const existingTransfer = this.db.prepare(
      'SELECT id FROM transfers WHERE nonce = ?'
    ).get(nonce);
    
    if (existingTransfer) {
      throw new Error('Transfer nonce already used - possible replay attack');
    }

    // Verify client signature
    const transferHash = this.computeTransferHash(fromChannelId, toChannelId, amount, nonce);
    const isValidSignature = this.verifyTransferSignature(
      transferHash,
      clientSignature,
      fromChannelId
    );
    
    if (!isValidSignature) {
      throw new Error('Invalid transfer signature');
    }

    // ... rest of transfer logic ...

    // Store with nonce and signature
    this.db.createTransfer({
      id: transferId,
      from_channel: fromChannelId,
      to_channel: toChannelId,
      amount: Number(amount),
      memo: memo || null,
      nonce,
      client_signature: clientSignature,
      transfer_hash: transferHash,
    });

    return transfer;
  });
}

private computeTransferHash(
  fromChannel: string,
  toChannel: string,
  amount: bigint,
  nonce: string
): string {
  const data = `${fromChannel}:${toChannel}:${amount}:${nonce}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

---

### C3: Persist Commitments to Database

**1. Add Commitment Table** (`src/db/schema.sql`):

```sql
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
```

**2. Update CommitmentManager** (`src/channels/CommitmentManager.ts`):

```typescript
import Database from '../db/Database';

export class CommitmentManager {
  private static db = Database.getInstance();

  static createCommitment(
    channelId: string,
    localBalance: bigint,
    remoteBalance: bigint,
    sequence: number,
    revocationSecret?: string
  ): CommitmentState {
    console.log(
      `[CommitmentManager] Creating commitment #${sequence} for channel ${channelId}`
    );

    if (localBalance < 0n || remoteBalance < 0n) {
      throw new Error('Commitment balances cannot be negative');
    }

    const preimage = `${channelId}:${sequence}:${localBalance}:${remoteBalance}:${Date.now()}`;
    const hash = crypto.createHash('sha256').update(preimage).digest('hex');
    const revocationHash = revocationSecret
      ? crypto.createHash('sha256').update(revocationSecret).digest('hex')
      : null;

    const commitment: CommitmentState = {
      channelId,
      sequence,
      localBalance,
      remoteBalance,
      localSignature: null,
      remoteSignature: null,
      hash,
      createdAt: new Date().toISOString(),
    };

    // PERSIST to database
    this.db.prepare(`
      INSERT INTO commitments 
      (id, channel_id, sequence, local_balance, remote_balance, hash, revocation_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id, sequence) DO UPDATE SET
        local_balance = excluded.local_balance,
        remote
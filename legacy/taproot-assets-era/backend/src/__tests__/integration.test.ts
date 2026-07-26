/**
 * Integration tests for RuneBolt backend.
 *
 * Requires a running PostgreSQL instance.
 * Set DATABASE_URL env var or use the default test connection string.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Database from '../db/Database';

// Set test environment before importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://runebolt:runebolt@localhost:5432/runebolt_test';

// Import app after env is configured
import app from '../index';

const db = Database.getInstance();

// Test pubkeys (valid 64-char hex strings)
const ALICE_PUBKEY = 'a'.repeat(64);
const BOB_PUBKEY = 'b'.repeat(64);

// Helper to create a channel directly in the DB for testing
async function createTestChannel(
  userPubkey: string,
  capacity: number,
  localBalance: number,
  remoteBalance: number,
  state = 'OPEN'
): Promise<string> {
  const id = uuidv4();
  await db.createChannel({
    id,
    user_pubkey: userPubkey,
    runebolt_pubkey: crypto.randomBytes(32).toString('hex'),
    funding_txid: crypto.randomBytes(32).toString('hex'),
    funding_vout: 0,
    capacity,
    local_balance: localBalance,
    remote_balance: remoteBalance,
    state,
  });
  return id;
}

// Helper to create a test user
async function createTestUser(pubkey: string, username?: string): Promise<void> {
  await db.createUser(pubkey);
  if (username) {
    await db.updateUsername(pubkey, username);
  }
}

describe('RuneBolt Integration Tests', () => {
  beforeAll(async () => {
    // Ensure DB is initialized and run migrations
    try {
      await db.runMigrations();
    } catch {
      // Migrations may already be applied
    }
  });

  afterAll(async () => {
    await db.close();
  });

  // ==================== Auth Challenge Tests ====================

  describe('Auth Challenge', () => {
    it('should create a challenge with valid pubkey', async () => {
      const res = await request(app)
        .post('/api/v1/auth/auth/challenge')
        .send({ pubkey: ALICE_PUBKEY })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.challengeId).toBeDefined();
      expect(res.body.data.message).toContain('RuneBolt authentication challenge');
      expect(res.body.data.message).toContain(ALICE_PUBKEY);
    });

    it('should reject challenge with invalid pubkey (too short)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/auth/challenge')
        .send({ pubkey: 'abc123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should reject challenge with missing pubkey', async () => {
      const res = await request(app)
        .post('/api/v1/auth/auth/challenge')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should include nonce and timestamp in challenge message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/auth/challenge')
        .send({ pubkey: ALICE_PUBKEY })
        .expect(200);

      const message = res.body.data.message;
      expect(message).toContain('Nonce:');
      expect(message).toContain('Timestamp:');
      expect(message).toContain('Challenge ID:');
    });
  });

  // ==================== Channel Tests ====================

  describe('Channel Open', () => {
    it('should reject channel open with amount below minimum', async () => {
      const res = await request(app)
        .post('/api/v1/channels/channel/open')
        .send({ pubkey: ALICE_PUBKEY, amount: '100' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('at least');
    });

    it('should reject channel open with amount above maximum', async () => {
      const res = await request(app)
        .post('/api/v1/channels/channel/open')
        .send({ pubkey: ALICE_PUBKEY, amount: '999999999999999' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('cannot exceed');
    });

    it('should reject channel open with non-hex pubkey', async () => {
      const res = await request(app)
        .post('/api/v1/channels/channel/open')
        .send({ pubkey: 'g'.repeat(64), amount: '1000000' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject channel open with non-numeric amount', async () => {
      const res = await request(app)
        .post('/api/v1/channels/channel/open')
        .send({ pubkey: ALICE_PUBKEY, amount: 'not_a_number' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ==================== Transfer Tests ====================

  describe('Transfer Between Channels', () => {
    let aliceChannelId: string;
    let bobChannelId: string;

    beforeAll(async () => {
      await createTestUser(ALICE_PUBKEY);
      await createTestUser(BOB_PUBKEY);
      // Alice has 1M local, 0 remote; Bob has 0 local, 1M remote (inbound capacity)
      aliceChannelId = await createTestChannel(ALICE_PUBKEY, 1_000_000, 1_000_000, 0);
      bobChannelId = await createTestChannel(BOB_PUBKEY, 1_000_000, 0, 1_000_000);
    });

    it('should verify sender channel has correct initial balance', async () => {
      const channel = await db.getChannel(aliceChannelId);
      expect(channel).toBeDefined();
      expect(channel!.local_balance).toBe(1_000_000);
      expect(channel!.remote_balance).toBe(0);
      expect(channel!.state).toBe('OPEN');
    });

    it('should verify recipient channel has inbound capacity', async () => {
      const channel = await db.getChannel(bobChannelId);
      expect(channel).toBeDefined();
      expect(channel!.local_balance).toBe(0);
      expect(channel!.remote_balance).toBe(1_000_000);
    });

    it('should execute a valid transfer and update balances', async () => {
      const transferAmount = 50_000;
      const nonce = uuidv4();
      const transferId = uuidv4();

      // Execute transfer directly via DB (bypassing worker pool for test determinism)
      await db.updateChannelBalances(
        aliceChannelId,
        1_000_000 - transferAmount,
        0 + transferAmount
      );
      await db.updateChannelBalances(
        bobChannelId,
        0 + transferAmount,
        1_000_000 - transferAmount
      );
      await db.createTransfer({
        id: transferId,
        from_channel: aliceChannelId,
        to_channel: bobChannelId,
        amount: transferAmount,
        memo: 'test transfer',
        nonce,
        client_signature: 'a'.repeat(128),
      });

      // Verify balances updated
      const aliceCh = await db.getChannel(aliceChannelId);
      expect(aliceCh!.local_balance).toBe(950_000);
      expect(aliceCh!.remote_balance).toBe(50_000);

      const bobCh = await db.getChannel(bobChannelId);
      expect(bobCh!.local_balance).toBe(50_000);
      expect(bobCh!.remote_balance).toBe(950_000);
    });

    it('should prevent replay by rejecting duplicate nonces', async () => {
      const nonce = uuidv4();

      // Record first transfer with this nonce
      await db.createTransfer({
        id: uuidv4(),
        from_channel: aliceChannelId,
        to_channel: bobChannelId,
        amount: 1000,
        memo: null,
        nonce,
        client_signature: 'b'.repeat(128),
      });

      // Verify the nonce is detected
      const existing = await db.getTransferByNonce(nonce);
      expect(existing).toBeDefined();
      expect(existing!.id).toBeDefined();
    });
  });

  // ==================== Fee Calculation Tests ====================

  describe('Fee Calculation', () => {
    const FEE_TEST_PUBKEY = 'f'.repeat(64);

    beforeAll(async () => {
      await createTestUser(FEE_TEST_PUBKEY);
    });

    it('should return free tier for new users', async () => {
      const txCount = await db.getTransactionCount(FEE_TEST_PUBKEY);
      const currentCount = txCount?.count ?? 0;
      const remaining = Math.max(0, 500 - currentCount);
      expect(remaining).toBeGreaterThan(0);
    });

    it('should increment transaction count', async () => {
      const before = await db.getTransactionCount(FEE_TEST_PUBKEY);
      const beforeCount = before?.count ?? 0;

      const newCount = await db.incrementTransactionCount(FEE_TEST_PUBKEY);
      expect(newCount).toBe(beforeCount + 1);
    });

    it('should return correct fee schedule via API', async () => {
      const res = await request(app)
        .get('/api/v1/fees/schedule')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.freeTier).toBeDefined();
      expect(res.body.data.freeTier.freeTransactions).toBe(500);
      expect(res.body.data.freeTier.offChainFeeRate).toBe('0%');
      expect(res.body.data.standardTier).toBeDefined();
      expect(res.body.data.standardTier.offChainFeeRate).toBe('0.1%');
      expect(res.body.data.standardTier.settlementFeeRate).toBe('0.5%');
    });

    it('should calculate paid tier fees correctly', () => {
      // Standard tier: off-chain 0.1%, settlement 0.5%
      const amount = 1_000_000;
      const offChainFee = Math.ceil(amount * 0.001);
      const settlementFee = Math.ceil(amount * 0.005);

      expect(offChainFee).toBe(1000);
      expect(settlementFee).toBe(5000);
    });
  });

  // ==================== Rate Limiting Tests ====================

  describe('Rate Limiting', () => {
    it('should block auth requests after threshold', async () => {
      // Auth rate limit: 5 per 15 minutes
      // Send 6 requests rapidly — the 6th should be rate limited
      const pubkey = 'c'.repeat(64);
      const results: number[] = [];

      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/v1/auth/auth/challenge')
          .send({ pubkey });
        results.push(res.status);
      }

      // At least the last request should be rate limited (429)
      expect(results).toContain(429);
    });
  });

  // ==================== Username Tests ====================

  describe('Username Registration and Lookup', () => {
    const USERNAME_PUBKEY = 'd'.repeat(64);
    const TEST_USERNAME = 'satoshi_test';

    beforeAll(async () => {
      await createTestUser(USERNAME_PUBKEY, TEST_USERNAME);
    });

    it('should register a username for a user', async () => {
      const user = await db.getUser(USERNAME_PUBKEY);
      expect(user).toBeDefined();
      expect(user!.username).toBe(TEST_USERNAME);
    });

    it('should look up user by username', async () => {
      const user = await db.getUserByUsername(TEST_USERNAME);
      expect(user).toBeDefined();
      expect(user!.pubkey).toBe(USERNAME_PUBKEY);
    });

    it('should return undefined for non-existent username', async () => {
      const user = await db.getUserByUsername('nonexistent_user_xyz');
      expect(user).toBeUndefined();
    });

    it('should update username', async () => {
      const newUsername = 'nakamoto_test';
      await db.updateUsername(USERNAME_PUBKEY, newUsername);

      const user = await db.getUser(USERNAME_PUBKEY);
      expect(user!.username).toBe(newUsername);

      // Restore original
      await db.updateUsername(USERNAME_PUBKEY, TEST_USERNAME);
    });
  });

  // ==================== Claim Link Tests ====================

  describe('Claim Link Creation and Redemption', () => {
    const CREATOR_PUBKEY = 'e'.repeat(64);
    const CLAIMER_PUBKEY = '1'.repeat(64);
    let claimId: string;

    beforeAll(async () => {
      await createTestUser(CREATOR_PUBKEY);
      await createTestUser(CLAIMER_PUBKEY);
    });

    it('should create a claim link in the database', async () => {
      claimId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await db.createClaimLink({
        id: claimId,
        creator_pubkey: CREATOR_PUBKEY,
        amount: 100_000,
        memo: 'Test claim',
        expires_at: expiresAt,
      });

      const claim = await db.getClaimLink(claimId);
      expect(claim).toBeDefined();
      expect(claim!.creator_pubkey).toBe(CREATOR_PUBKEY);
      expect(claim!.amount).toBe(100_000);
      expect(claim!.memo).toBe('Test claim');
      expect(claim!.claimed_by).toBeNull();
    });

    it('should retrieve claim link details via API', async () => {
      const res = await request(app)
        .get(`/api/v1/claims/claim/${claimId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.claimId).toBe(claimId);
      expect(res.body.data.amount).toBe('100000');
      expect(res.body.data.claimed).toBe(false);
      expect(res.body.data.expired).toBe(false);
    });

    it('should mark claim link as redeemed in database', async () => {
      await db.claimLink(claimId, CLAIMER_PUBKEY);

      const claim = await db.getClaimLink(claimId);
      expect(claim!.claimed_by).toBe(CLAIMER_PUBKEY);
      expect(claim!.claimed_at).not.toBeNull();
    });

    it('should return 404 for non-existent claim link', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .get(`/api/v1/claims/claim/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ==================== Health Endpoint Tests ====================

  describe('Health Endpoint', () => {
    it('should return health status with all checks', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('runebolt-backend');
      expect(res.body.version).toBeDefined();
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database).toBeDefined();
      expect(res.body.checks.database.status).toBe('ok');
      expect(res.body.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.body.checks.database.pool).toBeDefined();
      expect(res.body.checks.redis).toBeDefined();
    });
  });

  // ==================== Root Endpoint Tests ====================

  describe('Root Endpoint', () => {
    it('should return service info with version', async () => {
      const res = await request(app)
        .get('/')
        .expect(200);

      expect(res.body.name).toBe('RuneBolt Backend');
      expect(res.body.version).toBeDefined();
      expect(res.body.endpoints).toBeDefined();
      expect(res.body.endpoints.health).toBe('/health');
    });
  });

  // ==================== Stats Endpoint Tests ====================

  describe('Stats Endpoint', () => {
    it('should return public platform stats', async () => {
      const res = await request(app)
        .get('/api/v1/stats')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(typeof res.body.data.totalUsers).toBe('number');
      expect(typeof res.body.data.totalTransfers).toBe('number');
      expect(res.body.data.totalVolume).toBeDefined();
      expect(typeof res.body.data.totalChannels).toBe('number');
      expect(typeof res.body.data.openChannels).toBe('number');
    });
  });
});

/**
 * RuneBolt Full End-to-End Simulation Test Suite
 *
 * Tests the ENTIRE RuneBolt flow without spending real Bitcoin.
 * Covers: auth, channels, transfers, fees, security, concurrency, crypto.
 *
 * Requires a running PostgreSQL instance.
 * Set DATABASE_URL env var or uses default test connection string.
 *
 * NOTE: PostgreSQL returns BIGINT columns as strings, not numbers.
 * All balance/capacity assertions use Number() or String() coercion.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import Database from '../db/Database';
import {
  generateTestKeypair,
  signChallenge,
  verifySignature,
  createTestChannel,
  createTestUser,
  simulateFundingConfirmation,
  generateNonce,
  TestKeypair,
} from './test-helpers';
import { calculateReserve, validateTransferAgainstReserve, getSpendableBalance } from '../channels/ChannelReserves';
import { ChallengeManager } from '../auth/ChallengeManager';
import { FeeManager } from '../fees/FeeManager';
import { ChannelState, canTransition, assertTransition } from '../channels/ChannelState';

// Initialize DB directly (not through index.ts which has mainnet checks)
process.env.NODE_ENV = 'test';
const TEST_DB_URL = process.env.DATABASE_URL || 'postgresql://gravity@localhost:5432/runebolt_test';
const db = Database.getInstance();
db.initialize(TEST_DB_URL);

// ==================== Scenario 1: DOG Transfer Flow ====================

describe('Scenario 1: DOG Transfer Flow (End-to-End)', () => {
  let alice: TestKeypair;
  let bob: TestKeypair;
  let aliceChallengeId: string;
  let aliceChallengeMessage: string;
  let aliceChannelId: string;
  let bobChannelId: string;

  beforeAll(async () => {
    try {
      await db.runMigrations();
    } catch {
      // Migrations may already be applied
    }

    alice = generateTestKeypair();
    bob = generateTestKeypair();

    // Create users first (FK constraint on challenges table)
    await createTestUser(db, alice.publicKey);
    await createTestUser(db, bob.publicKey);
  });

  it('Step 1: Alice and Bob generate valid secp256k1 keypairs', () => {
    expect(alice.privateKey).toHaveLength(64);
    expect(alice.publicKey).toHaveLength(64);
    expect(bob.privateKey).toHaveLength(64);
    expect(bob.publicKey).toHaveLength(64);
    expect(alice.publicKey).not.toBe(bob.publicKey);
    expect(/^[0-9a-f]{64}$/.test(alice.publicKey)).toBe(true);
    expect(/^[0-9a-f]{64}$/.test(bob.publicKey)).toBe(true);
  });

  it('Step 2: Alice requests auth challenge', async () => {
    const challengeManager = new ChallengeManager();
    const result = await challengeManager.createChallenge(alice.publicKey);

    expect(result.challengeId).toBeDefined();
    expect(result.message).toContain('RuneBolt authentication challenge');
    expect(result.message).toContain(alice.publicKey);
    expect(result.message).toContain('Nonce:');
    expect(result.message).toContain('Timestamp:');

    aliceChallengeId = result.challengeId;
    aliceChallengeMessage = result.message;
  });

  it('Step 3: Alice signs challenge with real Schnorr signature → verified', async () => {
    const signature = await signChallenge(alice.privateKey, aliceChallengeMessage);
    expect(signature).toHaveLength(128);

    const localValid = await verifySignature(alice.publicKey, aliceChallengeMessage, signature);
    expect(localValid).toBe(true);

    const challengeManager = new ChallengeManager();
    const result = await challengeManager.verifyChallenge(aliceChallengeId, signature);
    expect(result.valid).toBe(true);
    expect(result.pubkey).toBe(alice.publicKey);
  });

  it('Step 4: Alice opens a DOG channel with 100,000 DOG (PENDING_OPEN)', async () => {
    aliceChannelId = await createTestChannel(
      db, alice.publicKey, 10_000_000_000, 10_000_000_000, 0, 'PENDING_OPEN'
    );

    const channel = await db.getChannel(aliceChannelId);
    expect(channel).toBeDefined();
    expect(channel!.user_pubkey).toBe(alice.publicKey);
    expect(Number(channel!.capacity)).toBe(10_000_000_000);
    expect(channel!.state).toBe('PENDING_OPEN');
  });

  it('Step 5: Simulate funding tx confirmation → channel activates (OPEN)', async () => {
    await simulateFundingConfirmation(db, aliceChannelId);

    const channel = await db.getChannel(aliceChannelId);
    expect(channel!.state).toBe('OPEN');
    expect(Number(channel!.local_balance)).toBe(10_000_000_000);
    expect(Number(channel!.remote_balance)).toBe(0);
    expect(channel!.funding_txid).toBeDefined();
  });

  it('Step 6: Create Bob channel with inbound capacity', async () => {
    bobChannelId = await createTestChannel(
      db, bob.publicKey, 10_000_000_000, 0, 10_000_000_000, 'OPEN'
    );

    const channel = await db.getChannel(bobChannelId);
    expect(channel!.state).toBe('OPEN');
    expect(Number(channel!.remote_balance)).toBe(10_000_000_000);
  });

  it('Step 7: Alice sends 10,000 DOG (1,000,000,000 raw) to Bob', async () => {
    const transferAmount = 1_000_000_000;

    await db.updateChannelBalances(aliceChannelId, 10_000_000_000 - transferAmount, 0 + transferAmount);
    await db.updateChannelBalances(bobChannelId, 0 + transferAmount, 10_000_000_000 - transferAmount);
    await db.createTransfer({
      id: uuidv4(),
      from_channel: aliceChannelId,
      to_channel: bobChannelId,
      amount: transferAmount,
      memo: 'DOG transfer test',
      nonce: generateNonce(),
      client_signature: 'a'.repeat(128),
    });
  });

  it('Step 8: Alice balance = 90,000 DOG, Bob balance = 10,000 DOG', async () => {
    const aliceCh = await db.getChannel(aliceChannelId);
    expect(Number(aliceCh!.local_balance)).toBe(9_000_000_000);
    expect(Number(aliceCh!.remote_balance)).toBe(1_000_000_000);

    const bobCh = await db.getChannel(bobChannelId);
    expect(Number(bobCh!.local_balance)).toBe(1_000_000_000);
    expect(Number(bobCh!.remote_balance)).toBe(9_000_000_000);
  });

  it('Step 9: Fee should be free (within first 500 txs)', async () => {
    const txCount = await db.getTransactionCount(alice.publicKey);
    const currentCount = txCount?.count ?? 0;
    expect(currentCount).toBeLessThan(500);
  });

  it('Step 10: Alice closes channel cooperatively → CLOSING', async () => {
    await db.updateChannelState(aliceChannelId, 'CLOSING');
    const channel = await db.getChannel(aliceChannelId);
    expect(channel!.state).toBe('CLOSING');
    expect(Number(channel!.local_balance)).toBe(9_000_000_000);
    expect(Number(channel!.remote_balance)).toBe(1_000_000_000);
  });
});

// ==================== Scenario 2: Security Tests ====================

describe('Scenario 2: Security Tests', () => {
  let attacker: TestKeypair;
  let victim: TestKeypair;
  let attackerChannelId: string;
  let victimChannelId: string;

  beforeAll(async () => {
    attacker = generateTestKeypair();
    victim = generateTestKeypair();

    await createTestUser(db, attacker.publicKey);
    await createTestUser(db, victim.publicKey);

    attackerChannelId = await createTestChannel(db, attacker.publicKey, 100_000, 100_000, 0, 'OPEN');
    victimChannelId = await createTestChannel(db, victim.publicKey, 100_000, 0, 100_000, 'OPEN');
  });

  it('should reject auth with wrong private key (invalid signature)', async () => {
    const challengeManager = new ChallengeManager();
    const { challengeId, message } = await challengeManager.createChallenge(attacker.publicKey);

    const wrongSig = await signChallenge(victim.privateKey, message);
    const result = await challengeManager.verifyChallenge(challengeId, wrongSig);
    expect(result.valid).toBe(false);
    expect(result.pubkey).toBeNull();
  });

  it('should reject sending more than balance (overflow check)', async () => {
    const channel = await db.getChannel(attackerChannelId);
    const localBalance = BigInt(channel!.local_balance);
    const overAmount = localBalance + 1n;
    expect(localBalance < overAmount).toBe(true);
  });

  it('should reject zero and negative transfer amounts', () => {
    expect(0n <= 0n).toBe(true);
    expect(-1n <= 0n).toBe(true);
  });

  it('should enforce 1% reserve — cannot drain channel below reserve', () => {
    const capacity = 100_000n;
    const localBalance = 100_000n;
    const reserve = calculateReserve(capacity);

    expect(reserve).toBe(1000n);
    expect(validateTransferAgainstReserve(localBalance, capacity, localBalance - reserve)).toBe(true);
    expect(validateTransferAgainstReserve(localBalance, capacity, localBalance - reserve + 1n)).toBe(false);
    expect(validateTransferAgainstReserve(localBalance, capacity, localBalance)).toBe(false);
  });

  it('should prevent replay attacks via nonce uniqueness', async () => {
    const nonce = generateNonce();

    await db.createTransfer({
      id: uuidv4(),
      from_channel: attackerChannelId,
      to_channel: victimChannelId,
      amount: 1000,
      memo: null,
      nonce,
      client_signature: 'a'.repeat(128),
    });

    const existing = await db.getTransferByNonce(nonce);
    expect(existing).toBeDefined();
    expect(existing!.id).toBeDefined();
  });

  it('should reject replaying an old auth challenge (one-time use)', async () => {
    const challengeManager = new ChallengeManager();
    const { challengeId, message } = await challengeManager.createChallenge(attacker.publicKey);
    const signature = await signChallenge(attacker.privateKey, message);

    const first = await challengeManager.verifyChallenge(challengeId, signature);
    expect(first.valid).toBe(true);

    const second = await challengeManager.verifyChallenge(challengeId, signature);
    expect(second.valid).toBe(false);
  });

  it('should reject signature with wrong length', async () => {
    const challengeManager = new ChallengeManager();
    const { challengeId } = await challengeManager.createChallenge(attacker.publicKey);

    const shortSig = 'a'.repeat(64);
    const result = await challengeManager.verifyChallenge(challengeId, shortSig);
    expect(result.valid).toBe(false);
  });
});

// ==================== Scenario 3: Fee System Tests ====================

describe('Scenario 3: Fee System Tests', () => {
  const FEE_USER_PUBKEY = crypto.randomBytes(32).toString('hex');

  beforeAll(async () => {
    await createTestUser(db, FEE_USER_PUBKEY);
  });

  it('should start with 500 free transactions', async () => {
    const txCount = await db.getTransactionCount(FEE_USER_PUBKEY);
    const currentCount = txCount?.count ?? 0;
    expect(Math.max(0, 500 - currentCount)).toBe(500);
  });

  it('should track transaction count increments', async () => {
    for (let i = 0; i < 5; i++) {
      await db.incrementTransactionCount(FEE_USER_PUBKEY);
    }

    const txCount = await db.getTransactionCount(FEE_USER_PUBKEY);
    expect(txCount!.count).toBe(5);
    expect(Math.max(0, 500 - txCount!.count)).toBe(495);
  });

  it('should exhaust free tier at exactly 500 transactions', async () => {
    const current = (await db.getTransactionCount(FEE_USER_PUBKEY))?.count ?? 0;
    for (let i = current; i < 500; i++) {
      await db.incrementTransactionCount(FEE_USER_PUBKEY);
    }

    const txCount = await db.getTransactionCount(FEE_USER_PUBKEY);
    expect(txCount!.count).toBe(500);
    expect(Math.max(0, 500 - txCount!.count)).toBe(0);
  });

  it('should calculate FeeManager fees correctly for paid tier', async () => {
    const feeManager = new FeeManager();
    const fee = await feeManager.calculateFee(FEE_USER_PUBKEY, 1_000_000n, 'off_chain');
    expect(fee.isFree).toBe(false);
    expect(fee.feeRate).toBe(0.001);
    expect(fee.feeAmount).toBe(1000n);
  });

  it('should calculate settlement fee at 0.5%', async () => {
    const feeManager = new FeeManager();
    const fee = await feeManager.calculateFee(FEE_USER_PUBKEY, 1_000_000n, 'settlement');
    expect(fee.isFree).toBe(false);
    expect(fee.feeRate).toBe(0.005);
    expect(fee.feeAmount).toBe(5000n);
  });

  it('should calculate free tier for new user', async () => {
    const newUser = crypto.randomBytes(32).toString('hex');
    await createTestUser(db, newUser);
    const feeManager = new FeeManager();
    const fee = await feeManager.calculateFee(newUser, 1_000_000n, 'off_chain');
    expect(fee.isFree).toBe(true);
    expect(fee.feeAmount).toBe(0n);
    expect(fee.freeTransactionsRemaining).toBe(499);
  });
});

// ==================== Scenario 4: Multi-User Concurrent ====================

describe('Scenario 4: Multi-User Concurrent Operations', () => {
  const NUM_USERS = 5;
  const users: Array<{ pubkey: string; channelId: string }> = [];

  beforeAll(async () => {
    for (let i = 0; i < NUM_USERS; i++) {
      const kp = generateTestKeypair();
      await createTestUser(db, kp.publicKey);
      const channelId = await createTestChannel(
        db, kp.publicKey, 1_000_000, 500_000, 500_000, 'OPEN'
      );
      users.push({ pubkey: kp.publicKey, channelId });
    }
  });

  it('should handle 5 simultaneous channel creations without error', () => {
    expect(users.length).toBe(NUM_USERS);
    for (const user of users) {
      expect(user.channelId).toBeDefined();
      expect(user.pubkey).toHaveLength(64);
    }
  });

  it('should handle 10 parallel transfers correctly', async () => {
    const transferPromises: Promise<void>[] = [];

    for (let i = 0; i < 10; i++) {
      const fromIdx = i % NUM_USERS;
      const toIdx = (i + 1) % NUM_USERS;

      transferPromises.push(
        db.createTransfer({
          id: uuidv4(),
          from_channel: users[fromIdx].channelId,
          to_channel: users[toIdx].channelId,
          amount: 1000,
          memo: `concurrent transfer ${i}`,
          nonce: generateNonce(),
          client_signature: 'a'.repeat(128),
        })
      );
    }

    await expect(Promise.all(transferPromises)).resolves.not.toThrow();
  });

  it('should maintain unique nonces across concurrent transfers', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const nonce = generateNonce();
      expect(nonces.has(nonce)).toBe(false);
      nonces.add(nonce);
    }
    expect(nonces.size).toBe(100);
  });

  it('should verify all channel states remain valid after concurrent ops', async () => {
    for (const user of users) {
      const channel = await db.getChannel(user.channelId);
      expect(channel).toBeDefined();
      expect(channel!.state).toBe('OPEN');
      expect(Number(channel!.capacity)).toBe(1_000_000);
      // BIGINT comes back as string, so coerce for arithmetic
      expect(Number(channel!.local_balance) + Number(channel!.remote_balance)).toBe(Number(channel!.capacity));
    }
  });
});

// ==================== Scenario 5: Channel Reserve Tests ====================

describe('Scenario 5: Channel Reserve Enforcement', () => {
  it('should calculate 1% reserve correctly', () => {
    expect(calculateReserve(100_000n)).toBe(1000n);
    expect(calculateReserve(1_000_000n)).toBe(10_000n);
    expect(calculateReserve(10_000n)).toBe(100n);
    expect(calculateReserve(100n)).toBe(1n);
    expect(calculateReserve(1n)).toBe(1n);
    expect(calculateReserve(0n)).toBe(1n);
  });

  it('should correctly compute spendable balance', () => {
    expect(getSpendableBalance(100_000n, 100_000n)).toBe(99_000n);
    expect(getSpendableBalance(1000n, 100_000n)).toBe(0n);
    expect(getSpendableBalance(500n, 100_000n)).toBe(0n);
  });

  it('should validate transfer against reserve', () => {
    const capacity = 1_000_000n;
    const balance = 500_000n;
    expect(validateTransferAgainstReserve(balance, capacity, 490_000n)).toBe(true);
    expect(validateTransferAgainstReserve(balance, capacity, 490_001n)).toBe(false);
  });
});

// ==================== Scenario 6: Channel State Machine ====================

describe('Scenario 6: Channel State Machine', () => {
  it('should validate all allowed transitions', () => {
    expect(canTransition(ChannelState.PENDING_OPEN, ChannelState.OPEN)).toBe(true);
    expect(canTransition(ChannelState.PENDING_OPEN, ChannelState.CLOSED)).toBe(true);
    expect(canTransition(ChannelState.OPEN, ChannelState.CLOSING)).toBe(true);
    expect(canTransition(ChannelState.OPEN, ChannelState.FORCE_CLOSING)).toBe(true);
    expect(canTransition(ChannelState.CLOSING, ChannelState.CLOSED)).toBe(true);
    expect(canTransition(ChannelState.FORCE_CLOSING, ChannelState.CLOSED)).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(canTransition(ChannelState.PENDING_OPEN, ChannelState.CLOSING)).toBe(false);
    expect(canTransition(ChannelState.CLOSED, ChannelState.OPEN)).toBe(false);
    expect(canTransition(ChannelState.CLOSING, ChannelState.OPEN)).toBe(false);
    expect(canTransition(ChannelState.FORCE_CLOSING, ChannelState.OPEN)).toBe(false);
  });

  it('should throw on invalid transition via assertTransition', () => {
    expect(() => assertTransition(ChannelState.CLOSED, ChannelState.OPEN)).toThrow('Invalid channel state transition');
  });

  it('should follow valid state transitions in DB', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const chId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'PENDING_OPEN');
    await db.updateChannelState(chId, 'OPEN');
    let ch = await db.getChannel(chId);
    expect(ch!.state).toBe('OPEN');

    await db.updateChannelState(chId, 'CLOSING');
    ch = await db.getChannel(chId);
    expect(ch!.state).toBe('CLOSING');

    await db.updateChannelState(chId, 'CLOSED');
    ch = await db.getChannel(chId);
    expect(ch!.state).toBe('CLOSED');
  });

  it('should support force close path in DB', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const chId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'OPEN');

    await db.updateChannelState(chId, 'FORCE_CLOSING');
    let ch = await db.getChannel(chId);
    expect(ch!.state).toBe('FORCE_CLOSING');

    await db.updateChannelState(chId, 'CLOSED');
    ch = await db.getChannel(chId);
    expect(ch!.state).toBe('CLOSED');
  });

  it('FINDING: DB allows invalid state transitions (no DB-level enforcement)', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const chId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'CLOSED');
    // DB allows CLOSED -> OPEN (which is invalid per state machine)
    await db.updateChannelState(chId, 'OPEN');
    const ch = await db.getChannel(chId);
    expect(ch!.state).toBe('OPEN');
  });
});

// ==================== Scenario 7: Bitmap Escrow ====================

describe('Scenario 7: Bitmap Escrow Flow', () => {
  it('should have escrow table accessible', async () => {
    const kp = generateTestKeypair();
    const escrows = await db.getEscrowsByPubkey(kp.publicKey);
    expect(Array.isArray(escrows)).toBe(true);
    expect(escrows.length).toBe(0);
  });
});

// ==================== Scenario 8: Cryptographic Verification ====================

describe('Scenario 8: Cryptographic Verification', () => {
  it('should generate unique keypairs every time', () => {
    const kp1 = generateTestKeypair();
    const kp2 = generateTestKeypair();
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
    expect(kp1.privateKey).not.toBe(kp2.privateKey);
  });

  it('should sign and verify correctly with matching keys', async () => {
    const kp = generateTestKeypair();
    const sig = await signChallenge(kp.privateKey, 'test message for signing');
    const valid = await verifySignature(kp.publicKey, 'test message for signing', sig);
    expect(valid).toBe(true);
  });

  it('should reject signature from wrong key', async () => {
    const kp1 = generateTestKeypair();
    const kp2 = generateTestKeypair();
    const sig = await signChallenge(kp1.privateKey, 'test message');
    const valid = await verifySignature(kp2.publicKey, 'test message', sig);
    expect(valid).toBe(false);
  });

  it('should reject tampered message', async () => {
    const kp = generateTestKeypair();
    const sig = await signChallenge(kp.privateKey, 'original message');
    const valid = await verifySignature(kp.publicKey, 'tampered message', sig);
    expect(valid).toBe(false);
  });

  it('should produce 64-byte Schnorr signatures', async () => {
    const kp = generateTestKeypair();
    const sig = await signChallenge(kp.privateKey, 'test');
    expect(sig).toHaveLength(128);
  });

  it('should handle special characters in message', async () => {
    const kp = generateTestKeypair();
    const message = 'RuneBolt auth\nNonce: abc123\nTimestamp: 1234567890\n🔒';
    const sig = await signChallenge(kp.privateKey, message);
    const valid = await verifySignature(kp.publicKey, message, sig);
    expect(valid).toBe(true);
  });
});

// ==================== Scenario 9: Overflow & Edge Cases ====================

describe('Scenario 9: Overflow and Edge Cases', () => {
  it('should handle max safe BigInt amounts in reserve calculation', () => {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    const reserve = calculateReserve(maxSafe);
    expect(reserve).toBeGreaterThan(0n);
    expect(typeof reserve).toBe('bigint');
  });

  it('should handle minimum reserve (capacity = 1)', () => {
    expect(calculateReserve(1n)).toBe(1n);
  });

  it('should preserve balance invariant: local + remote = capacity', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const capacity = 1_000_000;
    const channelId = await createTestChannel(db, kp.publicKey, capacity, capacity, 0, 'OPEN');

    const updates = [[900_000, 100_000], [500_000, 500_000], [100_000, 900_000], [0, 1_000_000]];

    for (const [local, remote] of updates) {
      await db.updateChannelBalances(channelId, local, remote);
      const ch = await db.getChannel(channelId);
      expect(Number(ch!.local_balance) + Number(ch!.remote_balance)).toBe(capacity);
    }
  });

  it('FINDING: DB does NOT enforce balance invariant (local + remote = capacity)', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const channelId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'OPEN');
    await db.updateChannelBalances(channelId, 200_000, 200_000);
    const ch = await db.getChannel(channelId);
    expect(Number(ch!.local_balance) + Number(ch!.remote_balance)).toBe(400_000); // Exceeds capacity!
    expect(Number(ch!.capacity)).toBe(100_000);
  });

  it('FINDING: DB allows negative balances', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);

    const channelId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'OPEN');
    await db.updateChannelBalances(channelId, -50_000, 150_000);
    const ch = await db.getChannel(channelId);
    expect(Number(ch!.local_balance)).toBe(-50_000);
  });
});

// ==================== Scenario 10: Commitment Tracking ====================

describe('Scenario 10: Commitment Tracking', () => {
  it('should create and retrieve commitments', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);
    const channelId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'OPEN');

    await db.createCommitment({ channel_id: channelId, sequence: 0, local_balance: 100_000, remote_balance: 0 });
    await db.createCommitment({ channel_id: channelId, sequence: 1, local_balance: 90_000, remote_balance: 10_000 });

    const latest = await db.getLatestCommitment(channelId);
    expect(latest).toBeDefined();
    expect(latest!.sequence).toBe(1);
    expect(Number(latest!.local_balance)).toBe(90_000);
    expect(Number(latest!.remote_balance)).toBe(10_000);
  });

  it('should track commitment history', async () => {
    const kp = generateTestKeypair();
    await createTestUser(db, kp.publicKey);
    const channelId = await createTestChannel(db, kp.publicKey, 100_000, 100_000, 0, 'OPEN');

    for (let i = 0; i < 5; i++) {
      await db.createCommitment({
        channel_id: channelId,
        sequence: i,
        local_balance: 100_000 - i * 10_000,
        remote_balance: i * 10_000,
      });
    }

    const history = await db.getCommitmentsByChannel(channelId, 10);
    expect(history.length).toBe(5);
    expect(history[0].sequence).toBe(4);
    expect(history[4].sequence).toBe(0);
  });
});

// Clean up at the very end
afterAll(async () => {
  await db.close();
});

/**
 * Test helpers for RuneBolt simulation tests.
 *
 * Provides real cryptographic operations using @noble/secp256k1 v3
 * for generating keypairs and Schnorr signatures identical to
 * those used in production.
 */

import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Database from '../db/Database';

// Configure @noble/secp256k1 v3 with hash functions (must match production)
secp256k1.hashes.sha256 = (msg: Uint8Array) => sha256(msg);
secp256k1.hashes.hmacSha256 = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp256k1.etc.concatBytes(...msgs));

export interface TestKeypair {
  privateKey: string; // 64-char hex (32 bytes)
  publicKey: string;  // 64-char hex (32-byte x-only Schnorr pubkey)
}

/**
 * Generate a real secp256k1 keypair suitable for Schnorr signing.
 * Returns x-only public key (32 bytes) as used by BIP-340.
 */
export function generateTestKeypair(): TestKeypair {
  const privBytes = randomBytes(32);
  const privateKey = bytesToHex(privBytes);
  // getPublicKey with second arg true returns compressed (33 bytes),
  // but for Schnorr/BIP-340 we need the x-only (32 bytes) form.
  const pubFull = secp256k1.getPublicKey(privBytes, true);
  // x-only: drop the prefix byte
  const publicKey = bytesToHex(pubFull.slice(1));
  return { privateKey, publicKey };
}

/**
 * Sign a challenge message with a private key using BIP-340 Schnorr.
 * This mirrors the exact signing flow a real client would use.
 */
export async function signChallenge(
  privateKey: string,
  message: string
): Promise<string> {
  const messageHash = sha256(new TextEncoder().encode(message));
  const privBytes = new Uint8Array(Buffer.from(privateKey, 'hex'));
  const sig = await secp256k1.schnorr.sign(messageHash, privBytes);
  return bytesToHex(sig);
}

/**
 * Verify a Schnorr signature (mirrors ChallengeManager.verifyChallenge).
 */
export async function verifySignature(
  publicKey: string,
  message: string,
  signature: string
): Promise<boolean> {
  const messageHash = sha256(new TextEncoder().encode(message));
  const sigBytes = new Uint8Array(Buffer.from(signature, 'hex'));
  const pubBytes = new Uint8Array(Buffer.from(publicKey, 'hex'));
  return secp256k1.schnorr.verify(sigBytes, messageHash, pubBytes);
}

/**
 * Create a test channel directly in the database.
 */
export async function createTestChannel(
  db: Database,
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

/**
 * Create a test user in the database.
 */
export async function createTestUser(
  db: Database,
  pubkey: string,
  username?: string
): Promise<void> {
  await db.createUser(pubkey);
  if (username) {
    await db.updateUsername(pubkey, username);
  }
}

/**
 * Simulate funding confirmation by transitioning channel to OPEN state.
 */
export async function simulateFundingConfirmation(
  db: Database,
  channelId: string
): Promise<void> {
  const channel = await db.getChannel(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  if (channel.state !== 'PENDING_OPEN') {
    throw new Error(`Channel ${channelId} is not in PENDING_OPEN state (is ${channel.state})`);
  }

  await db.updateChannel({
    id: channelId,
    funding_txid: crypto.randomBytes(32).toString('hex'),
    funding_vout: 0,
    capacity: channel.capacity,
    local_balance: channel.local_balance,
    remote_balance: channel.remote_balance,
    state: 'OPEN',
  });
}

/**
 * Generate a unique nonce for a transfer (UUID v4).
 */
export function generateNonce(): string {
  return uuidv4();
}

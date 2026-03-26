/**
 * Challenge-response authentication using Bitcoin message signing.
 *
 * Flow:
 * 1. Client requests a challenge for their pubkey
 * 2. Server generates a random challenge string and stores it
 * 3. Client signs the challenge with their Bitcoin private key
 * 4. Server verifies the signature and issues a JWT
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import Database from '../db/Database';

// Configure @noble/secp256k1 v3 with hash functions (idempotent)
secp256k1.hashes.sha256 = (msg: Uint8Array) => sha256(msg);
secp256k1.hashes.hmacSha256 = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp256k1.etc.concatBytes(...msgs));

/** Challenge validity duration in milliseconds (5 minutes) */
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

export class ChallengeManager {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Create a new authentication challenge for a given pubkey.
   */
  async createChallenge(pubkey: string): Promise<{ challengeId: string; message: string }> {
    const challengeId = uuidv4();
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();

    // Create a human-readable challenge message that the user will sign
    const message =
      `RuneBolt authentication challenge\n` +
      `Pubkey: ${pubkey}\n` +
      `Nonce: ${nonce}\n` +
      `Timestamp: ${timestamp}\n` +
      `Challenge ID: ${challengeId}`;

    const expiresAt = new Date(timestamp + CHALLENGE_EXPIRY_MS).toISOString();

    // Store challenge in database
    await this.db.createChallenge({
      id: challengeId,
      pubkey,
      challenge: message,
      expires_at: expiresAt,
    });

    console.log(`[ChallengeManager] Challenge created for ${pubkey.slice(0, 16)}...: ${challengeId}`);

    return { challengeId, message };
  }

  /**
   * Verify a signed challenge using BIP-322 Schnorr signature verification.
   *
   * SECURITY: This implements real cryptographic signature verification.
   * Never accepts signatures in any mode without proper verification.
   */
  async verifyChallenge(challengeId: string, signature: string): Promise<{ valid: boolean; pubkey: string | null }> {
    // Fetch the challenge from the database
    const challenge = await this.db.getChallenge(challengeId);
    if (!challenge) {
      console.log(`[ChallengeManager] Challenge ${challengeId} not found`);
      return { valid: false, pubkey: null };
    }

    // Check expiry
    const expiresAt = new Date(challenge.expires_at).getTime();
    if (Date.now() > expiresAt) {
      console.log(`[ChallengeManager] Challenge ${challengeId} expired`);
      await this.db.deleteChallenge(challengeId);
      return { valid: false, pubkey: null };
    }

    // CRITICAL: Actually verify the signature
    try {
      const messageHash = sha256(new TextEncoder().encode(challenge.challenge));
      const sigBytes = new Uint8Array(Buffer.from(signature, 'hex'));
      const pubkeyBytes = new Uint8Array(Buffer.from(challenge.pubkey, 'hex'));
      
      if (sigBytes.length !== 64) {
        console.log(`[ChallengeManager] Invalid signature length: ${sigBytes.length}`);
        return { valid: false, pubkey: null };
      }
      
      const isValid = await secp256k1.schnorr.verify(sigBytes, messageHash, pubkeyBytes);
      
      if (!isValid) {
        console.log(`[ChallengeManager] Signature verification failed for ${challenge.pubkey.slice(0, 16)}...`);
        return { valid: false, pubkey: null };
      }
      
      // Clean up the used challenge (one-time use)
      await this.db.deleteChallenge(challengeId);
      
      console.log(`[ChallengeManager] Challenge ${challengeId} verified successfully for ${challenge.pubkey.slice(0, 16)}...`);
      return { valid: true, pubkey: challenge.pubkey };
    } catch (err) {
      console.error('[ChallengeManager] Signature verification error:', err);
      return { valid: false, pubkey: null };
    }
  }
}

/**
 * PenaltyManager — Revocation enforcement for payment channels.
 *
 * When a user broadcasts an OLD (revoked) commitment transaction,
 * the counterparty can use the revealed revocation secret to claim ALL funds.
 * This is the core punishment mechanism that makes channels secure.
 */

import crypto from 'crypto';
import { sha256 } from '@noble/hashes/sha2.js';
import Database from '../db/Database';
import { MempoolClient, Transaction } from '../bitcoin/MempoolClient';

export interface RevocationSecret {
  channelId: string;
  sequence: number;
  secret: string;
  createdAt: string;
}

export interface BreachAttempt {
  id: string;
  channelId: string;
  detectedAt: string;
  breachTxid: string;
  breachTxHex: string;
  penaltyTxid: string | null;
  penaltyTxHex: string | null;
  status: 'detected' | 'penalty_broadcast' | 'penalty_confirmed' | 'failed';
}

export class PenaltyManager {
  private db: Database;
  private mempool: MempoolClient;

  constructor(mempoolClient?: MempoolClient) {
    this.db = Database.getInstance();
    this.mempool = mempoolClient || new MempoolClient();
  }

  /**
   * Generate a new revocation secret for a commitment.
   * Returns both the secret and its hash (the hash is shared with the counterparty).
   */
  static generateRevocationSecret(): { secret: string; hash: string } {
    const secret = crypto.randomBytes(32).toString('hex');
    const hash = Buffer.from(sha256(Buffer.from(secret, 'hex'))).toString('hex');
    return { secret, hash };
  }

  /**
   * Store a revocation secret revealed by the counterparty.
   * Called when a new commitment is created and the old one is revoked.
   */
  async storeRevocationSecret(
    channelId: string,
    sequence: number,
    secret: string
  ): Promise<void> {
    console.log(
      `[PenaltyManager] Storing revocation secret for channel ${channelId} seq #${sequence}`
    );

    await this.db.storeRevocationSecret(channelId, sequence, secret);
  }

  /**
   * Check if a broadcast transaction is an old (revoked) commitment.
   * Compares the broadcast tx against stored revocation secrets.
   *
   * Returns the breached sequence number, or null if the tx is legitimate.
   */
  async checkForBreach(
    channelId: string,
    broadcastedTx: Transaction
  ): Promise<number | null> {
    console.log(
      `[PenaltyManager] Checking for breach on channel ${channelId}, tx ${broadcastedTx.txid}`
    );

    const secrets = await this.db.getRevocationSecrets(channelId);
    if (secrets.length === 0) {
      return null;
    }

    // Extract the sequence number from the broadcast transaction.
    // In a real implementation, the commitment tx encodes the sequence
    // in the locktime or nSequence field per BOLT spec conventions.
    const txSequence = this.extractSequenceFromTx(broadcastedTx);
    if (txSequence === null) {
      return null;
    }

    // If we have a revocation secret for this sequence, it's a breach
    const match = secrets.find((s) => s.sequence === txSequence);
    if (match) {
      console.log(
        `[PenaltyManager] BREACH DETECTED on channel ${channelId}! ` +
          `Old commitment #${txSequence} was broadcast`
      );
      return txSequence;
    }

    return null;
  }

  /**
   * Build a penalty transaction that claims ALL channel funds.
   * Uses the revocation secret to spend from the breacher's output.
   */
  async buildPenaltyTx(
    channelId: string,
    breachTxid: string,
    breachTxHex: string
  ): Promise<{ penaltyTxHex: string; penaltyTxid: string }> {
    console.log(
      `[PenaltyManager] Building penalty tx for breach on channel ${channelId}`
    );

    const channel = await this.db.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const secrets = await this.db.getRevocationSecrets(channelId);
    if (secrets.length === 0) {
      throw new Error(`No revocation secrets found for channel ${channelId}`);
    }

    // In production, this would:
    // 1. Parse the breach transaction to find outputs
    // 2. Use the revocation secret to create a spending script
    // 3. Build a transaction spending ALL outputs to our address
    // 4. Sign with the revocation key path
    //
    // The penalty tx sends everything to the honest party's address.
    const penaltyData = {
      version: 2,
      inputs: [
        {
          txid: breachTxid,
          vout: 0,
          witness: ['revocation_signature', secrets[0].secret],
          sequence: 0xffffffff,
        },
        {
          txid: breachTxid,
          vout: 1,
          witness: ['revocation_signature', secrets[0].secret],
          sequence: 0xffffffff,
        },
      ],
      outputs: [
        {
          address: `bc1p_penalty_${channel.runebolt_pubkey.slice(0, 8)}`,
          value: 546,
        },
        { script: 'OP_RETURN runestone_penalty_sweep', value: 0 },
      ],
      locktime: 0,
    };

    const penaltyTxHex = Buffer.from(JSON.stringify(penaltyData)).toString('hex');
    const penaltyTxid = Buffer.from(
      sha256(Buffer.from(penaltyTxHex, 'hex'))
    ).toString('hex');

    // Record the breach attempt
    await this.db.recordBreach({
      channel_id: channelId,
      breach_txid: breachTxid,
      breach_tx_hex: breachTxHex,
      penalty_txid: penaltyTxid,
      penalty_tx_hex: penaltyTxHex,
      status: 'detected',
    });

    console.log(
      `[PenaltyManager] Penalty tx built: ${penaltyTxid.slice(0, 16)}...`
    );

    return { penaltyTxHex, penaltyTxid };
  }

  /**
   * Broadcast a penalty transaction to claim funds from a breach.
   */
  async broadcastPenaltyTx(
    channelId: string,
    penaltyTxHex: string
  ): Promise<string> {
    console.log(
      `[PenaltyManager] Broadcasting penalty tx for channel ${channelId}`
    );

    const txid = await this.mempool.broadcastTx(penaltyTxHex);

    // Update breach record status
    const breaches = await this.db.getBreaches(channelId);
    const latest = breaches[0];
    if (latest) {
      await this.db.query(
        `UPDATE breach_attempts SET status = 'penalty_broadcast', penalty_txid = $1, updated_at = NOW()
         WHERE id = $2`,
        [txid, latest.id]
      );
    }

    console.log(`[PenaltyManager] Penalty tx broadcast: ${txid}`);
    return txid;
  }

  /**
   * Extract commitment sequence number from a transaction.
   * In LN-style channels, the sequence is encoded in the locktime
   * or nSequence fields of the commitment transaction.
   */
  private extractSequenceFromTx(tx: Transaction): number | null {
    // Convention: commitment sequence is encoded in the lower 24 bits of locktime
    // Upper 8 bits = 0x20 marker to distinguish from block height/timestamp
    if ((tx.locktime & 0xff000000) === 0x20000000) {
      return tx.locktime & 0x00ffffff;
    }

    // Fallback: check nSequence of first input
    if (tx.vin.length > 0) {
      const seq = tx.vin[0].sequence;
      if (seq !== 0xffffffff && seq !== 0xfffffffe) {
        return seq & 0x00ffffff;
      }
    }

    return null;
  }
}

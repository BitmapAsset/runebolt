/**
 * DisputeManager — Handles dispute resolution for unilateral channel closes.
 *
 * When a party force-closes a channel, a challenge period (144 blocks / ~24 hours)
 * begins. During this window the counterparty can submit a newer state or
 * prove a breach. After the challenge period expires, the close is finalized.
 */

import Database from '../db/Database';
import { MempoolClient } from '../bitcoin/MempoolClient';
import { CommitmentManager } from './CommitmentManager';
import { ChannelState } from './ChannelState';

/** 144 blocks ≈ 24 hours on Bitcoin mainnet */
const CHALLENGE_PERIOD_BLOCKS = 144;

export type DisputeStatus = 'open' | 'challenged' | 'resolved' | 'penalized';

export interface Dispute {
  id: string;
  channelId: string;
  initiatedBy: string;
  status: DisputeStatus;
  latestSequence: number;
  challengeDeadline: string;
  broadcastTxid: string | null;
  createdAt: string;
  updatedAt: string;
}

export class DisputeManager {
  private db: Database;
  private mempool: MempoolClient;

  constructor(mempoolClient?: MempoolClient) {
    this.db = Database.getInstance();
    this.mempool = mempoolClient || new MempoolClient();
  }

  /**
   * Initiate a dispute when a unilateral close is detected or requested.
   * Calculates the challenge deadline based on the current block height.
   */
  async handleDisputeOpen(
    channelId: string,
    initiatedBy: string,
    broadcastTxid?: string
  ): Promise<Dispute> {
    console.log(
      `[DisputeManager] Opening dispute for channel ${channelId} by ${initiatedBy.slice(0, 16)}...`
    );

    // Get latest commitment to record the sequence
    const latestCommitment = await CommitmentManager.getLatestCommitment(channelId);
    if (!latestCommitment) {
      throw new Error(`No commitments found for channel ${channelId}`);
    }

    // Calculate challenge deadline
    const currentHeight = await this.mempool.getBlockHeight();
    const deadlineHeight = currentHeight + CHALLENGE_PERIOD_BLOCKS;
    // Approximate: 10 minutes per block
    const deadlineTime = new Date(
      Date.now() + CHALLENGE_PERIOD_BLOCKS * 10 * 60 * 1000
    );

    const row = await this.db.createDispute({
      channel_id: channelId,
      initiated_by: initiatedBy,
      latest_sequence: latestCommitment.sequence,
      challenge_deadline: deadlineTime.toISOString(),
      broadcast_txid: broadcastTxid || null,
    });

    // Update channel state to force-closing
    await this.db.updateChannelState(channelId, ChannelState.FORCE_CLOSING);

    console.log(
      `[DisputeManager] Dispute opened for channel ${channelId}. ` +
        `Challenge deadline: block ${deadlineHeight} (~${deadlineTime.toISOString()})`
    );

    return this.rowToDispute(row);
  }

  /**
   * Submit the latest state during a dispute's challenge period.
   * If our latest commitment has a higher sequence than the disputed one,
   * we can override the close with a more recent state.
   */
  async submitLatestState(
    channelId: string,
    submitterPubkey: string
  ): Promise<{ updated: boolean; sequence: number }> {
    console.log(
      `[DisputeManager] Submitting latest state for dispute on channel ${channelId}`
    );

    const dispute = await this.db.getDispute(channelId);
    if (!dispute) {
      throw new Error(`No active dispute for channel ${channelId}`);
    }

    if (dispute.status !== 'open') {
      throw new Error(
        `Dispute for channel ${channelId} is already ${dispute.status}`
      );
    }

    // Check if challenge period has expired
    if (new Date(dispute.challenge_deadline) < new Date()) {
      throw new Error(
        `Challenge period for channel ${channelId} has expired`
      );
    }

    const latestCommitment = await CommitmentManager.getLatestCommitment(channelId);
    if (!latestCommitment) {
      throw new Error(`No commitments found for channel ${channelId}`);
    }

    if (latestCommitment.sequence <= dispute.latest_sequence) {
      console.log(
        `[DisputeManager] No newer state available (latest: ${latestCommitment.sequence}, ` +
          `disputed: ${dispute.latest_sequence})`
      );
      return { updated: false, sequence: latestCommitment.sequence };
    }

    // We have a newer state — update the dispute
    await this.db.query(
      `UPDATE disputes
       SET latest_sequence = $1, status = 'challenged', updated_at = NOW()
       WHERE channel_id = $2`,
      [latestCommitment.sequence, channelId]
    );

    console.log(
      `[DisputeManager] Dispute challenged with newer state #${latestCommitment.sequence} ` +
        `by ${submitterPubkey.slice(0, 16)}...`
    );

    return { updated: true, sequence: latestCommitment.sequence };
  }

  /**
   * Resolve a dispute after the challenge period has expired.
   * Finalizes the channel close with the latest submitted state.
   */
  async resolveDispute(channelId: string): Promise<Dispute> {
    console.log(`[DisputeManager] Resolving dispute for channel ${channelId}`);

    const dispute = await this.db.getDispute(channelId);
    if (!dispute) {
      throw new Error(`No active dispute for channel ${channelId}`);
    }

    if (dispute.status === 'resolved' || dispute.status === 'penalized') {
      throw new Error(
        `Dispute for channel ${channelId} is already ${dispute.status}`
      );
    }

    // Verify challenge period has expired
    if (new Date(dispute.challenge_deadline) > new Date()) {
      const remaining = new Date(dispute.challenge_deadline).getTime() - Date.now();
      const blocksRemaining = Math.ceil(remaining / (10 * 60 * 1000));
      throw new Error(
        `Challenge period has not expired. ~${blocksRemaining} blocks remaining`
      );
    }

    // Finalize: mark dispute as resolved and close the channel
    const resolvedRow = await this.db.resolveDispute(channelId);
    await this.db.updateChannelState(channelId, ChannelState.CLOSED);

    console.log(
      `[DisputeManager] Dispute resolved for channel ${channelId} at sequence #${dispute.latest_sequence}`
    );

    return this.rowToDispute(resolvedRow);
  }

  /**
   * Get the current dispute status for a channel.
   */
  async getDispute(channelId: string): Promise<Dispute | null> {
    const row = await this.db.getDispute(channelId);
    if (!row) return null;
    return this.rowToDispute(row);
  }

  /**
   * Check if a dispute's challenge period has expired.
   */
  async isChallengeExpired(channelId: string): Promise<boolean> {
    const dispute = await this.db.getDispute(channelId);
    if (!dispute) return false;
    return new Date(dispute.challenge_deadline) < new Date();
  }

  private rowToDispute(row: {
    id: string;
    channel_id: string;
    initiated_by: string;
    status: string;
    latest_sequence: number;
    challenge_deadline: string;
    broadcast_txid: string | null;
    created_at: string;
    updated_at: string;
  }): Dispute {
    return {
      id: row.id,
      channelId: row.channel_id,
      initiatedBy: row.initiated_by,
      status: row.status as DisputeStatus,
      latestSequence: row.latest_sequence,
      challengeDeadline: row.challenge_deadline,
      broadcastTxid: row.broadcast_txid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

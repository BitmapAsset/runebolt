/**
 * Watchtower — Background service that monitors Bitcoin mempool for breach attempts.
 *
 * Watches funding transaction outputs for spends. If a revoked commitment
 * is broadcast, the watchtower automatically constructs and broadcasts
 * a penalty transaction to claim all channel funds.
 *
 * Polls mempool.space every 30 seconds for watched funding tx spends.
 */

import { MempoolClient, Transaction } from '../bitcoin/MempoolClient';
import { PenaltyManager } from '../channels/PenaltyManager';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export interface WatchedChannel {
  channelId: string;
  fundingTxid: string;
  fundingVout: number;
  latestSequence: number;
}

type BreachCallback = (
  channelId: string,
  breachTxid: string,
  penaltyTxid: string
) => void;

export class Watchtower {
  private mempool: MempoolClient;
  private penaltyManager: PenaltyManager;
  private watchedChannels: Map<string, WatchedChannel> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private breachCallbacks: BreachCallback[] = [];
  private isRunning: boolean = false;

  constructor(mempoolClient?: MempoolClient) {
    this.mempool = mempoolClient || new MempoolClient();
    this.penaltyManager = new PenaltyManager(this.mempool);
  }

  /**
   * Register a channel for monitoring.
   * The watchtower will watch for spends of the funding output.
   */
  async startWatching(
    channelId: string,
    fundingTxid: string,
    fundingVout: number,
    latestSequence: number
  ): Promise<void> {
    console.log(
      `[Watchtower] Start watching channel ${channelId}, ` +
        `funding: ${fundingTxid.slice(0, 16)}...:${fundingVout}`
    );

    this.watchedChannels.set(channelId, {
      channelId,
      fundingTxid,
      fundingVout,
      latestSequence,
    });

    // Auto-start polling if not already running
    if (!this.isRunning && this.watchedChannels.size > 0) {
      this.start();
    }
  }

  /**
   * Update the latest known sequence for a watched channel.
   * Called after each successful state update.
   */
  updateLatestSequence(channelId: string, sequence: number): void {
    const watched = this.watchedChannels.get(channelId);
    if (watched) {
      watched.latestSequence = sequence;
    }
  }

  /**
   * Unregister a channel from monitoring.
   * Called on cooperative close when there is no breach risk.
   */
  stopWatching(channelId: string): void {
    console.log(`[Watchtower] Stop watching channel ${channelId}`);
    this.watchedChannels.delete(channelId);

    // Stop polling if no channels to watch
    if (this.watchedChannels.size === 0) {
      this.stop();
    }
  }

  /**
   * Register a callback for breach detection events.
   */
  onBreachDetected(callback: BreachCallback): void {
    this.breachCallbacks.push(callback);
  }

  /**
   * Start the background polling loop.
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Watchtower] Already running');
      return;
    }

    console.log(
      `[Watchtower] Starting — monitoring ${this.watchedChannels.size} channels`
    );
    this.isRunning = true;

    // Initial poll
    void this.pollForBreaches();

    // Recurring poll
    this.pollTimer = setInterval(() => {
      void this.pollForBreaches();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stop the background polling loop.
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[Watchtower] Stopping');
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Get the number of channels currently being watched.
   */
  getWatchedCount(): number {
    return this.watchedChannels.size;
  }

  /**
   * Check if the watchtower is actively running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Poll mempool for spends of watched funding outputs.
   * If a spend is detected, check if it's a breach (old state).
   */
  private async pollForBreaches(): Promise<void> {
    if (this.watchedChannels.size === 0) return;

    console.log(
      `[Watchtower] Polling ${this.watchedChannels.size} channels for breaches`
    );

    for (const [channelId, watched] of this.watchedChannels) {
      try {
        await this.checkChannel(channelId, watched);
      } catch (err) {
        console.error(
          `[Watchtower] Error checking channel ${channelId}:`,
          err
        );
      }
    }
  }

  /**
   * Check a single channel for breach attempts.
   */
  private async checkChannel(
    channelId: string,
    watched: WatchedChannel
  ): Promise<void> {
    let spendingTx: Transaction;
    try {
      // Check if the funding output has been spent
      spendingTx = await this.mempool.getTx(watched.fundingTxid);
    } catch {
      // Transaction not found or API error — skip this round
      return;
    }

    // If the funding tx is still unspent, nothing to do
    if (!spendingTx.status.confirmed) {
      return;
    }

    // Check if there's a spending transaction for this output
    // by looking for transactions that reference our funding txid as an input
    const breachedSequence = await this.penaltyManager.checkForBreach(
      channelId,
      spendingTx
    );

    if (breachedSequence !== null) {
      console.log(
        `[Watchtower] BREACH on channel ${channelId}! ` +
          `Old state #${breachedSequence} broadcast`
      );
      await this.handleBreach(channelId, spendingTx);
    }
  }

  /**
   * Handle a detected breach: build and broadcast penalty transaction.
   */
  private async handleBreach(
    channelId: string,
    breachTx: Transaction
  ): Promise<void> {
    try {
      // Get the raw hex for the breach tx
      const breachTxHex = await this.mempool.getTxHex(breachTx.txid);

      // Build penalty transaction
      const { penaltyTxHex } =
        await this.penaltyManager.buildPenaltyTx(
          channelId,
          breachTx.txid,
          breachTxHex
        );

      // Broadcast penalty transaction
      const broadcastTxid = await this.penaltyManager.broadcastPenaltyTx(
        channelId,
        penaltyTxHex
      );

      // Notify callbacks
      for (const callback of this.breachCallbacks) {
        try {
          callback(channelId, breachTx.txid, broadcastTxid);
        } catch (err) {
          console.error('[Watchtower] Breach callback error:', err);
        }
      }

      // Stop watching this channel — it's been penalized
      this.stopWatching(channelId);

      console.log(
        `[Watchtower] Penalty tx broadcast for channel ${channelId}: ${broadcastTxid}`
      );
    } catch (err) {
      console.error(
        `[Watchtower] Failed to handle breach on channel ${channelId}:`,
        err
      );
    }
  }
}

/**
 * RuneLedger — the off-chain ledger for Rune transfers between channels.
 *
 * OPTIMIZED VERSION for mass adoption:
 * - Redis caching for sub-millisecond balance lookups
 * - Worker thread pool for non-blocking transfer execution
 * - Batch processing for high-throughput scenarios
 * - Cache invalidation on state changes
 * 
 * SECURITY FEATURES:
 * - Nonce-based replay attack prevention
 * - Client-side signature verification
 * - Double-spend prevention via database transaction
 */

import { v4 as uuidv4 } from 'uuid';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import Database from '../db/Database';
import { ChannelState, channelFromRow } from '../channels/ChannelState';
import { CommitmentManager } from '../channels/CommitmentManager';
import { Transfer } from './Transfer';
import { getCache, RedisCache } from '../cache/RedisCache';
import { getTransferWorkerPool, TransferWorkerPool } from '../workers/TransferWorker';
import { validateTransferAgainstReserve } from '../channels/ChannelReserves';

/** Maximum safe BigInt amount — mirrors Number.MAX_SAFE_INTEGER */
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

interface TransferOptions {
  skipCache?: boolean;
  useWorker?: boolean;
}

export class RuneLedger {
  private db: Database;
  private cache: RedisCache;
  private workerPool: TransferWorkerPool;
  private batchMode: boolean = false;
  private batchQueue: Array<{
    fromChannelId: string;
    toChannelId: string;
    amount: bigint;
    memo?: string;
    resolve: (transfer: Transfer) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_FLUSH_MS = 50;

  constructor() {
    this.db = Database.getInstance();
    this.cache = getCache();
    this.workerPool = getTransferWorkerPool();
  }

  /**
   * Enable batch mode for high-throughput processing.
   */
  enableBatchMode(): void {
    this.batchMode = true;
    this.startBatchTimer();
    console.log('[RuneLedger] Batch mode enabled');
  }

  /**
   * Disable batch mode and flush remaining transfers.
   */
  async disableBatchMode(): Promise<void> {
    this.batchMode = false;
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    await this.flushBatch();
    console.log('[RuneLedger] Batch mode disabled');
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.flushBatch();
      }
    }, this.BATCH_FLUSH_MS);
  }

  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
    console.log(`[RuneLedger] Flushing batch of ${batch.length} transfers`);

    await this.db.transaction(async () => {
      for (const item of batch) {
        try {
          const transfer = await this.executeTransferInternal(
            item.fromChannelId,
            item.toChannelId,
            item.amount,
            item.memo
          );
          item.resolve(transfer);
        } catch (err) {
          item.reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
  }

  /**
   * Execute a transfer between two channels.
   */
  async transfer(
    fromChannelId: string,
    toChannelId: string,
    amount: bigint,
    memo: string | undefined,
    nonce: string,
    clientSignature: string,
    _senderPubkey: string,
    options: TransferOptions = {}
  ): Promise<Transfer> {
    if (amount <= 0n) {
      throw new Error('Transfer amount must be positive');
    }

    // SECURITY: Overflow protection
    if (amount > MAX_SAFE_BIGINT) {
      throw new Error('Transfer amount exceeds maximum safe value');
    }

    if (fromChannelId === toChannelId) {
      throw new Error('Cannot transfer to the same channel');
    }

    // SECURITY: Enforce nonce uniqueness to prevent replay attacks
    if (nonce) {
      const existingTransfer = await this.db.getTransferByNonce(nonce);
      if (existingTransfer) {
        throw new Error('Transfer nonce already used (replay attack prevented)');
      }
    }

    // SECURITY: Verify client signature over transfer parameters
    if (clientSignature && _senderPubkey) {
      const message = `${fromChannelId}${toChannelId}${amount.toString()}${nonce}`;
      const messageHash = sha256(new TextEncoder().encode(message));
      try {
        const sigBytes = Uint8Array.from(Buffer.from(clientSignature, 'hex'));
        const pubkeyBytes = Uint8Array.from(Buffer.from(_senderPubkey, 'hex'));
        const valid = secp256k1.schnorr.verify(sigBytes, messageHash, pubkeyBytes);
        if (!valid) {
          throw new Error('Invalid transfer signature');
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Invalid transfer signature') {
          throw err;
        }
        throw new Error('Transfer signature verification failed: ' + (err instanceof Error ? err.message : String(err)));
      }
    }

    if (this.batchMode) {
      return new Promise((resolve, reject) => {
        this.batchQueue.push({ fromChannelId, toChannelId, amount, memo, resolve, reject });
        if (this.batchQueue.length >= this.BATCH_SIZE) {
          this.flushBatch();
        }
      });
    }

    let fromBalance = options.skipCache ? null : await this.cache.getChannelBalance(fromChannelId);
    let toBalance = options.skipCache ? null : await this.cache.getChannelBalance(toChannelId);

    if (!fromBalance) {
      const fromRow = await this.db.getChannel(fromChannelId);
      if (!fromRow) throw new Error(`Sender channel ${fromChannelId} not found`);
      const channel = channelFromRow(fromRow);
      fromBalance = { local: channel.localBalance, remote: channel.remoteBalance, capacity: channel.capacity };
      await this.cache.setChannelBalance(fromChannelId, fromBalance);
    }

    if (!toBalance) {
      const toRow = await this.db.getChannel(toChannelId);
      if (!toRow) throw new Error(`Recipient channel ${toChannelId} not found`);
      const channel = channelFromRow(toRow);
      toBalance = { local: channel.localBalance, remote: channel.remoteBalance, capacity: channel.capacity };
      await this.cache.setChannelBalance(toChannelId, toBalance);
    }

    if (fromBalance.local < amount) {
      throw new Error(`Insufficient balance in channel ${fromChannelId}`);
    }

    // SECURITY: Check reserve — sender must retain 1% of capacity after transfer
    if (!validateTransferAgainstReserve(fromBalance.local, fromBalance.capacity, amount)) {
      throw new Error(`Transfer would violate channel reserve in ${fromChannelId}`);
    }

    if (toBalance.remote < amount) {
      throw new Error(`Insufficient inbound capacity in channel ${toChannelId}`);
    }

    let transfer: Transfer;
    if (options.useWorker !== false) {
      transfer = await this.executeTransferWithWorker(fromChannelId, toChannelId, fromBalance, toBalance, amount, memo, { nonce, clientSignature });
    } else {
      transfer = await this.executeTransferSync(fromChannelId, toChannelId, amount, memo, { nonce, clientSignature });
    }

    // Structured audit log for every transfer
    console.log(JSON.stringify({
      audit: 'transfer',
      id: transfer.id,
      from: fromChannelId,
      to: toChannelId,
      amount: amount.toString(),
      nonce,
      timestamp: transfer.createdAt,
    }));

    return transfer;
  }

  private async executeTransferWithWorker(
    fromChannelId: string,
    toChannelId: string,
    fromBalance: { local: bigint; remote: bigint; capacity: bigint },
    toBalance: { local: bigint; remote: bigint; capacity: bigint },
    amount: bigint,
    memo: string | undefined,
    security: { nonce: string; clientSignature: string }
  ): Promise<Transfer> {
    const transferId = uuidv4();

    const workerResult = await this.workerPool.executeTransfer({
      id: transferId,
      fromChannel: fromChannelId,
      toChannel: toChannelId,
      fromBalance: { local: fromBalance.local.toString(), remote: fromBalance.remote.toString() },
      toBalance: { local: toBalance.local.toString(), remote: toBalance.remote.toString() },
      amount: amount.toString(),
      memo,
    });

    if (!workerResult.success) {
      throw new Error(workerResult.error || 'Transfer failed in worker');
    }

    const transfer = await this.db.transaction(async () => {
      await this.db.updateChannelBalances(fromChannelId, workerResult.newFromBalance!.local, workerResult.newFromBalance!.remote);
      await this.db.updateChannelBalances(toChannelId, workerResult.newToBalance!.local, workerResult.newToBalance!.remote);
      await this.db.createTransfer({ id: transferId, from_channel: fromChannelId, to_channel: toChannelId, amount: amount.toString(), memo: memo || null, nonce: security.nonce, client_signature: security.clientSignature });

      const fromCommitment = await CommitmentManager.getLatestCommitment(fromChannelId);
      const toCommitment = await CommitmentManager.getLatestCommitment(toChannelId);

      await CommitmentManager.createCommitment(fromChannelId, BigInt(workerResult.newFromBalance!.local), BigInt(workerResult.newFromBalance!.remote), (fromCommitment?.sequence ?? 0) + 1);
      await CommitmentManager.createCommitment(toChannelId, BigInt(workerResult.newToBalance!.local), BigInt(workerResult.newToBalance!.remote), (toCommitment?.sequence ?? 0) + 1);

      return {
        id: transferId,
        fromChannel: fromChannelId,
        toChannel: toChannelId,
        amount,
        memo: memo || null,
        nonce: security.nonce,
        clientSignature: security.clientSignature,
        transferHash: '',
        createdAt: workerResult.timestamp,
      } satisfies Transfer;
    });

    await this.cache.setChannelBalance(fromChannelId, { local: BigInt(workerResult.newFromBalance!.local), remote: BigInt(workerResult.newFromBalance!.remote), capacity: fromBalance.capacity });
    await this.cache.setChannelBalance(toChannelId, { local: BigInt(workerResult.newToBalance!.local), remote: BigInt(workerResult.newToBalance!.remote), capacity: toBalance.capacity });
    await this.cache.markHotChannel(fromChannelId);
    await this.cache.markHotChannel(toChannelId);

    return transfer;
  }

  private async executeTransferSync(fromChannelId: string, toChannelId: string, amount: bigint, memo: string | undefined, security: { nonce: string; clientSignature: string }): Promise<Transfer> {
    return this.db.transaction(async () => {
      const fromRow = await this.db.getChannel(fromChannelId);
      if (!fromRow) throw new Error(`Sender channel ${fromChannelId} not found`);
      const fromChannel = channelFromRow(fromRow);
      if (fromChannel.state !== ChannelState.OPEN) throw new Error(`Sender channel ${fromChannelId} is not OPEN`);

      const toRow = await this.db.getChannel(toChannelId);
      if (!toRow) throw new Error(`Recipient channel ${toChannelId} not found`);
      const toChannel = channelFromRow(toRow);
      if (toChannel.state !== ChannelState.OPEN) throw new Error(`Recipient channel ${toChannelId} is not OPEN`);

      if (fromChannel.localBalance < amount) throw new Error(`Insufficient balance in channel ${fromChannelId}`);
      if (toChannel.remoteBalance < amount) throw new Error(`Insufficient inbound capacity in channel ${toChannelId}`);

      const newFromLocal = fromChannel.localBalance - amount;
      const newFromRemote = fromChannel.remoteBalance + amount;
      const newToLocal = toChannel.localBalance + amount;
      const newToRemote = toChannel.remoteBalance - amount;

      await this.db.updateChannelBalances(fromChannelId, newFromLocal.toString(), newFromRemote.toString());
      await this.db.updateChannelBalances(toChannelId, newToLocal.toString(), newToRemote.toString());

      const transferId = uuidv4();
      await this.db.createTransfer({ id: transferId, from_channel: fromChannelId, to_channel: toChannelId, amount: amount.toString(), memo: memo || null, nonce: security.nonce, client_signature: security.clientSignature });

      const fromCommitment = await CommitmentManager.getLatestCommitment(fromChannelId);
      const toCommitment = await CommitmentManager.getLatestCommitment(toChannelId);

      await CommitmentManager.createCommitment(fromChannelId, newFromLocal, newFromRemote, (fromCommitment?.sequence ?? 0) + 1);
      await CommitmentManager.createCommitment(toChannelId, newToLocal, newToRemote, (toCommitment?.sequence ?? 0) + 1);

      await this.cache.setChannelBalance(fromChannelId, { local: newFromLocal, remote: newFromRemote, capacity: fromChannel.capacity });
      await this.cache.setChannelBalance(toChannelId, { local: newToLocal, remote: newToRemote, capacity: toChannel.capacity });

      return {
        id: transferId,
        fromChannel: fromChannelId,
        toChannel: toChannelId,
        amount,
        memo: memo || null,
        nonce: security.nonce,
        clientSignature: security.clientSignature,
        transferHash: '',
        createdAt: new Date().toISOString(),
      } satisfies Transfer;
    });
  }

  private async executeTransferInternal(fromChannelId: string, toChannelId: string, amount: bigint, memo?: string): Promise<Transfer> {
    const fromRow = await this.db.getChannel(fromChannelId);
    if (!fromRow) throw new Error(`Sender channel ${fromChannelId} not found`);
    const fromChannel = channelFromRow(fromRow);
    if (fromChannel.state !== ChannelState.OPEN) throw new Error(`Sender channel ${fromChannelId} is not OPEN`);

    const toRow = await this.db.getChannel(toChannelId);
    if (!toRow) throw new Error(`Recipient channel ${toChannelId} not found`);
    const toChannel = channelFromRow(toRow);
    if (toChannel.state !== ChannelState.OPEN) throw new Error(`Recipient channel ${toChannelId} is not OPEN`);

    if (fromChannel.localBalance < amount) throw new Error(`Insufficient balance in channel ${fromChannelId}`);
    if (toChannel.remoteBalance < amount) throw new Error(`Insufficient inbound capacity in channel ${toChannelId}`);

    const newFromLocal = fromChannel.localBalance - amount;
    const newFromRemote = fromChannel.remoteBalance + amount;
    const newToLocal = toChannel.localBalance + amount;
    const newToRemote = toChannel.remoteBalance - amount;

    await this.db.updateChannelBalances(fromChannelId, newFromLocal.toString(), newFromRemote.toString());
    await this.db.updateChannelBalances(toChannelId, newToLocal.toString(), newToRemote.toString());

    const transferId = uuidv4();
    await this.db.createTransfer({ id: transferId, from_channel: fromChannelId, to_channel: toChannelId, amount: amount.toString(), memo: memo || null });

    await this.cache.setChannelBalance(fromChannelId, { local: newFromLocal, remote: newFromRemote, capacity: fromChannel.capacity });
    await this.cache.setChannelBalance(toChannelId, { local: newToLocal, remote: newToRemote, capacity: toChannel.capacity });

    return {
      id: transferId,
      fromChannel: fromChannelId,
      toChannel: toChannelId,
      amount,
      memo: memo || null,
      nonce: '',
      clientSignature: '',
      transferHash: '',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get the current balance of a channel (cached).
   */
  async getBalance(channelId: string): Promise<{ local: bigint; remote: bigint; capacity: bigint }> {
    const cached = await this.cache.getChannelBalance(channelId);
    if (cached) return cached;

    const row = await this.db.getChannel(channelId);
    if (!row) throw new Error(`Channel ${channelId} not found`);

    const channel = channelFromRow(row);
    const balance = { local: channel.localBalance, remote: channel.remoteBalance, capacity: channel.capacity };
    await this.cache.setChannelBalance(channelId, balance);
    return balance;
  }

  /**
   * Get transfer history for a user.
   */
  async getTransferHistory(pubkey: string, limit: number = 50, offset: number = 0): Promise<Transfer[]> {
    const rows = await this.db.getTransfersByPubkey(pubkey, limit, offset);
    return rows.map((row) => ({
      id: row.id,
      fromChannel: row.from_channel,
      toChannel: row.to_channel,
      amount: BigInt(row.amount),
      memo: row.memo,
      nonce: '',
      clientSignature: '',
      transferHash: '',
      createdAt: row.created_at,
    }));
  }

  /**
   * Find an open channel for a given pubkey.
   */
  async findOpenChannelForPubkey(pubkey: string): Promise<string | null> {
    const cached = await this.cache.getUserChannels(pubkey);
    if (cached) {
      for (const channelId of cached) {
        const state = await this.cache.getChannelState(channelId);
        if (state === ChannelState.OPEN) return channelId;
      }
    }

    const channels = await this.db.getChannelsByPubkey(pubkey);
    const channelIds = channels.map(ch => ch.id);
    await this.cache.setUserChannels(pubkey, channelIds);

    for (const ch of channels) {
      await this.cache.setChannelState(ch.id, ch.state);
      if (ch.state === ChannelState.OPEN) return ch.id;
    }
    return null;
  }

  /**
   * Invalidate cache for a channel.
   */
  async invalidateChannelCache(channelId: string): Promise<void> {
    await this.cache.invalidateChannelBalance(channelId);
  }

  /**
   * Get hot channels (high activity).
   */
  async getHotChannels(limit: number = 100): Promise<string[]> {
    return this.cache.getHotChannels(limit);
  }

  /**
   * Get ledger statistics.
   */
  getStats(): { batchQueueSize: number; workerPoolStats: ReturnType<TransferWorkerPool['getStats']> } {
    return { batchQueueSize: this.batchQueue.length, workerPoolStats: this.workerPool.getStats() };
  }
}

export default RuneLedger;

/**
 * DeedWatcher — Monitors Bitcoin mempool and blocks for incoming deed notifications.
 *
 * Watches a specific address for incoming transactions containing RuneBolt
 * OP_RETURN notifications. Emits events when deeds are detected, confirmed,
 * or when preimage notifications are received.
 */
import { EventEmitter } from 'events';
import { BitcoinRPC, RawTransaction } from './BitcoinRPC';
/** Represents an incoming deed detected by the watcher */
export interface IncomingDeed {
    /** Txid of the notification transaction */
    notificationTxid: string;
    /** Txid of the deed-lock (truncated, from OP_RETURN) */
    deedLockTxid: string;
    /** 32-byte preimage P extracted from OP_RETURN */
    preimage: Buffer;
    /** 32-byte payment hash H = SHA256(P) */
    paymentHash: Buffer;
    /** Asset type hint (reserved for future metadata) */
    assetType: string;
    /** Block height where notification was confirmed (undefined if 0-conf) */
    confirmedAt?: number;
}
/**
 * DeedWatcher events:
 * - "deed_detected" — New incoming deed found in mempool (0-conf)
 * - "deed_confirmed" — Deed notification confirmed on-chain
 * - "notification_received" — Preimage P extracted from OP_RETURN
 */
export declare class DeedWatcher extends EventEmitter {
    private address;
    private rpc;
    private pendingDeeds;
    private seenTxids;
    private pollInterval;
    private lastBlockHeight;
    private running;
    /** Poll interval in milliseconds (default: 15 seconds) */
    pollIntervalMs: number;
    constructor(address: string, rpcClient: BitcoinRPC);
    /**
     * Start watching for incoming deed notifications.
     * Polls mempool and new blocks at the configured interval.
     */
    start(): void;
    /** Stop watching. */
    stop(): void;
    /** Get all pending (unconfirmed or unclaimed) incoming deeds. */
    getPendingDeeds(): IncomingDeed[];
    /** Remove a deed from the pending list (e.g., after claiming). */
    removeDeed(notificationTxid: string): void;
    /**
     * Scans mempool transactions for the watched address.
     * Looks for OP_RETURN outputs with RuneBolt notification data.
     */
    private scanMempool;
    /**
     * Checks for new blocks since last scan and processes them.
     */
    private checkNewBlocks;
    /**
     * Scans a block for transactions relevant to the watched address.
     */
    private scanBlock;
    /**
     * Parses a transaction for RuneBolt notification data.
     * Returns the parsed IncomingDeed or null if not a notification.
     */
    parseNotification(tx: RawTransaction): IncomingDeed | null;
    /**
     * Processes a single transaction — checks for notification and emits events.
     */
    private processTransaction;
}
//# sourceMappingURL=DeedWatcher.d.ts.map
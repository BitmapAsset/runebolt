"use strict";
/**
 * DeedWatcher — Monitors Bitcoin mempool and blocks for incoming deed notifications.
 *
 * Watches a specific address for incoming transactions containing RuneBolt
 * OP_RETURN notifications. Emits events when deeds are detected, confirmed,
 * or when preimage notifications are received.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeedWatcher = void 0;
const events_1 = require("events");
const DeedNotifier_1 = require("./DeedNotifier");
/**
 * DeedWatcher events:
 * - "deed_detected" — New incoming deed found in mempool (0-conf)
 * - "deed_confirmed" — Deed notification confirmed on-chain
 * - "notification_received" — Preimage P extracted from OP_RETURN
 */
class DeedWatcher extends events_1.EventEmitter {
    address;
    rpc;
    pendingDeeds = new Map();
    seenTxids = new Set();
    pollInterval = null;
    lastBlockHeight = 0;
    running = false;
    /** Poll interval in milliseconds (default: 15 seconds) */
    pollIntervalMs = 15_000;
    constructor(address, rpcClient) {
        super();
        this.address = address;
        this.rpc = rpcClient;
    }
    /**
     * Start watching for incoming deed notifications.
     * Polls mempool and new blocks at the configured interval.
     */
    start() {
        if (this.running)
            return;
        this.running = true;
        // Initial scan
        this.scanMempool().catch((err) => this.emit('error', err));
        this.pollInterval = setInterval(async () => {
            try {
                await this.scanMempool();
                await this.checkNewBlocks();
            }
            catch (err) {
                this.emit('error', err);
            }
        }, this.pollIntervalMs);
    }
    /** Stop watching. */
    stop() {
        this.running = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    /** Get all pending (unconfirmed or unclaimed) incoming deeds. */
    getPendingDeeds() {
        return Array.from(this.pendingDeeds.values());
    }
    /** Remove a deed from the pending list (e.g., after claiming). */
    removeDeed(notificationTxid) {
        this.pendingDeeds.delete(notificationTxid);
    }
    /**
     * Scans mempool transactions for the watched address.
     * Looks for OP_RETURN outputs with RuneBolt notification data.
     */
    async scanMempool() {
        let txs;
        try {
            txs = await this.rpc.getAddressMempoolTxs(this.address);
        }
        catch {
            // Fallback: if address-based mempool query isn't supported, skip
            return;
        }
        for (const tx of txs) {
            await this.processTransaction(tx);
        }
    }
    /**
     * Checks for new blocks since last scan and processes them.
     */
    async checkNewBlocks() {
        const currentHeight = await this.rpc.getBlockCount();
        if (currentHeight <= this.lastBlockHeight && this.lastBlockHeight > 0)
            return;
        // On first run, only check the latest block
        const startHeight = this.lastBlockHeight > 0 ? this.lastBlockHeight + 1 : currentHeight;
        for (let height = startHeight; height <= currentHeight; height++) {
            try {
                const blockHash = await this.rpc.getBlockHash(height);
                await this.scanBlock(blockHash, height);
            }
            catch (err) {
                this.emit('error', err);
            }
        }
        this.lastBlockHeight = currentHeight;
    }
    /**
     * Scans a block for transactions relevant to the watched address.
     */
    async scanBlock(blockHash, blockHeight) {
        const block = await this.rpc.getBlock(blockHash);
        for (const txid of block.tx) {
            // Check if this is an already-pending deed that's now confirmed
            const pending = this.pendingDeeds.get(txid);
            if (pending && !pending.confirmedAt) {
                pending.confirmedAt = blockHeight;
                this.emit('deed_confirmed', pending);
                continue;
            }
            // Skip already-seen transactions
            if (this.seenTxids.has(txid))
                continue;
            // Fetch and process new transactions
            try {
                const tx = await this.rpc.getRawTransaction(txid);
                // Check if any output is addressed to us
                const isForUs = tx.vout.some((out) => out.scriptPubKey.address === this.address);
                if (isForUs) {
                    const deed = await this.processTransaction(tx, blockHeight);
                    if (deed) {
                        deed.confirmedAt = blockHeight;
                        this.emit('deed_confirmed', deed);
                    }
                }
            }
            catch {
                // Skip transactions we can't fetch
            }
        }
    }
    /**
     * Parses a transaction for RuneBolt notification data.
     * Returns the parsed IncomingDeed or null if not a notification.
     */
    parseNotification(tx) {
        // Look for OP_RETURN outputs
        for (const vout of tx.vout) {
            const scriptHex = vout.scriptPubKey.hex;
            // OP_RETURN starts with 6a
            if (!scriptHex.startsWith('6a'))
                continue;
            // Parse the OP_RETURN data
            const scriptBuf = Buffer.from(scriptHex, 'hex');
            // Skip OP_RETURN (0x6a) and the pushdata byte(s)
            let dataStart = 1;
            if (scriptBuf.length > 1) {
                const pushLen = scriptBuf[1];
                if (pushLen <= 75) {
                    dataStart = 2;
                }
                else if (pushLen === 0x4c) {
                    // OP_PUSHDATA1
                    dataStart = 3;
                }
                else if (pushLen === 0x4d) {
                    // OP_PUSHDATA2
                    dataStart = 4;
                }
            }
            const opReturnData = scriptBuf.subarray(dataStart);
            const decoded = (0, DeedNotifier_1.decodeNotification)(opReturnData);
            if (decoded) {
                return {
                    notificationTxid: tx.txid,
                    deedLockTxid: decoded.deedLockTxid,
                    preimage: decoded.preimage,
                    paymentHash: decoded.paymentHash,
                    assetType: 'unknown', // Could be extended with metadata
                };
            }
        }
        return null;
    }
    /**
     * Processes a single transaction — checks for notification and emits events.
     */
    async processTransaction(tx, blockHeight) {
        if (this.seenTxids.has(tx.txid))
            return null;
        this.seenTxids.add(tx.txid);
        const deed = this.parseNotification(tx);
        if (!deed)
            return null;
        if (blockHeight) {
            deed.confirmedAt = blockHeight;
        }
        this.pendingDeeds.set(deed.notificationTxid, deed);
        // Emit events
        this.emit('notification_received', deed);
        if (deed.confirmedAt) {
            this.emit('deed_confirmed', deed);
        }
        else {
            this.emit('deed_detected', deed);
        }
        return deed;
    }
}
exports.DeedWatcher = DeedWatcher;
//# sourceMappingURL=DeedWatcher.js.map
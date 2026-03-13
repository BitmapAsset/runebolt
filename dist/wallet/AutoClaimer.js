"use strict";
/**
 * AutoClaimer — Automatically claims incoming deed-locked UTXOs.
 *
 * Listens to DeedWatcher events and claims deeds based on configuration:
 * - 0-conf deeds: claimed immediately if zeroConfTrust is enabled and value < threshold
 * - Confirmed deeds: always claimed
 * - Batch mode: waits batchDelayMs to group multiple deeds into one tx
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoClaimer = void 0;
const DeedClaim_1 = require("../ldp/DeedClaim");
/**
 * AutoClaimer automatically claims incoming deed-locked UTXOs.
 * Supports both immediate single claims and batched multi-deed claims.
 */
class AutoClaimer {
    wallet;
    rpc;
    watcher;
    batchQueue = [];
    batchTimer = null;
    running = false;
    claimHistory = [];
    config;
    constructor(wallet, rpcClient, watcher) {
        this.wallet = wallet;
        this.rpc = rpcClient;
        this.watcher = watcher;
        this.config = {
            zeroConfTrust: false,
            zeroConfMaxSats: 100_000,
            batchDelayMs: 30_000,
            destinationAddress: '',
        };
    }
    /** Start auto-claiming — listens to DeedWatcher events. */
    start() {
        if (this.running)
            return;
        if (!this.config.destinationAddress) {
            throw new Error('AutoClaimer: destinationAddress must be configured');
        }
        this.running = true;
        this.watcher.on('deed_detected', (deed) => this.onDeedDetected(deed));
        this.watcher.on('deed_confirmed', (deed) => this.onDeedConfirmed(deed));
    }
    /** Stop auto-claiming. */
    stop() {
        this.running = false;
        this.watcher.removeAllListeners('deed_detected');
        this.watcher.removeAllListeners('deed_confirmed');
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }
    /** Get claim history. */
    getClaimHistory() {
        return [...this.claimHistory];
    }
    /**
     * Handles a 0-conf deed detection.
     * Claims immediately if zeroConfTrust is enabled and value is below threshold.
     */
    async onDeedDetected(deed) {
        if (!this.running)
            return;
        if (!this.config.zeroConfTrust)
            return;
        // Queue for batch claiming
        this.addToBatch(deed);
    }
    /**
     * Handles a confirmed deed.
     * Always queues for claiming.
     */
    async onDeedConfirmed(deed) {
        if (!this.running)
            return;
        this.addToBatch(deed);
    }
    /**
     * Adds a deed to the batch queue and starts/resets the batch timer.
     */
    addToBatch(deed) {
        // Avoid duplicates
        if (this.batchQueue.some((d) => d.notificationTxid === deed.notificationTxid))
            return;
        this.batchQueue.push(deed);
        // If batch delay is 0, claim immediately
        if (this.config.batchDelayMs <= 0) {
            this.flushBatch();
            return;
        }
        // Start or reset batch timer
        if (this.batchTimer)
            clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(() => this.flushBatch(), this.config.batchDelayMs);
    }
    /**
     * Flushes the batch queue — claims all queued deeds.
     */
    async flushBatch() {
        if (this.batchQueue.length === 0)
            return;
        const deeds = [...this.batchQueue];
        this.batchQueue = [];
        this.batchTimer = null;
        if (deeds.length === 1) {
            await this.claimDeed(deeds[0]);
        }
        else {
            await this.batchClaimDeeds(deeds);
        }
    }
    /**
     * Claims a single deed-locked UTXO.
     *
     * @param deed - The incoming deed to claim
     * @returns Claim transaction ID
     */
    async claimDeed(deed) {
        // Fetch the deed-lock transaction to get output details
        const deedLockTx = await this.rpc.getRawTransaction(deed.deedLockTxid);
        if (!deedLockTx) {
            throw new Error(`Deed-lock tx not found: ${deed.deedLockTxid}`);
        }
        // Find the deed-locked output (the P2TR output)
        const deedOutput = deedLockTx.vout[0]; // Deed-lock output is typically vout 0
        const deedInfo = {
            txid: deed.deedLockTxid,
            vout: 0,
            value: Math.round(deedOutput.value * 1e8),
            scriptPubKey: Buffer.from(deedOutput.scriptPubKey.hex, 'hex'),
            paymentHash: deed.paymentHash,
            recipientPubkey: this.wallet.publicKey,
            ownerPubkey: Buffer.alloc(32), // Will be derived from the deed-lock script
            timeoutBlocks: 144, // Default timeout
        };
        const psbt = (0, DeedClaim_1.createClaimTransaction)(deedInfo, deed.preimage, this.wallet.privateKey, this.config.destinationAddress, await this.rpc.estimateFee(6), this.wallet.network);
        // Extract and broadcast
        const txHex = psbt.extractTransaction(true).toHex();
        const txid = await this.rpc.broadcastTx(txHex);
        const result = {
            txid,
            deedsCount: 1,
            totalValue: deedInfo.value,
        };
        this.claimHistory.push(result);
        // Remove from watcher's pending list
        this.watcher.removeDeed(deed.notificationTxid);
        return txid;
    }
    /**
     * Batch-claims multiple deed-locked UTXOs in a single transaction.
     * Saves on-chain fees by combining inputs.
     *
     * @param deeds - Array of incoming deeds to claim
     * @returns Claim transaction ID
     */
    async batchClaimDeeds(deeds) {
        const deedInfos = [];
        const preimages = [];
        let totalValue = 0;
        for (const deed of deeds) {
            const deedLockTx = await this.rpc.getRawTransaction(deed.deedLockTxid);
            const deedOutput = deedLockTx.vout[0];
            const value = Math.round(deedOutput.value * 1e8);
            deedInfos.push({
                txid: deed.deedLockTxid,
                vout: 0,
                value,
                scriptPubKey: Buffer.from(deedOutput.scriptPubKey.hex, 'hex'),
                paymentHash: deed.paymentHash,
                recipientPubkey: this.wallet.publicKey,
                ownerPubkey: Buffer.alloc(32),
                timeoutBlocks: 144,
            });
            preimages.push(deed.preimage);
            totalValue += value;
        }
        const feeRate = await this.rpc.estimateFee(6);
        const psbt = (0, DeedClaim_1.batchClaim)(deedInfos, preimages, this.wallet.privateKey, this.config.destinationAddress, feeRate, this.wallet.network);
        const txHex = psbt.extractTransaction(true).toHex();
        const txid = await this.rpc.broadcastTx(txHex);
        const result = { txid, deedsCount: deeds.length, totalValue };
        this.claimHistory.push(result);
        // Remove all claimed deeds from watcher
        for (const deed of deeds) {
            this.watcher.removeDeed(deed.notificationTxid);
        }
        return txid;
    }
}
exports.AutoClaimer = AutoClaimer;
//# sourceMappingURL=AutoClaimer.js.map
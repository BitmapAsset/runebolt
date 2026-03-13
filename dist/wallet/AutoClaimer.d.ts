/**
 * AutoClaimer — Automatically claims incoming deed-locked UTXOs.
 *
 * Listens to DeedWatcher events and claims deeds based on configuration:
 * - 0-conf deeds: claimed immediately if zeroConfTrust is enabled and value < threshold
 * - Confirmed deeds: always claimed
 * - Batch mode: waits batchDelayMs to group multiple deeds into one tx
 */
import * as bitcoin from 'bitcoinjs-lib';
import { BitcoinRPC } from './BitcoinRPC';
import { DeedWatcher, IncomingDeed } from './DeedWatcher';
/** Wallet configuration for auto-claiming */
export interface WalletConfig {
    /** Recipient's private key (for signing claim transactions) */
    privateKey: Buffer;
    /** Recipient's 32-byte x-only public key */
    publicKey: Buffer;
    /** Bitcoin network */
    network: bitcoin.Network;
}
/** AutoClaimer configuration */
export interface AutoClaimerConfig {
    /** Trust 0-conf deeds and claim immediately */
    zeroConfTrust: boolean;
    /** Maximum value (sats) to trust for 0-conf claims (default: 100000) */
    zeroConfMaxSats: number;
    /** Wait time (ms) to batch multiple deeds before claiming (default: 30000) */
    batchDelayMs: number;
    /** Destination address for claimed assets */
    destinationAddress: string;
}
/** Result of a claim operation */
export interface ClaimResult {
    txid: string;
    deedsCount: number;
    totalValue: number;
}
/**
 * AutoClaimer automatically claims incoming deed-locked UTXOs.
 * Supports both immediate single claims and batched multi-deed claims.
 */
export declare class AutoClaimer {
    private wallet;
    private rpc;
    private watcher;
    private batchQueue;
    private batchTimer;
    private running;
    private claimHistory;
    config: AutoClaimerConfig;
    constructor(wallet: WalletConfig, rpcClient: BitcoinRPC, watcher: DeedWatcher);
    /** Start auto-claiming — listens to DeedWatcher events. */
    start(): void;
    /** Stop auto-claiming. */
    stop(): void;
    /** Get claim history. */
    getClaimHistory(): ClaimResult[];
    /**
     * Handles a 0-conf deed detection.
     * Claims immediately if zeroConfTrust is enabled and value is below threshold.
     */
    private onDeedDetected;
    /**
     * Handles a confirmed deed.
     * Always queues for claiming.
     */
    private onDeedConfirmed;
    /**
     * Adds a deed to the batch queue and starts/resets the batch timer.
     */
    private addToBatch;
    /**
     * Flushes the batch queue — claims all queued deeds.
     */
    private flushBatch;
    /**
     * Claims a single deed-locked UTXO.
     *
     * @param deed - The incoming deed to claim
     * @returns Claim transaction ID
     */
    claimDeed(deed: IncomingDeed): Promise<string>;
    /**
     * Batch-claims multiple deed-locked UTXOs in a single transaction.
     * Saves on-chain fees by combining inputs.
     *
     * @param deeds - Array of incoming deeds to claim
     * @returns Claim transaction ID
     */
    batchClaimDeeds(deeds: IncomingDeed[]): Promise<string>;
}
//# sourceMappingURL=AutoClaimer.d.ts.map
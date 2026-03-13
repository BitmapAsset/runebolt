/**
 * LDPClient — High-level orchestration for Lightning Deed Protocol transfers.
 *
 * Coordinates the full deed-transfer flow:
 *   1. Sender deed-locks their Rune/Bitmap UTXO
 *   2. Sender pays Lightning invoice (preimage revealed atomically)
 *   3. Receiver extracts preimage, builds + broadcasts claim transaction
 *
 * Emits events: "deed_locked", "lightning_paid", "preimage_received", "claim_ready", "claimed"
 */
import { EventEmitter } from 'events';
import { DeedLockUTXO, DeedLockResult } from './DeedLock';
import { DeedLockOutputInfo } from './DeedClaim';
import { LDPInvoice } from './LDPInvoice';
import * as bitcoin from 'bitcoinjs-lib';
/** Lightning client interface — implemented by the caller */
export interface LightningClient {
    /** Pay a Lightning invoice, returns the preimage on success */
    payInvoice(paymentRequest: string, amountSats: number): Promise<Buffer>;
    /** Create a hold invoice (payment held until preimage revealed) */
    createHoldInvoice(paymentHash: Buffer, amountSats: number, memo: string): Promise<string>;
    /** Subscribe to invoice settlement — calls handler when preimage is revealed */
    onInvoiceSettled(paymentHash: Buffer, handler: (preimage: Buffer) => void): void;
}
/** Wallet interface for UTXO management and broadcasting */
export interface SenderWallet {
    /** Sign and broadcast a PSBT */
    signAndBroadcast(psbt: bitcoin.Psbt): Promise<string>;
    /** Get the UTXO for a specific Rune */
    getRuneUTXO(runeId: string, amount: bigint): Promise<DeedLockUTXO>;
    /** Get the current network */
    network: bitcoin.Network;
}
/** Wallet interface for the receiving side */
export interface RecipientWallet {
    /** Get recipient's x-only public key */
    getPublicKey(): Buffer;
    /** Get recipient's private key (for signing claim tx) */
    getPrivateKey(): Buffer;
    /** Get a fresh destination address */
    getAddress(): string;
    /** Sign and broadcast a PSBT */
    signAndBroadcast(psbt: bitcoin.Psbt): Promise<string>;
    /** Get the current network */
    network: bitcoin.Network;
}
/** Transfer state */
export type TransferState = 'pending' | 'deed_locked' | 'lightning_paid' | 'preimage_received' | 'claim_ready' | 'claimed' | 'failed' | 'expired';
/** Active transfer tracking */
export interface TransferSession {
    id: string;
    invoice: LDPInvoice;
    state: TransferState;
    deedLockTxid?: string;
    deedLockResult?: DeedLockResult & {
        preimage: Buffer;
    };
    preimage?: Buffer;
    claimTxid?: string;
    error?: string;
    createdAt: number;
}
/**
 * LDP Client — orchestrates sender and receiver sides of the protocol.
 */
export declare class LDPClient extends EventEmitter {
    private sessions;
    /**
     * Initiates a transfer as the SENDER.
     *
     * Flow:
     *   1. Look up the Rune UTXO to deed-lock
     *   2. Create deed-lock (Tapscript with hash-lock)
     *   3. Sign and broadcast deed-lock transaction
     *   4. Pay the Lightning invoice (which reveals preimage to receiver)
     *   5. Monitor for receiver's claim
     *
     * @param invoice - LDP Invoice from the receiver
     * @param senderWallet - Wallet with the Rune UTXO
     * @param lightningClient - Lightning node client
     * @param timeoutBlocks - CSV timelock for recovery (default: 144 = ~1 day)
     */
    initiateTransfer(invoice: LDPInvoice, senderWallet: SenderWallet, lightningClient: LightningClient, timeoutBlocks?: number): Promise<TransferSession>;
    /**
     * Receives a transfer as the RECEIVER.
     *
     * Flow:
     *   1. Wait for Lightning payment (hold invoice settles)
     *   2. Extract preimage from settled payment
     *   3. Build claim transaction using preimage + recipient signature
     *   4. Broadcast claim transaction
     *
     * @param invoice - LDP Invoice that was created
     * @param lightningClient - Lightning node client
     * @param recipientWallet - Wallet to receive the asset
     * @param deedLockInfo - Info about the deed-locked UTXO (from sender)
     */
    receiveTransfer(invoice: LDPInvoice, lightningClient: LightningClient, recipientWallet: RecipientWallet, deedLockInfo: DeedLockOutputInfo): Promise<TransferSession>;
    /** Get a transfer session by ID */
    getSession(sessionId: string): TransferSession | undefined;
    /** List all active sessions */
    listSessions(): TransferSession[];
}
//# sourceMappingURL=LDPClient.d.ts.map
/**
 * DeedNotifier — Delivers the preimage P to the recipient.
 *
 * Primary: OP_RETURN on Bitcoin (no Lightning required).
 * Secondary: Lightning payment (if receiver has a Lightning node).
 *
 * The notification tx contains a dust output to the recipient (so they see
 * an incoming tx in their wallet) plus an OP_RETURN with the preimage.
 */
import * as bitcoin from 'bitcoinjs-lib';
import { BitcoinRPC } from './BitcoinRPC';
/** Decoded notification data extracted from OP_RETURN */
export interface DecodedNotification {
    /** 32-byte preimage P */
    preimage: Buffer;
    /** 32-byte payment hash H = SHA256(P) */
    paymentHash: Buffer;
    /** Deed-lock txid (16 bytes truncated, hex-encoded) */
    deedLockTxid: string;
}
/** UTXO used to fund the notification transaction */
export interface FundingUTXO {
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: Buffer;
}
/**
 * Encodes notification data as OP_RETURN payload.
 *
 * Format (80 bytes max):
 *   [RUNEBOLT (8)] [preimage (32)] [paymentHash (32)] [deedLockTxid (8 bytes truncated)]
 *   Total: 8 + 32 + 32 + 8 = 80 bytes
 *
 * @param preimage - 32-byte preimage P
 * @param paymentHash - 32-byte hash H = SHA256(P)
 * @param deedLockTxid - Deed-lock transaction ID (hex string, truncated to 8 bytes)
 */
export declare function encodeNotification(preimage: Buffer, paymentHash: Buffer, deedLockTxid: string): Buffer;
/**
 * Decodes notification data from an OP_RETURN payload.
 *
 * @param opReturnData - Raw OP_RETURN data bytes
 * @returns Decoded notification or null if not a RuneBolt notification
 */
export declare function decodeNotification(opReturnData: Buffer): DecodedNotification | null;
/**
 * Creates a notification transaction with dust output + OP_RETURN.
 *
 * The tx sends a dust output (546 sats) to the recipient so they detect
 * an incoming transaction, plus an OP_RETURN carrying the preimage P.
 *
 * @param recipientAddress - Recipient's Bitcoin address (any type)
 * @param preimage - 32-byte preimage P
 * @param deedLockTxid - The deed-lock transaction ID
 * @param fundingUtxo - UTXO to fund the notification tx
 * @param changeAddress - Address for change output
 * @param feeRate - Fee rate in sat/vB
 * @param network - Bitcoin network
 * @returns Unsigned PSBT for the notification transaction
 */
export declare function createNotificationTx(recipientAddress: string, preimage: Buffer, deedLockTxid: string, fundingUtxo: FundingUTXO, changeAddress: string, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
/**
 * Broadcasts a signed notification transaction.
 *
 * @param signedTxHex - Signed transaction hex
 * @param rpc - BitcoinRPC client
 * @returns Transaction ID
 */
export declare function broadcastNotification(signedTxHex: string, rpc: BitcoinRPC): Promise<string>;
/**
 * Delivers preimage via Lightning payment (secondary method).
 *
 * If the receiver has a Lightning node, pay their invoice to reveal the preimage.
 * The preimage is embedded in the Lightning HTLC settlement.
 *
 * @param lightningClient - Lightning client with payInvoice capability
 * @param invoice - BOLT11 invoice to pay
 * @param preimage - Expected preimage (for verification after payment)
 * @returns The revealed preimage from the Lightning payment
 */
export declare function deliverViaLightning(lightningClient: {
    payInvoice(paymentRequest: string, amountSats: number): Promise<Buffer>;
}, invoice: string, preimage: Buffer): Promise<Buffer>;
//# sourceMappingURL=DeedNotifier.d.ts.map
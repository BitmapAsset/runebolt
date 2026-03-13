/**
 * DeedClaim — Builds and validates claim transactions for deed-locked UTXOs.
 *
 * After receiving the Lightning payment preimage, the recipient uses it to
 * spend the deed-locked UTXO via the Tapscript claim path.
 */
import * as bitcoin from 'bitcoinjs-lib';
/** Extended UTXO info for a deed-locked output */
export interface DeedLockOutputInfo {
    txid: string;
    vout: number;
    value: number;
    /** The P2TR output script of the deed-locked UTXO */
    scriptPubKey: Buffer;
    /** SHA256 payment hash embedded in the claim script */
    paymentHash: Buffer;
    /** x-only pubkey of the recipient (who can claim) */
    recipientPubkey: Buffer;
    /** x-only pubkey of the original owner (for recovery path) */
    ownerPubkey: Buffer;
    /** CSV timelock blocks */
    timeoutBlocks: number;
    /** Rune ID if this is a Rune deed */
    runeId?: string;
    /** Rune amount */
    runeAmount?: bigint;
}
/**
 * Validates that a preimage matches the payment hash in a deed-lock script.
 *
 * @returns true if SHA256(preimage) === paymentHash
 */
export declare function validateClaim(deedInfo: DeedLockOutputInfo, preimage: Buffer): boolean;
/**
 * Creates and signs a claim transaction for a deed-locked UTXO.
 *
 * The witness includes the preimage (to satisfy the hash-lock) and the
 * recipient's signature (to satisfy OP_CHECKSIG), spent via Tapscript path.
 *
 * @param deedInfo - The deed-locked UTXO details
 * @param preimage - The 32-byte Lightning payment preimage
 * @param recipientPrivkey - Recipient's private key (for signing)
 * @param destinationAddress - Where to send the claimed asset
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
export declare function createClaimTransaction(deedInfo: DeedLockOutputInfo, preimage: Buffer, recipientPrivkey: Buffer, destinationAddress: string, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
/**
 * Batch-claims multiple deed-locked UTXOs into a single transaction.
 * Saves on fees by combining inputs.
 *
 * @param deedInfos - Array of deed-locked UTXO details
 * @param preimages - Corresponding preimages (one per deed)
 * @param recipientPrivkey - Recipient's private key
 * @param destinationAddress - Where to send all claimed assets
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
export declare function batchClaim(deedInfos: DeedLockOutputInfo[], preimages: Buffer[], recipientPrivkey: Buffer, destinationAddress: string, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
//# sourceMappingURL=DeedClaim.d.ts.map
/**
 * BitmapDeed — Deed-lock and claim for Bitmap inscriptions (Ordinals UTXOs).
 *
 * Bitmap inscriptions are just UTXOs containing ordinal sats. The same Tapscript
 * hash-lock mechanism works: we add a claim path gated by the Lightning preimage
 * and a recovery path with a CSV timelock.
 */
import * as bitcoin from 'bitcoinjs-lib';
import { DeedLockResult, DeedLockUTXO } from './DeedLock';
import { DeedLockOutputInfo } from './DeedClaim';
/** Bitmap-specific UTXO with inscription metadata */
export interface BitmapUTXO extends DeedLockUTXO {
    /** The Bitmap block height (e.g. 840000 for bitmap 840000.bitmap) */
    blockHeight: number;
    /** Inscription ID (txid:index format) */
    inscriptionId?: string;
}
/** Result of creating a bitmap deed */
export interface BitmapDeedResult extends DeedLockResult {
    /** The Bitmap block height */
    blockHeight: number;
    /** The preimage for Lightning payment binding */
    preimage: Buffer;
}
/**
 * Creates a deed-lock for a Bitmap inscription UTXO.
 *
 * @param inscriptionUtxo - The UTXO containing the Bitmap inscription
 * @param recipientPubkey - 32-byte x-only pubkey of the recipient
 * @param timeoutBlocks - CSV timelock for owner recovery
 * @param preimage - Optional preimage; if omitted, one is generated
 * @param network - Bitcoin network
 */
export declare function createBitmapDeed(inscriptionUtxo: BitmapUTXO, recipientPubkey: Buffer, timeoutBlocks: number, preimage?: Buffer, network?: bitcoin.Network): BitmapDeedResult;
/**
 * Creates the deed-lock transaction for a Bitmap inscription.
 *
 * Important: Bitmap UTXOs must preserve ordinal position. The inscription sat
 * must remain at the first output position to avoid accidental burns.
 *
 * @param inscriptionUtxo - Source UTXO with the Bitmap
 * @param deedResult - Result from createBitmapDeed
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
export declare function createBitmapDeedTransaction(inscriptionUtxo: BitmapUTXO, deedResult: BitmapDeedResult, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
/**
 * Claims a deed-locked Bitmap inscription using the Lightning preimage.
 *
 * @param deedUtxo - The deed-locked UTXO info
 * @param preimage - 32-byte Lightning payment preimage
 * @param recipientPrivkey - Recipient's private key
 * @param destinationAddress - Where to send the Bitmap inscription
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
export declare function claimBitmapDeed(deedUtxo: DeedLockOutputInfo & {
    blockHeight: number;
}, preimage: Buffer, recipientPrivkey: Buffer, destinationAddress: string, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
/**
 * Validates that a Bitmap deed can be claimed with the given preimage.
 */
export declare function validateBitmapClaim(deedUtxo: DeedLockOutputInfo, preimage: Buffer): boolean;
//# sourceMappingURL=BitmapDeed.d.ts.map
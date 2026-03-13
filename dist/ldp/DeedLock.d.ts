/**
 * DeedLock — Creates Tapscript hash-lock spending conditions for Rune UTXOs.
 *
 * The deed-lock adds a new Taproot spending path to a Rune UTXO:
 *   Path 1 (claim):    OP_SHA256 <paymentHash> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
 *   Path 2 (recovery): <timeoutBlocks> OP_CHECKSEQUENCEVERIFY OP_DROP <ownerPubkey> OP_CHECKSIG
 *
 * These form a P2TR Taproot tree. The recipient claims by revealing the Lightning
 * payment preimage. The owner can recover after the timeout.
 */
import * as bitcoin from 'bitcoinjs-lib';
import { Taptree } from 'bitcoinjs-lib/src/types';
/** UTXO reference for deed-locking */
export interface DeedLockUTXO {
    txid: string;
    vout: number;
    value: number;
    scriptPubKey: Buffer;
    /** x-only pubkey of the current owner */
    ownerPubkey: Buffer;
    /** Rune ID (block:tx format) */
    runeId?: string;
    /** Rune amount in base units */
    runeAmount?: bigint;
}
/** Result of creating a deed-lock */
export interface DeedLockResult {
    /** The Taproot output script for the deed-locked UTXO */
    outputScript: Buffer;
    /** The P2TR address */
    address: string;
    /** SHA256 hash used in the hash-lock (matches Lightning payment_hash) */
    paymentHash: Buffer;
    /** The claim leaf script */
    claimScript: Buffer;
    /** The recovery leaf script */
    recoveryScript: Buffer;
    /** Taproot tree for witness construction */
    taprootTree: Taptree;
    /** Unsigned PSBT (if transaction was built) */
    psbt?: bitcoin.Psbt;
    /** Internal pubkey used for the Taproot output */
    internalPubkey: Buffer;
}
/**
 * Builds the claim script (hash-lock + recipient signature).
 *
 *   OP_SHA256 <paymentHash> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
 */
export declare function buildClaimScript(paymentHash: Buffer, recipientPubkey: Buffer): Buffer;
/**
 * Builds the recovery script (timelock + owner signature).
 *
 *   <timeoutBlocks> OP_CHECKSEQUENCEVERIFY OP_DROP <ownerPubkey> OP_CHECKSIG
 */
export declare function buildRecoveryScript(ownerPubkey: Buffer, timeoutBlocks: number): Buffer;
/**
 * Builds the full deed-lock Taproot script tree.
 *
 * @returns Both leaf scripts and the Taptree structure.
 */
export declare function buildDeedLockScript(paymentHash: Buffer, recipientPubkey: Buffer, ownerPubkey: Buffer, timeoutBlocks: number): {
    claimScript: Buffer;
    recoveryScript: Buffer;
    taprootTree: Taptree;
};
/**
 * Creates a deed-lock for a Rune UTXO.
 *
 * Generates a fresh payment hash (for Lightning HTLC binding), constructs the
 * Tapscript tree, and returns everything needed to build the locking transaction.
 *
 * @param utxo - The Rune UTXO to deed-lock
 * @param recipientPubkey - 32-byte x-only pubkey of the recipient
 * @param timeoutBlocks - Blocks before owner can recover (CSV timelock)
 * @param preimage - Optional preimage; if omitted, one is generated
 * @param network - Bitcoin network (default: mainnet)
 */
export declare function createDeedLock(utxo: DeedLockUTXO, recipientPubkey: Buffer, timeoutBlocks: number, preimage?: Buffer, network?: bitcoin.Network): DeedLockResult & {
    preimage: Buffer;
};
/**
 * Creates an unsigned PSBT that sends the Rune UTXO to the deed-lock address.
 *
 * The PSBT moves the UTXO to the new P2TR output with the hash-lock tree.
 * Caller must sign with the owner's key.
 *
 * @param utxo - Source UTXO containing the Rune
 * @param deedLock - Result from createDeedLock
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
export declare function createDeedLockTransaction(utxo: DeedLockUTXO, deedLock: DeedLockResult, feeRate?: number, network?: bitcoin.Network): bitcoin.Psbt;
//# sourceMappingURL=DeedLock.d.ts.map
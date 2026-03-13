/**
 * LDPInvoice — Lightning Deed Protocol invoice encoding/decoding.
 *
 * An LDP Invoice is like a Lightning invoice but for Runes. It encodes all the
 * information needed for a sender to deed-lock their Rune UTXO and the recipient
 * to claim it after Lightning payment.
 *
 * Format: bech32-encoded with "ldp" human-readable part.
 */
/** LDP Invoice data structure */
export interface LDPInvoice {
    /** Protocol version */
    version: number;
    /** Rune ID (block:tx format, e.g. "840000:1") */
    runeId: string;
    /** Amount of Rune in base units */
    runeAmount: bigint;
    /** Lightning payment amount in satoshis */
    lightningAmountSats: number;
    /** SHA256 payment hash (binds Lightning HTLC to deed-lock) */
    paymentHash: Buffer;
    /** Recipient's x-only public key (32 bytes) */
    recipientPubkey: Buffer;
    /** Invoice expiry in seconds from creation */
    expiry: number;
    /** Optional: sender's UTXO (txid:vout) for the deed-lock source */
    senderUTXO?: string;
    /** Creation timestamp (unix seconds) */
    timestamp: number;
}
/**
 * Creates a new LDP Invoice for a Rune transfer.
 *
 * @param runeId - Rune ID (e.g. "840000:1")
 * @param runeAmount - Amount of Rune to transfer
 * @param recipientPubkey - Recipient's 32-byte x-only pubkey
 * @param lightningAmountSats - Lightning payment amount in sats
 * @param expiry - Invoice expiry in seconds (default: 3600 = 1 hour)
 * @param senderUTXO - Optional sender UTXO reference
 */
export declare function createLDPInvoice(runeId: string, runeAmount: bigint, recipientPubkey: Buffer, lightningAmountSats: number, expiry?: number, senderUTXO?: string): LDPInvoice & {
    preimage: Buffer;
};
/**
 * Encodes an LDP Invoice as a bech32 string with "ldp" prefix.
 */
export declare function encodeLDPInvoice(invoice: LDPInvoice): string;
/**
 * Decodes a bech32-encoded LDP Invoice string.
 */
export declare function decodeLDPInvoice(encoded: string): LDPInvoice;
//# sourceMappingURL=LDPInvoice.d.ts.map
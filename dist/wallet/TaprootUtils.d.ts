/**
 * TaprootUtils — Utilities for Taproot address handling and pubkey extraction.
 *
 * Converts between bc1p Bech32m addresses and 32-byte x-only public keys.
 */
import * as bitcoin from 'bitcoinjs-lib';
/**
 * Extracts the 32-byte x-only internal pubkey from a Taproot (bc1p) address.
 *
 * @param taprootAddress - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
export declare function extractInternalKey(taprootAddress: string): Buffer;
/**
 * Alias for extractInternalKey — converts bc1p address to x-only pubkey bytes.
 *
 * @param address - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
export declare function taprootAddressToXOnlyPubkey(address: string): Buffer;
/**
 * Validates that a string is a valid Taproot (bc1p) Bech32m address.
 *
 * @param address - Address string to validate
 * @returns true if valid bc1p address
 */
export declare function isValidTaprootAddress(address: string): boolean;
/**
 * Converts a 32-byte x-only public key to a Taproot (bc1p) address.
 *
 * @param xOnlyPubkey - 32-byte x-only public key
 * @param network - Bitcoin network (default: mainnet)
 * @returns bc1p... Bech32m address string
 */
export declare function pubkeyToTaprootAddress(xOnlyPubkey: Buffer, network?: bitcoin.Network): string;
//# sourceMappingURL=TaprootUtils.d.ts.map
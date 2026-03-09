/**
 * TaprootUtils — Utilities for Taproot address handling and pubkey extraction.
 *
 * Converts between bc1p Bech32m addresses and 32-byte x-only public keys.
 */

import * as bitcoin from 'bitcoinjs-lib';
import { bech32m } from 'bech32';

/**
 * Extracts the 32-byte x-only internal pubkey from a Taproot (bc1p) address.
 *
 * @param taprootAddress - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
export function extractInternalKey(taprootAddress: string): Buffer {
  if (!isValidTaprootAddress(taprootAddress)) {
    throw new Error(`Invalid Taproot address: ${taprootAddress}`);
  }
  const decoded = bech32m.decode(taprootAddress);
  // Remove witness version byte (first element) and convert from 5-bit to 8-bit
  const data = bech32m.fromWords(decoded.words.slice(1));
  return Buffer.from(data);
}

/**
 * Alias for extractInternalKey — converts bc1p address to x-only pubkey bytes.
 *
 * @param address - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
export function taprootAddressToXOnlyPubkey(address: string): Buffer {
  return extractInternalKey(address);
}

/**
 * Validates that a string is a valid Taproot (bc1p) Bech32m address.
 *
 * @param address - Address string to validate
 * @returns true if valid bc1p address
 */
export function isValidTaprootAddress(address: string): boolean {
  try {
    if (!address.startsWith('bc1p') && !address.startsWith('tb1p') && !address.startsWith('bcrt1p')) {
      return false;
    }
    const decoded = bech32m.decode(address);
    // Witness version must be 1 for Taproot
    if (decoded.words[0] !== 1) return false;
    const data = bech32m.fromWords(decoded.words.slice(1));
    // x-only pubkey must be exactly 32 bytes
    return data.length === 32;
  } catch {
    return false;
  }
}

/**
 * Converts a 32-byte x-only public key to a Taproot (bc1p) address.
 *
 * @param xOnlyPubkey - 32-byte x-only public key
 * @param network - Bitcoin network (default: mainnet)
 * @returns bc1p... Bech32m address string
 */
export function pubkeyToTaprootAddress(
  xOnlyPubkey: Buffer,
  network: bitcoin.Network = bitcoin.networks.bitcoin
): string {
  if (xOnlyPubkey.length !== 32) {
    throw new Error('x-only pubkey must be exactly 32 bytes');
  }

  let hrp: string;
  if (network === bitcoin.networks.bitcoin) {
    hrp = 'bc';
  } else if (network === bitcoin.networks.testnet) {
    hrp = 'tb';
  } else {
    hrp = 'bcrt';
  }

  const words = bech32m.toWords(xOnlyPubkey);
  // Prepend witness version 1
  words.unshift(1);
  return bech32m.encode(hrp, words);
}

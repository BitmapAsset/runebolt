/**
 * Constants and utilities for Rune assets on Bitcoin.
 */

/**
 * Supported asset types for RuneBolt channels.
 *
 * - DOG: DOG•GO•TO•THE•MOON rune, transferred via Runestones
 * - BTC: Native Bitcoin (no Runestone needed)
 *
 * Note: BRC-20 tokens and Bitmap use inscription-based transfers (not Runestones)
 * and require a fundamentally different transfer mechanism. They are NOT supported
 * via the Runestone path.
 */
export enum SupportedAsset {
  DOG = 'DOG',
  BTC = 'BTC',
}

/** The Rune ID for DOG•GO•TO•THE•MOON (etched in block 840000, tx 3) */
export const DOG_RUNE_ID = '840000:3';

/** DOG rune block component */
export const DOG_RUNE_BLOCK = 840000;

/** DOG rune tx component */
export const DOG_RUNE_TX = 3;

/** Human-readable name with bullet separators */
export const DOG_RUNE_NAME = 'DOG\u2022GO\u2022TO\u2022THE\u2022MOON';

/** Number of decimal places for DOG amounts */
export const DOG_DECIMALS = 5;

/** The multiplier for converting display amounts to raw amounts */
const DOG_MULTIPLIER = BigInt(10 ** DOG_DECIMALS); // 100000

/**
 * Convert a raw (on-chain) DOG amount to a human-readable display string.
 * e.g., 1234500000n -> "12345.00000"
 */
export function formatDogAmount(raw: bigint): string {
  const whole = raw / DOG_MULTIPLIER;
  const frac = raw % DOG_MULTIPLIER;
  const fracStr = frac.toString().padStart(DOG_DECIMALS, '0');
  return `${whole}.${fracStr}`;
}

/**
 * Parse a human-readable DOG amount string to a raw bigint.
 * e.g., "12345.5" -> 1234550000n
 */
export function parseDogAmount(display: string): bigint {
  const parts = display.split('.');
  const whole = BigInt(parts[0] || '0');

  let fracStr = parts[1] || '0';
  if (fracStr.length > DOG_DECIMALS) {
    fracStr = fracStr.slice(0, DOG_DECIMALS);
  } else {
    fracStr = fracStr.padEnd(DOG_DECIMALS, '0');
  }

  return whole * DOG_MULTIPLIER + BigInt(fracStr);
}

/** Minimum channel capacity in raw DOG units (1 DOG) */
export const MIN_CHANNEL_CAPACITY = DOG_MULTIPLIER;

/** Maximum channel capacity in raw DOG units (1 billion DOG) */
export const MAX_CHANNEL_CAPACITY = BigInt(1_000_000_000) * DOG_MULTIPLIER;

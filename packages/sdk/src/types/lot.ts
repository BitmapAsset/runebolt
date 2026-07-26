import { ImplementationErrorCode } from '../errors.js'
import { parseLocation } from './location.js'
import { fail, requireRecord, requireString, requireUint } from './validate.js'

export const ASSET_CLASSES = ['inscription', 'bitmap', 'rune', 'brc20'] as const
export type AssetClass = (typeof ASSET_CLASSES)[number]

/**
 * SPEC §3. A lot is a UTXO and a price. There is deliberately no `amount` field: the amount is an
 * indexer opinion (§8.3) and is re-validated at buy time (I-16).
 */
export interface Lot {
  readonly location: string
  readonly priceSats: number
}

export function parseLot(value: unknown, path = 'lot'): Lot {
  const record = requireRecord(value, ImplementationErrorCode.E_MALFORMED_ENVELOPE, path)
  if ('amount' in record) {
    fail(ImplementationErrorCode.E_MALFORMED_ENVELOPE, `${path}.amount is not part of the lot model (SPEC §3)`, {
      path,
    })
  }
  const location = requireString(
    record['location'],
    ImplementationErrorCode.E_MALFORMED_ENVELOPE,
    `${path}.location`,
  )
  parseLocation(location)
  const priceSats = requireUint(
    record['priceSats'],
    ImplementationErrorCode.E_MALFORMED_ENVELOPE,
    `${path}.priceSats`,
  )
  if (priceSats === 0) {
    fail(ImplementationErrorCode.E_MALFORMED_ENVELOPE, `${path}.priceSats must be > 0`, { path })
  }
  return { location, priceSats }
}

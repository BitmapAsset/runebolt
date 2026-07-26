import { ImplementationErrorCode } from '../errors.js'
import { fail } from './validate.js'

/**
 * A lot location is `txid:vout` (SPEC §3). An ordinal satpoint carries a third field, the sat
 * offset within that output (SPEC §6.1); the offset is load-bearing for I-5, so it is parsed
 * rather than discarded.
 */
export interface Location {
  readonly txid: string
  readonly vout: number
  readonly offset?: number
}

const TXID = /^[0-9a-f]{64}$/

export function parseLocation(raw: string): Location {
  const parts = raw.split(':')
  if (parts.length < 2 || parts.length > 3) {
    fail(ImplementationErrorCode.E_MALFORMED_LOCATION, 'expected txid:vout[:offset]', { raw })
  }
  const [txid, voutRaw, offsetRaw] = parts as [string, string, string | undefined]
  if (!TXID.test(txid)) {
    fail(ImplementationErrorCode.E_MALFORMED_LOCATION, 'txid must be 64 lowercase hex chars', { raw })
  }
  const vout = Number(voutRaw)
  if (!/^\d+$/.test(voutRaw) || !Number.isSafeInteger(vout)) {
    fail(ImplementationErrorCode.E_MALFORMED_LOCATION, 'vout must be a non-negative integer', { raw })
  }
  if (offsetRaw === undefined) return { txid, vout }
  const offset = Number(offsetRaw)
  if (!/^\d+$/.test(offsetRaw) || !Number.isSafeInteger(offset)) {
    fail(ImplementationErrorCode.E_MALFORMED_LOCATION, 'offset must be a non-negative integer', { raw })
  }
  return { txid, vout, offset }
}

export function formatLocation(location: Location): string {
  return location.offset === undefined
    ? `${location.txid}:${location.vout}`
    : `${location.txid}:${location.vout}:${location.offset}`
}

/** Outpoint identity, ignoring any sat offset. */
export function sameOutpoint(a: Location, b: Location): boolean {
  return a.txid === b.txid && a.vout === b.vout
}

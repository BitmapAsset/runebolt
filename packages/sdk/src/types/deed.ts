import { ImplementationErrorCode } from '../errors.js'
import { parseAttributedContents, type AttributedContents } from './attribution.js'
import { parseLocation } from './location.js'
import {
  fail,
  optional,
  requireEnum,
  requireHex,
  requireRecord,
  requireRfc3339,
  requireString,
} from './validate.js'

/**
 * SPEC §8.2. A deed proves key control of a UTXO at a point in time and nothing else.
 * Attributed fields sit outside `signed` because the signer cannot vouch for an indexer opinion.
 */

export const DEED_TYPES = ['listing', 'cancel', 'attestation'] as const
export type DeedType = (typeof DEED_TYPES)[number]

export interface DeedPayload {
  readonly v: 1
  readonly type: DeedType
  readonly location: string
  readonly address: string
  readonly issuedAt: string
  readonly nonce: string
}

export interface Deed {
  readonly signed: DeedPayload
  readonly signature: string
  readonly attributed?: AttributedContents
}

const CODE = ImplementationErrorCode.E_MALFORMED_DEED

export function parseDeed(value: unknown, path = 'deed'): Deed {
  const record = requireRecord(value, CODE, path)
  const signed = requireRecord(record['signed'], CODE, `${path}.signed`)

  if (signed['v'] !== 1) fail(CODE, `${path}.signed.v must be 1`, { path, received: signed['v'] })

  const location = requireString(signed['location'], CODE, `${path}.signed.location`)
  parseLocation(location)

  const payload: DeedPayload = {
    v: 1,
    type: requireEnum(signed['type'], DEED_TYPES, CODE, `${path}.signed.type`),
    location,
    address: requireString(signed['address'], CODE, `${path}.signed.address`),
    issuedAt: requireRfc3339(signed['issuedAt'], CODE, `${path}.signed.issuedAt`),
    nonce: requireHex(signed['nonce'], CODE, `${path}.signed.nonce`),
  }

  const attributed = optional(record['attributed'], (raw) =>
    parseAttributedContents(raw, `${path}.attributed`),
  )

  return {
    signed: payload,
    signature: requireString(record['signature'], CODE, `${path}.signature`),
    ...(attributed === undefined ? {} : { attributed }),
  }
}

export function decodeDeed(json: string): Deed {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    fail(CODE, 'deed is not valid JSON', { cause: String(error) })
  }
  return parseDeed(parsed)
}

export function encodeDeed(deed: Deed): string {
  return JSON.stringify({
    signed: deedPayloadWire(deed.signed),
    signature: deed.signature,
    ...(deed.attributed === undefined ? {} : { attributed: deed.attributed }),
  })
}

/**
 * The exact bytes a BIP-322 signature covers. Fixed key order: two implementations that order
 * keys differently would produce signatures that do not verify against each other.
 */
export function encodeDeedPayload(payload: DeedPayload): string {
  return JSON.stringify(deedPayloadWire(payload))
}

function deedPayloadWire(payload: DeedPayload): Record<string, unknown> {
  return {
    v: payload.v,
    type: payload.type,
    location: payload.location,
    address: payload.address,
    issuedAt: payload.issuedAt,
    nonce: payload.nonce,
  }
}

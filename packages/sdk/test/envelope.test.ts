import { describe, expect, it } from 'vitest'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../src/errors.js'
import {
  decodeListingEnvelope,
  encodeListingEnvelope,
  isExpired,
  parseListingEnvelope,
} from '../src/types/envelope.js'
import { decodeDeed, encodeDeed, encodeDeedPayload, parseDeed } from '../src/types/deed.js'
import { formatLocation, parseLocation } from '../src/types/location.js'
import type { ListingEnvelope } from '../src/types/envelope.js'

function codeOf(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    if (error instanceof RuneBoltError) return error.code
    throw error
  }
  throw new Error('expected a RuneBoltError')
}

const envelope: ListingEnvelope = {
  v: 1,
  assetClass: 'inscription',
  sighashMode: 'SINGLE_ACAP',
  lot: { location: `${'a'.repeat(64)}:0`, priceSats: 250_000 },
  psbt: 'cHNidP8BAA==',
  maker: {
    address: 'bcrt1qmakeraddress',
    publicKey: '02'.repeat(17),
    receiveAddress: 'bcrt1qpayoutaddress',
  },
  expiresAt: '2030-01-01T00:00:00Z',
  attribution: {
    indexer: 'ord',
    indexerVersion: '0.27.1',
    blockHeight: 959_697,
    observedAt: '2026-07-26T00:00:00Z',
    contents: {
      inscriptions: ['617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0'],
      runes: [],
      brc20: [],
    },
  },
}

describe('listing envelope (W1)', () => {
  it('round-trips encode → decode → encode byte-for-byte', () => {
    const once = encodeListingEnvelope(envelope)
    const decoded = decodeListingEnvelope(once)
    expect(encodeListingEnvelope(decoded)).toBe(once)
    expect(decoded).toEqual(envelope)
  })

  it('round-trips a bitmap envelope with its scope disclosure', () => {
    const bitmap: ListingEnvelope = {
      ...envelope,
      assetClass: 'bitmap',
      disclosure: {
        districtInscriptionId: 'd'.repeat(64) + 'i0',
        parcelsIncluded: false,
        parcelCountAtListing: 12,
        contentLibraryIncluded: false,
        note: 'Sale transfers the district inscription only.',
      },
    }
    const decoded = decodeListingEnvelope(encodeListingEnvelope(bitmap))
    expect(decoded.disclosure?.parcelsIncluded).toBe(false)
    expect(decoded).toEqual(bitmap)
  })

  it('rejects an unknown sighashMode instead of assuming SINGLE_ACAP (I-17)', () => {
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    wire['sighashMode'] = 'ALL_COORDINATED'
    expect(codeOf(() => parseListingEnvelope(wire))).toBe(
      ProtocolErrorCode.E_UNKNOWN_SIGHASH_MODE,
    )
  })

  it('rejects a missing sighashMode', () => {
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    delete wire['sighashMode']
    expect(codeOf(() => parseListingEnvelope(wire))).toBe(
      ProtocolErrorCode.E_UNKNOWN_SIGHASH_MODE,
    )
  })

  it('rejects an amount field on the lot (SPEC §3 has no amount)', () => {
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    ;(wire['lot'] as Record<string, unknown>)['amount'] = '10000'
    expect(codeOf(() => parseListingEnvelope(wire))).toBe(
      ImplementationErrorCode.E_MALFORMED_ENVELOPE,
    )
  })

  it('requires a scope disclosure on bitmap listings (SPEC §8.4)', () => {
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    wire['assetClass'] = 'bitmap'
    expect(codeOf(() => parseListingEnvelope(wire))).toBe(
      ImplementationErrorCode.E_MALFORMED_ENVELOPE,
    )
  })

  it('keeps rune amounts as strings so u128 values survive the round trip', () => {
    const huge = '340282366920938463463374607431768211455'
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    const attribution = wire['attribution'] as Record<string, unknown>
    const contents = attribution['contents'] as Record<string, unknown>
    contents['inscriptions'] = []
    contents['runes'] = [{ runeId: '840000:3', runeName: 'X', amount: huge }]
    const parsed = parseListingEnvelope(wire)
    expect(parsed.attribution.contents.runes[0]?.amount).toBe(huge)
  })

  it('rejects a rune amount that arrives as a JSON number', () => {
    const wire = JSON.parse(encodeListingEnvelope(envelope)) as Record<string, unknown>
    const attribution = wire['attribution'] as Record<string, unknown>
    const contents = attribution['contents'] as Record<string, unknown>
    contents['runes'] = [{ runeId: '840000:3', runeName: 'X', amount: 10_000 }]
    expect(codeOf(() => parseListingEnvelope(wire))).toBe(
      ImplementationErrorCode.E_MALFORMED_ENVELOPE,
    )
  })

  it('flags expiry (I-18)', () => {
    expect(isExpired(envelope, new Date('2026-07-26T00:00:00Z'))).toBe(false)
    expect(isExpired(envelope, new Date('2031-01-01T00:00:00Z'))).toBe(true)
  })
})

describe('locations', () => {
  it('parses txid:vout and txid:vout:offset', () => {
    const outpoint = `${'a'.repeat(64)}:1`
    expect(parseLocation(outpoint)).toEqual({ txid: 'a'.repeat(64), vout: 1 })
    expect(parseLocation(`${outpoint}:8897948`).offset).toBe(8_897_948)
    expect(formatLocation(parseLocation(`${outpoint}:0`))).toBe(`${outpoint}:0`)
  })

  it.each(['nope', `${'a'.repeat(63)}:1`, `${'a'.repeat(64)}:-1`, `${'A'.repeat(64)}:1`])(
    'rejects %s',
    (raw) => {
      expect(codeOf(() => parseLocation(raw))).toBe(ImplementationErrorCode.E_MALFORMED_LOCATION)
    },
  )
})

describe('deeds (W1)', () => {
  const deed = {
    signed: {
      v: 1 as const,
      type: 'cancel' as const,
      location: `${'a'.repeat(64)}:0`,
      address: 'bcrt1qexampleaddress',
      issuedAt: '2026-07-26T00:00:00Z',
      nonce: 'deadbeef',
    },
    signature: 'AkcwRAIg...',
  }

  it('round-trips', () => {
    expect(decodeDeed(encodeDeed(deed))).toEqual(deed)
  })

  it('signs a fixed key order so signatures verify across implementations', () => {
    const reordered = {
      nonce: deed.signed.nonce,
      issuedAt: deed.signed.issuedAt,
      address: deed.signed.address,
      location: deed.signed.location,
      type: deed.signed.type,
      v: deed.signed.v,
    }
    expect(encodeDeedPayload(parseDeed({ ...deed, signed: reordered }).signed)).toBe(
      encodeDeedPayload(deed.signed),
    )
  })

  it('rejects an unknown deed type', () => {
    expect(codeOf(() => parseDeed({ ...deed, signed: { ...deed.signed, type: 'transfer' } }))).toBe(
      ImplementationErrorCode.E_MALFORMED_DEED,
    )
  })

  it('keeps attributed fields outside the signed payload', () => {
    expect(encodeDeedPayload(deed.signed)).not.toContain('indexer')
  })
})

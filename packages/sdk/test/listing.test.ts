import { describe, expect, it } from 'vitest'
import { ProtocolErrorCode } from '../src/errors.js'
import { encodeDeedPayload } from '../src/types/deed.js'
import { encodeListingEnvelope } from '../src/types/envelope.js'
import {
  decodeListing,
  encodeListing,
  listingDeedPayload,
  listingDigest,
  sealListing,
  verifyListingBinding,
} from '../src/types/listing.js'
import { PRICE_SATS, sealedOffer } from './helpers/build.js'

/**
 * W6. The publishable artifact. The deed must bind *this* envelope, not merely the location it
 * refers to, or the same signature authorises a different price and a different PSBT.
 */

const ISSUED_AT = '2026-07-26T00:00:00Z'
const NONCE = 'f00dcafe'
const SIGNATURE = 'AkcwRAIgBIP322signatureplaceholder='

async function listing(priceSats = PRICE_SATS) {
  const { envelope } = await sealedOffer({ priceSats })
  const payload = listingDeedPayload({ envelope, issuedAt: ISSUED_AT, nonce: NONCE })
  return sealListing({ envelope, payload, signature: SIGNATURE })
}

describe('listing envelope wiring', () => {
  it('round-trips byte-stably', async () => {
    const sealed = await listing()
    const json = encodeListing(sealed)
    expect(encodeListing(decodeListing(json))).toBe(json)
    expect(encodeListing(decodeListing(encodeListing(decodeListing(json))))).toBe(json)
  })

  it('carries the offer PSBT inside the signed digest', async () => {
    const sealed = await listing()
    expect(sealed.deed.signed.digest).toBe(listingDigest(sealed.envelope))
    expect(JSON.parse(encodeListingEnvelope(sealed.envelope))['psbt']).toBe(sealed.envelope.psbt)
  })

  it('signs a payload whose bytes are fixed by encodeDeedPayload', async () => {
    const sealed = await listing()
    const bytes = encodeDeedPayload(sealed.deed.signed)
    expect(bytes).toBe(
      JSON.stringify({
        v: 1,
        type: 'listing',
        location: sealed.envelope.lot.location,
        address: sealed.envelope.maker.address,
        issuedAt: ISSUED_AT,
        nonce: NONCE,
        digest: listingDigest(sealed.envelope),
      }),
    )
  })

  it('digests differ when anything in the envelope differs', async () => {
    const a = await listing(PRICE_SATS)
    const b = await listing(PRICE_SATS + 1)
    expect(listingDigest(a.envelope)).not.toBe(listingDigest(b.envelope))
  })
})

describe('the deed binds the envelope it was signed over', () => {
  it('rejects a deed lifted onto a different envelope for the same lot', async () => {
    const original = await listing(PRICE_SATS)
    const cheaper = await listing(PRICE_SATS - 100_000)
    expect(original.deed.signed.location).toBe(cheaper.deed.signed.location)

    const lifted = { envelope: cheaper.envelope, deed: original.deed }
    const findings = verifyListingBinding(lifted)
    expect(findings.map((finding) => finding.field)).toEqual(['signed.digest'])
    expect(() => decodeListing(encodeListing(lifted))).toThrow(
      new RegExp(ProtocolErrorCode.E_ASSET_MISMATCH),
    )
  })

  it('rejects a swapped PSBT even when price and location are unchanged', async () => {
    const sealed = await listing()
    // Same price, same lot, same maker, same expiry — only the transaction differs. Every field a
    // location-only deed covers is identical, which is exactly the substitution `digest` blocks.
    const other = await sealedOffer({ dummyValueSats: 700 })
    expect(other.envelope.lot).toEqual(sealed.envelope.lot)
    expect(other.envelope.psbt).not.toBe(sealed.envelope.psbt)
    const tampered = {
      envelope: { ...sealed.envelope, psbt: other.envelope.psbt },
      deed: sealed.deed,
    }
    expect(verifyListingBinding(tampered).map((f) => f.field)).toEqual(['signed.digest'])
  })

  it('rejects a cancel deed presented as a listing deed', async () => {
    const sealed = await listing()
    const swappedType = {
      envelope: sealed.envelope,
      deed: { ...sealed.deed, signed: { ...sealed.deed.signed, type: 'cancel' as const } },
    }
    expect(verifyListingBinding(swappedType).map((f) => f.field)).toContain('signed.type')
  })

  it('rejects a deed signed by an address that is not the maker', async () => {
    const sealed = await listing()
    const impostor = {
      envelope: sealed.envelope,
      deed: { ...sealed.deed, signed: { ...sealed.deed.signed, address: 'bcrt1qnotthemaker' } },
    }
    expect(verifyListingBinding(impostor).map((f) => f.field)).toContain('signed.address')
  })

  it('sealListing refuses to assemble an unbound listing', async () => {
    const sealed = await listing()
    const other = await sealedOffer({ priceSats: 999_000 })
    expect(() =>
      sealListing({
        envelope: other.envelope,
        payload: sealed.deed.signed,
        signature: SIGNATURE,
      }),
    ).toThrow(new RegExp(ProtocolErrorCode.E_ASSET_MISMATCH))
  })
})

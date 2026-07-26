import { crypto as bitcoinCrypto } from 'bitcoinjs-lib'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../errors.js'
import { encodeDeed, parseDeed, type Deed, type DeedPayload } from './deed.js'
import {
  encodeListingEnvelope,
  parseListingEnvelope,
  type ListingEnvelope,
} from './envelope.js'
import { fail, requireRecord } from './validate.js'

/**
 * W6 / SPEC §8.1 + §8.2. The publishable artifact: the listing envelope, plus a deed that binds
 * the maker's key to *this* envelope rather than merely to the location.
 *
 * The binding matters. A deed that covers only `location` can be lifted onto a different envelope
 * for the same UTXO — a different price, a different payout address, a different PSBT — and would
 * still verify. `digest` closes that: it covers the canonical envelope bytes, and the envelope
 * contains the offer PSBT, so signing the deed signs the offer.
 *
 * What this module does *not* do is check the BIP-322 signature itself; sign/verify across wallets
 * is W9. `verifyListingBinding()` proves the deed is bound to this envelope and says nothing about
 * whether the signature is valid.
 */

export interface Listing {
  readonly envelope: ListingEnvelope
  readonly deed: Deed
}

const CODE = ImplementationErrorCode.E_MALFORMED_ENVELOPE

/** sha256 over the canonical envelope encoding. Fixed key order makes it reproducible. */
export function listingDigest(envelope: ListingEnvelope): string {
  return bitcoinCrypto
    .sha256(Buffer.from(encodeListingEnvelope(envelope), 'utf8'))
    .toString('hex')
}

export interface ListingDeedParams {
  readonly envelope: ListingEnvelope
  readonly issuedAt: string
  /** Hex. Makes two listings of the same lot at the same instant distinguishable. */
  readonly nonce: string
}

/**
 * The exact payload the maker's wallet BIP-322-signs. `encodeDeedPayload()` produces its bytes;
 * two implementations that ordered the keys differently would produce signatures that do not
 * verify against each other.
 */
export function listingDeedPayload(params: ListingDeedParams): DeedPayload {
  return {
    v: 1,
    type: 'listing',
    location: params.envelope.lot.location,
    address: params.envelope.maker.address,
    issuedAt: params.issuedAt,
    nonce: params.nonce,
    digest: listingDigest(params.envelope),
  }
}

export interface SealListingParams {
  readonly envelope: ListingEnvelope
  readonly payload: DeedPayload
  readonly signature: string
}

/** Assembles the listing and refuses to publish one whose deed does not bind its envelope. */
export function sealListing(params: SealListingParams): Listing {
  const listing: Listing = {
    envelope: params.envelope,
    deed: { signed: params.payload, signature: params.signature },
  }
  assertListingBinding(listing)
  return listing
}

export interface BindingFinding {
  readonly field: string
  readonly expected: string
  readonly actual: string | undefined
}

/** Structural check only: the deed covers this envelope. The signature itself is W9. */
export function verifyListingBinding(listing: Listing): readonly BindingFinding[] {
  const { signed } = listing.deed
  const findings: BindingFinding[] = []
  const check = (field: string, expected: string, actual: string | undefined): void => {
    if (actual !== expected) findings.push({ field, expected, actual })
  }

  check('signed.type', 'listing', signed.type)
  check('signed.location', listing.envelope.lot.location, signed.location)
  check('signed.address', listing.envelope.maker.address, signed.address)
  check('signed.digest', listingDigest(listing.envelope), signed.digest)
  return findings
}

export function assertListingBinding(listing: Listing): void {
  const findings = verifyListingBinding(listing)
  const first = findings[0]
  if (first !== undefined) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_ASSET_MISMATCH,
      `the deed does not bind this envelope: ${first.field} is ${String(first.actual)}, expected ${first.expected}`,
      { findings },
    )
  }
}

export function parseListing(value: unknown, path = 'listing'): Listing {
  const record = requireRecord(value, CODE, path)
  const listing: Listing = {
    envelope: parseListingEnvelope(record['envelope'], `${path}.envelope`),
    deed: parseDeed(record['deed'], `${path}.deed`),
  }
  assertListingBinding(listing)
  return listing
}

export function decodeListing(json: string): Listing {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    fail(CODE, 'listing is not valid JSON', { cause: String(error) })
  }
  return parseListing(parsed)
}

/** Fixed key order, so encode(decode(x)) is byte-stable across implementations. */
export function encodeListing(listing: Listing): string {
  return `{"envelope":${encodeListingEnvelope(listing.envelope)},"deed":${encodeDeed(listing.deed)}}`
}

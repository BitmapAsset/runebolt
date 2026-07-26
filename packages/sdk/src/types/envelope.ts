import { ImplementationErrorCode, ProtocolErrorCode } from '../errors.js'
import { parseAttributedContents, type AttributedContents } from './attribution.js'
import { ASSET_CLASSES, parseLot, type AssetClass, type Lot } from './lot.js'
import {
  fail,
  optional,
  requireEnum,
  requireHex,
  requireRecord,
  requireRfc3339,
  requireString,
  requireUint,
} from './validate.js'

/**
 * SPEC §6.3 / §8.1. v1 ships SINGLE_ACAP only. Unknown values MUST be rejected rather than
 * assumed to be SINGLE_ACAP (I-17), so protected mode (§9.3) can ship without a wire break.
 */
export const SIGHASH_MODES = ['SINGLE_ACAP'] as const
export type SighashMode = (typeof SIGHASH_MODES)[number]

export interface Maker {
  readonly address: string
  readonly publicKey: string
  readonly receiveAddress: string
}

/** SPEC §8.4. Bitmap only. Parcels and children do not travel with the district. */
export interface BitmapDisclosure {
  readonly districtInscriptionId: string
  readonly parcelsIncluded: boolean
  readonly parcelCountAtListing?: number
  readonly contentLibraryIncluded: boolean
  readonly note?: string
}

export interface ListingEnvelope {
  readonly v: 1
  readonly assetClass: AssetClass
  readonly sighashMode: SighashMode
  readonly lot: Lot
  readonly psbt: string
  readonly maker: Maker
  readonly expiresAt: string
  readonly attribution: AttributedContents
  readonly disclosure?: BitmapDisclosure
}

const CODE = ImplementationErrorCode.E_MALFORMED_ENVELOPE
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

export function parseListingEnvelope(value: unknown, path = 'envelope'): ListingEnvelope {
  const record = requireRecord(value, CODE, path)

  if (record['v'] !== 1) {
    fail(CODE, `${path}.v must be 1`, { path, received: record['v'] })
  }

  // I-17 is a parse-time protocol rule and keeps its own code.
  const sighashMode = requireEnum(
    record['sighashMode'],
    SIGHASH_MODES,
    ProtocolErrorCode.E_UNKNOWN_SIGHASH_MODE,
    `${path}.sighashMode`,
  )

  const assetClass = requireEnum(record['assetClass'], ASSET_CLASSES, CODE, `${path}.assetClass`)
  const lot = parseLot(record['lot'], `${path}.lot`)

  const psbt = requireString(record['psbt'], CODE, `${path}.psbt`)
  if (!BASE64.test(psbt)) {
    fail(CODE, `${path}.psbt must be base64`, { path })
  }

  const makerRecord = requireRecord(record['maker'], CODE, `${path}.maker`)
  const maker: Maker = {
    address: requireString(makerRecord['address'], CODE, `${path}.maker.address`),
    publicKey: requireHex(makerRecord['publicKey'], CODE, `${path}.maker.publicKey`),
    receiveAddress: requireString(
      makerRecord['receiveAddress'],
      CODE,
      `${path}.maker.receiveAddress`,
    ),
  }

  const expiresAt = requireRfc3339(record['expiresAt'], CODE, `${path}.expiresAt`)
  const attribution = parseAttributedContents(record['attribution'], `${path}.attribution`)

  const disclosure = optional(record['disclosure'], (raw): BitmapDisclosure => {
    const d = requireRecord(raw, CODE, `${path}.disclosure`)
    if (typeof d['parcelsIncluded'] !== 'boolean' || typeof d['contentLibraryIncluded'] !== 'boolean') {
      fail(CODE, `${path}.disclosure.parcelsIncluded and .contentLibraryIncluded must be booleans`, {
        path,
      })
    }
    const parcelCountAtListing = optional(d['parcelCountAtListing'], (v) =>
      requireUint(v, CODE, `${path}.disclosure.parcelCountAtListing`),
    )
    const note = optional(d['note'], (v) => requireString(v, CODE, `${path}.disclosure.note`))
    return {
      districtInscriptionId: requireString(
        d['districtInscriptionId'],
        CODE,
        `${path}.disclosure.districtInscriptionId`,
      ),
      parcelsIncluded: d['parcelsIncluded'],
      contentLibraryIncluded: d['contentLibraryIncluded'],
      ...(parcelCountAtListing === undefined ? {} : { parcelCountAtListing }),
      ...(note === undefined ? {} : { note }),
    }
  })

  // SPEC §8.4: a bitmap listing without a scope disclosure implies a sale scope it does not have.
  if (assetClass === 'bitmap' && disclosure === undefined) {
    fail(CODE, `${path}.disclosure is required for bitmap listings (SPEC §8.4)`, { path })
  }

  return {
    v: 1,
    assetClass,
    sighashMode,
    lot,
    psbt,
    maker,
    expiresAt,
    attribution,
    ...(disclosure === undefined ? {} : { disclosure }),
  }
}

export function decodeListingEnvelope(json: string): ListingEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    fail(CODE, 'envelope is not valid JSON', { cause: String(error) })
  }
  return parseListingEnvelope(parsed)
}

/** Key order is fixed so encode(decode(x)) is byte-stable across implementations. */
export function encodeListingEnvelope(envelope: ListingEnvelope): string {
  return JSON.stringify(toWire(envelope))
}

function toWire(envelope: ListingEnvelope): Record<string, unknown> {
  return {
    v: envelope.v,
    assetClass: envelope.assetClass,
    sighashMode: envelope.sighashMode,
    lot: { location: envelope.lot.location, priceSats: envelope.lot.priceSats },
    psbt: envelope.psbt,
    maker: {
      address: envelope.maker.address,
      publicKey: envelope.maker.publicKey,
      receiveAddress: envelope.maker.receiveAddress,
    },
    expiresAt: envelope.expiresAt,
    attribution: {
      indexer: envelope.attribution.indexer,
      indexerVersion: envelope.attribution.indexerVersion,
      blockHeight: envelope.attribution.blockHeight,
      observedAt: envelope.attribution.observedAt,
      contents: {
        inscriptions: [...envelope.attribution.contents.inscriptions],
        runes: envelope.attribution.contents.runes.map((r) => ({
          runeId: r.runeId,
          runeName: r.runeName,
          amount: r.amount,
          ...(r.divisibility === undefined ? {} : { divisibility: r.divisibility }),
          ...(r.symbol === undefined ? {} : { symbol: r.symbol }),
        })),
        brc20: envelope.attribution.contents.brc20.map((t) => ({
          ticker: t.ticker,
          amount: t.amount,
          kind: t.kind,
        })),
        ...(envelope.attribution.contents.valueSats === undefined
          ? {}
          : { valueSats: envelope.attribution.contents.valueSats }),
      },
    },
    ...(envelope.disclosure === undefined
      ? {}
      : {
          disclosure: {
            districtInscriptionId: envelope.disclosure.districtInscriptionId,
            parcelsIncluded: envelope.disclosure.parcelsIncluded,
            ...(envelope.disclosure.parcelCountAtListing === undefined
              ? {}
              : { parcelCountAtListing: envelope.disclosure.parcelCountAtListing }),
            contentLibraryIncluded: envelope.disclosure.contentLibraryIncluded,
            ...(envelope.disclosure.note === undefined ? {} : { note: envelope.disclosure.note }),
          },
        }),
  }
}

/** I-18. Serve-time and buy-time check; books MUST stop serving expired offers (SPEC §4.1). */
export function isExpired(envelope: ListingEnvelope, now: Date): boolean {
  return Date.parse(envelope.expiresAt) <= now.getTime()
}

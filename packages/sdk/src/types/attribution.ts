import { ImplementationErrorCode } from '../errors.js'
import {
  optional,
  requireArray,
  requireDecimalString,
  requireEnum,
  requireRecord,
  requireRfc3339,
  requireString,
  requireUint,
} from './validate.js'

/**
 * SPEC §8.3. Everything describing what a UTXO *contains* is an indexer opinion and carries its
 * provenance. There is no unattributed read API (ARCHITECTURE §1.1(4)).
 */

export interface AttributedRune {
  readonly runeId: string | null
  readonly runeName: string
  readonly amount: string
  readonly divisibility?: number
  readonly symbol?: string
}

export const BRC20_KINDS = ['transfer', 'available', 'deploy', 'mint'] as const
export type Brc20Kind = (typeof BRC20_KINDS)[number]

export interface AttributedBrc20 {
  readonly ticker: string
  readonly amount: string
  readonly kind: Brc20Kind
}

export interface UtxoContents {
  readonly inscriptions: readonly string[]
  readonly runes: readonly AttributedRune[]
  readonly brc20: readonly AttributedBrc20[]
  readonly valueSats?: number
}

export interface AttributedContents {
  readonly indexer: string
  readonly indexerVersion: string
  readonly blockHeight: number
  readonly observedAt: string
  readonly contents: UtxoContents
}

export interface AttributedRuneInfo {
  readonly indexer: string
  readonly indexerVersion: string
  readonly blockHeight: number
  readonly observedAt: string
  readonly runeId: string | null
  readonly runeName: string
  readonly divisibility: number
  readonly symbol?: string
}

export interface AttributedInscriptionInfo {
  readonly indexer: string
  readonly indexerVersion: string
  readonly blockHeight: number
  readonly observedAt: string
  readonly id: string
  /** Cursed inscriptions are negative (SPEC §7.4). Never widen this to a uint. */
  readonly number: number
  readonly satpoint: string
  readonly address?: string
  readonly contentType?: string
  readonly valueSats?: number
  readonly charms: readonly string[]
}

const CODE = ImplementationErrorCode.E_MALFORMED_ENVELOPE

export function parseAttributedContents(value: unknown, path = 'attribution'): AttributedContents {
  const record = requireRecord(value, CODE, path)
  const contents = requireRecord(record['contents'], CODE, `${path}.contents`)

  const inscriptions = requireArray(
    contents['inscriptions'] ?? [],
    CODE,
    `${path}.contents.inscriptions`,
  ).map((entry, i) => requireString(entry, CODE, `${path}.contents.inscriptions[${i}]`))

  const runes = requireArray(contents['runes'] ?? [], CODE, `${path}.contents.runes`).map(
    (entry, i): AttributedRune => {
      const rune = requireRecord(entry, CODE, `${path}.contents.runes[${i}]`)
      const runeIdRaw = rune['runeId']
      const runeName =
        typeof rune['runeName'] === 'string'
          ? requireString(rune['runeName'], CODE, `${path}.contents.runes[${i}].runeName`)
          : requireString(runeIdRaw, CODE, `${path}.contents.runes[${i}].runeName`)
      return {
        runeId: runeIdRaw === null || runeIdRaw === undefined ? null : requireString(runeIdRaw, CODE, `${path}.contents.runes[${i}].runeId`),
        runeName,
        amount: requireDecimalString(rune['amount'], CODE, `${path}.contents.runes[${i}].amount`),
        ...(rune['divisibility'] === undefined
          ? {}
          : { divisibility: requireUint(rune['divisibility'], CODE, `${path}.contents.runes[${i}].divisibility`) }),
        ...(rune['symbol'] === undefined
          ? {}
          : { symbol: requireString(rune['symbol'], CODE, `${path}.contents.runes[${i}].symbol`) }),
      }
    },
  )

  const brc20 = requireArray(contents['brc20'] ?? [], CODE, `${path}.contents.brc20`).map(
    (entry, i): AttributedBrc20 => {
      const token = requireRecord(entry, CODE, `${path}.contents.brc20[${i}]`)
      return {
        ticker: requireString(token['ticker'], CODE, `${path}.contents.brc20[${i}].ticker`),
        amount: requireDecimalString(token['amount'], CODE, `${path}.contents.brc20[${i}].amount`),
        kind: requireEnum(token['kind'], BRC20_KINDS, CODE, `${path}.contents.brc20[${i}].kind`),
      }
    },
  )

  const valueSats = optional(contents['valueSats'], (v) =>
    requireUint(v, CODE, `${path}.contents.valueSats`),
  )

  return {
    indexer: requireString(record['indexer'], CODE, `${path}.indexer`),
    indexerVersion: requireString(record['indexerVersion'], CODE, `${path}.indexerVersion`),
    blockHeight: requireUint(record['blockHeight'], CODE, `${path}.blockHeight`),
    observedAt: requireRfc3339(record['observedAt'], CODE, `${path}.observedAt`),
    contents: {
      inscriptions,
      runes,
      brc20,
      ...(valueSats === undefined ? {} : { valueSats }),
    },
  }
}

/** I-16: contents equality, ignoring provenance (which legitimately changes between reads). */
export function contentsEqual(a: UtxoContents, b: UtxoContents): boolean {
  const runeKey = (r: AttributedRune): string => `${r.runeId ?? r.runeName}=${r.amount}`
  const brcKey = (t: AttributedBrc20): string => `${t.ticker}:${t.kind}=${t.amount}`
  const sorted = (values: readonly string[]): string => [...values].sort().join('|')
  return (
    sorted(a.inscriptions) === sorted(b.inscriptions) &&
    sorted(a.runes.map(runeKey)) === sorted(b.runes.map(runeKey)) &&
    sorted(a.brc20.map(brcKey)) === sorted(b.brc20.map(brcKey))
  )
}

/** I-3: multiple rune IDs, or runes co-located with an inscription (SPEC §3). */
export function isMixedUtxo(contents: UtxoContents): boolean {
  const runeIds = new Set(contents.runes.map((r) => r.runeId ?? r.runeName))
  if (runeIds.size > 1) return true
  if (runeIds.size === 1 && contents.inscriptions.length > 0) return true
  return false
}

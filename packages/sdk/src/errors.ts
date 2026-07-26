/**
 * Error codes and the invariant table from SPEC §7.1.
 * Protocol codes are exactly the eighteen named in the spec; implementation codes are
 * kept in a separate enum so spec drift is visible rather than silent.
 */

export const ProtocolErrorCode = {
  E_RUNE_OUTPUT_INDEX: 'E_RUNE_OUTPUT_INDEX',
  E_RUNESTONE_PRESENT: 'E_RUNESTONE_PRESENT',
  E_MIXED_UTXO: 'E_MIXED_UTXO',
  E_INDEX_MISALIGNED: 'E_INDEX_MISALIGNED',
  E_SAT_OFFSET: 'E_SAT_OFFSET',
  E_PAYMENT_VALUE: 'E_PAYMENT_VALUE',
  E_NO_DUMMY_UTXOS: 'E_NO_DUMMY_UTXOS',
  E_DUMMY_NOT_REGENERATED: 'E_DUMMY_NOT_REGENERATED',
  E_MULTIPLE_OWNED_INPUTS: 'E_MULTIPLE_OWNED_INPUTS',
  E_ASSET_MISMATCH: 'E_ASSET_MISMATCH',
  E_BALANCE_DELTA: 'E_BALANCE_DELTA',
  E_SIGNATURE_STATE: 'E_SIGNATURE_STATE',
  E_RUNES_IN_INSCRIPTION_OFFER: 'E_RUNES_IN_INSCRIPTION_OFFER',
  E_INSCRIPTION_COUNT: 'E_INSCRIPTION_COUNT',
  E_LOT_SPENT: 'E_LOT_SPENT',
  E_LOT_DRIFT: 'E_LOT_DRIFT',
  E_UNKNOWN_SIGHASH_MODE: 'E_UNKNOWN_SIGHASH_MODE',
  E_EXPIRED: 'E_EXPIRED',
  E_SIGHASH_MISMATCH: 'E_SIGHASH_MISMATCH',
} as const

export type ProtocolErrorCode = (typeof ProtocolErrorCode)[keyof typeof ProtocolErrorCode]

/** Structural failures that have no SPEC §7.1 code. Never used to report a protocol violation. */
export const ImplementationErrorCode = {
  E_MALFORMED_ENVELOPE: 'E_MALFORMED_ENVELOPE',
  E_MALFORMED_DEED: 'E_MALFORMED_DEED',
  E_MALFORMED_PSBT: 'E_MALFORMED_PSBT',
  E_MALFORMED_LOCATION: 'E_MALFORMED_LOCATION',
  E_INDEXER_UNAVAILABLE: 'E_INDEXER_UNAVAILABLE',
  E_UNSUPPORTED_ASSET_CLASS: 'E_UNSUPPORTED_ASSET_CLASS',
  E_INSUFFICIENT_FUNDS: 'E_INSUFFICIENT_FUNDS',
  E_OFFER_MUTATED: 'E_OFFER_MUTATED',
} as const

export type ImplementationErrorCode =
  (typeof ImplementationErrorCode)[keyof typeof ImplementationErrorCode]

export type RuneBoltErrorCode = ProtocolErrorCode | ImplementationErrorCode

export type InvariantClass =
  | 'SILENT-LOSS'
  | 'listing-time'
  | 'assert'
  | 'precondition'
  | 'verifyOffer'
  | 'buy-time'
  | 'parse'
  | 'serve-time'

export interface Invariant {
  readonly id: string
  readonly code: ProtocolErrorCode
  readonly class: InvariantClass
  readonly statement: string
}

/** SPEC §7.1, transcribed. Rules classed SILENT-LOSS require an adversarial fixture. */
export const INVARIANTS: readonly Invariant[] = [
  {
    id: 'I-1',
    code: ProtocolErrorCode.E_RUNE_OUTPUT_INDEX,
    class: 'SILENT-LOSS',
    statement: 'Runes: buyer rune-receive output is at index 0',
  },
  {
    id: 'I-2',
    code: ProtocolErrorCode.E_RUNESTONE_PRESENT,
    class: 'SILENT-LOSS',
    statement: 'Runes: swap tx contains zero runestones and zero OP_RETURN outputs',
  },
  {
    id: 'I-3',
    code: ProtocolErrorCode.E_MIXED_UTXO,
    class: 'listing-time',
    statement: 'Listing rejected if the lot is a mixed UTXO',
  },
  {
    id: 'I-4',
    code: ProtocolErrorCode.E_INDEX_MISALIGNED,
    class: 'SILENT-LOSS',
    statement: '2-dummy layout: seller input index == seller payment output index == 2',
  },
  {
    id: 'I-5',
    code: ProtocolErrorCode.E_SAT_OFFSET,
    class: 'SILENT-LOSS',
    statement: '2-dummy layout: asset→buyer output is at index 1 with exact sat offset preserved',
  },
  {
    id: 'I-6',
    code: ProtocolErrorCode.E_PAYMENT_VALUE,
    class: 'assert',
    statement: 'Seller payment output value == priceSats + postage',
  },
  {
    id: 'I-7',
    code: ProtocolErrorCode.E_NO_DUMMY_UTXOS,
    class: 'precondition',
    statement: 'Buyer holds >=2 dummy UTXOs in [580, 1000] sat',
  },
  {
    id: 'I-8',
    code: ProtocolErrorCode.E_DUMMY_NOT_REGENERATED,
    class: 'assert',
    statement: 'Every purchase emits 2 fresh dummy UTXOs back to the buyer',
  },
  {
    id: 'I-9',
    code: ProtocolErrorCode.E_MULTIPLE_OWNED_INPUTS,
    class: 'verifyOffer',
    statement: 'Exactly one PSBT input is owned by the signer',
  },
  {
    id: 'I-10',
    code: ProtocolErrorCode.E_ASSET_MISMATCH,
    class: 'verifyOffer',
    statement: "The owned input's asset set matches the asserted asset exactly",
  },
  {
    id: 'I-11',
    code: ProtocolErrorCode.E_BALANCE_DELTA,
    class: 'verifyOffer',
    statement: 'Simulated net balance delta == asserted price',
  },
  {
    id: 'I-12',
    code: ProtocolErrorCode.E_SIGNATURE_STATE,
    class: 'verifyOffer',
    statement: 'Counterparty inputs are signed; own input is unsigned',
  },
  {
    id: 'I-13',
    code: ProtocolErrorCode.E_RUNES_IN_INSCRIPTION_OFFER,
    class: 'verifyOffer',
    statement: 'Inscription offers: the owned input contains zero runes',
  },
  {
    id: 'I-14',
    code: ProtocolErrorCode.E_INSCRIPTION_COUNT,
    class: 'verifyOffer',
    statement: 'Inscription offers: the owned input contains exactly one inscription',
  },
  {
    id: 'I-15',
    code: ProtocolErrorCode.E_LOT_SPENT,
    class: 'buy-time',
    statement: 'The referenced lot is unspent at buy time',
  },
  {
    id: 'I-16',
    code: ProtocolErrorCode.E_LOT_DRIFT,
    class: 'buy-time',
    statement: "The lot's indexer-reported contents at buy time match those at listing time",
  },
  {
    id: 'I-17',
    code: ProtocolErrorCode.E_UNKNOWN_SIGHASH_MODE,
    class: 'parse',
    statement: 'sighashMode is a recognised enum value',
  },
  {
    id: 'I-18',
    code: ProtocolErrorCode.E_EXPIRED,
    class: 'serve-time',
    statement: 'Listing has not passed expiresAt',
  },
  {
    id: 'I-19',
    code: ProtocolErrorCode.E_SIGHASH_MISMATCH,
    class: 'verifyOffer',
    statement: "The seller signature's sighash flags match the envelope's sighashMode",
  },
]

export const SILENT_LOSS_INVARIANTS: readonly Invariant[] = INVARIANTS.filter(
  (i) => i.class === 'SILENT-LOSS',
)

export class RuneBoltError extends Error {
  readonly code: RuneBoltErrorCode
  readonly invariant: string | undefined
  readonly detail: Readonly<Record<string, unknown>>

  constructor(
    code: RuneBoltErrorCode,
    message: string,
    detail: Record<string, unknown> = {},
    invariant?: string,
  ) {
    super(`${code}: ${message}`)
    this.name = 'RuneBoltError'
    this.code = code
    this.invariant = invariant ?? INVARIANTS.find((i) => i.code === code)?.id
    this.detail = Object.freeze({ ...detail })
  }
}

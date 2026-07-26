/** msigner constants, adopted verbatim (SPEC §6.1). Index positions are load-bearing. */
export const SELLER_SIGNATURE_INDEX = 2
export const BUYER_RECEIVE_INDEX = 1
export const PLATFORM_FEE_INDEX = 3
export const DUMMY_UTXO_VALUE = 600
export const DUMMY_UTXO_MIN_VALUE = 580
export const DUMMY_UTXO_MAX_VALUE = 1000
export const ORDINALS_POSTAGE_VALUE = 10000

/** Rune swap layout (SPEC §6.2): buyer rune-receive at 0, seller input and payment at 1. */
export const RUNE_BUYER_RECEIVE_INDEX = 0
export const RUNE_SELLER_INDEX = 1
/** Sats carried by the buyer's rune-receive output. Runes ride the output, not its value. */
export const RUNE_RECEIVE_VALUE = 546

/** SIGHASH_SINGLE (3) | SIGHASH_ANYONECANPAY (128). */
export const SIGHASH_SINGLE_ANYONECANPAY = 0x83
export const SIGHASH_NONE = 0x02

export const DUST_LIMIT_SATS = 546

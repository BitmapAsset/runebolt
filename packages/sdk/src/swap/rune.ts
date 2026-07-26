import { networks, Psbt } from 'bitcoinjs-lib'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../errors.js'
import type { IndexerAdapter } from '../indexer/adapter.js'
import {
  isMixedUtxo,
  type AttributedContents,
  type AttributedRune,
  type UtxoContents,
} from '../types/attribution.js'
import {
  decodeListingEnvelope,
  encodeListingEnvelope,
  type ListingEnvelope,
  type Maker,
} from '../types/envelope.js'
import { formatLocation, parseLocation } from '../types/location.js'
import {
  DUST_LIMIT_SATS,
  RUNE_BUYER_RECEIVE_INDEX,
  RUNE_RECEIVE_VALUE,
  RUNE_SELLER_INDEX,
  SIGHASH_SINGLE_ANYONECANPAY,
} from './constants.js'
import { resolveFee, type FeeChoice } from './fee.js'
import { placeholderOutpoint, placeholderScript } from './placeholder.js'
import { parsePsbtView } from './psbt.js'
import {
  addInput,
  addressToScript,
  signatureFields,
  toScript,
  type Network,
  type SwapUtxo,
} from './tx.js'
import { assertOffer, type SignerView, type VerifyVerdict } from './verify.js'

/**
 * W7 / SPEC §6.2. The runestone-free layout.
 *
 * ```
 *  idx │ INPUT                                │ OUTPUT
 * ─────┼──────────────────────────────────────┼──────────────────────────────
 *   0  │ buyer input        (SIGHASH_ALL)     │ RUNES → BUYER   ← MUST be 0
 *   1  │ SELLER RUNE UTXO                     │ SELLER PAYMENT
 *      │   SIGHASH_SINGLE|ANYONECANPAY        │   = priceSats + input value
 *   2+ │ buyer funding      (SIGHASH_ALL)     │ buyer change
 * ```
 *
 * No runestone and no OP_RETURN, ever. Unallocated runes go to the first non-OP_RETURN output, so
 * output 0 is the whole allocation mechanism — and a malformed runestone would be a cenotaph that
 * burns every input rune (SPEC §6.2.1). Both are enforced by `verifyOffer()`, which every builder
 * here calls before returning.
 */

/** Placeholder amounts. Replaced wholesale by the buyer, so only their structure matters. */
const PLACEHOLDER_FEE_SATS = 2_000
const PLACEHOLDER_CHANGE_SATS = 10_000

export interface RuneLotCandidate {
  /** `txid:vout`. */
  readonly outpoint: string
  readonly valueSats: number
  readonly script: string | Uint8Array
  /** The indexer's attributed read of this UTXO (SPEC §8.3), not the seller's belief about it. */
  readonly contents: UtxoContents
}

export type RuneListingAction = 'list' | 'split' | 'insufficient'

export interface RuneListingPlan {
  readonly action: RuneListingAction
  /** The rune id or name that was asked for, echoed back. */
  readonly rune: string
  readonly amount: string
  /** `list`: the exact-balance lot to list, so no prepare transaction is charged. */
  readonly lot?: RuneLotCandidate
  /** `split`: the lots a split would draw from, largest holding first. */
  readonly sources?: readonly RuneLotCandidate[]
  /** Total holding of this rune across every conforming lot. */
  readonly availableAmount: string
  readonly reason: string
}

export interface PlanRuneListingParams {
  /** Rune id (`840000:3`) or spaced name. Matched against either. */
  readonly rune: string
  /** Base units, as a decimal string: rune amounts are u128 and must not touch a JS number. */
  readonly amount: string
  readonly lots: readonly RuneLotCandidate[]
}

/**
 * SPEC §4.2. "Detecting the skip case is mandatory. A seller who already holds an exact-balance lot
 * MUST NOT be charged a prepare transaction."
 *
 * The `split` answer is the other half of SPEC §6.2.2: a partial balance cannot be sold inside the
 * swap transaction at all, because the edict that would divide it lives in an OP_RETURN the
 * seller's `SIGHASH_SINGLE|ANYONECANPAY` signature does not commit to. The split is a separate,
 * confirmed transaction (SPEC §4.4, W8) — this function decides whether one is needed, and never
 * pretends the swap can do it.
 */
export function planRuneListing(params: PlanRuneListingParams): RuneListingPlan {
  const wanted = parseAmount(params.amount, 'amount')
  const holdings = params.lots
    .map((lot) => ({ lot, held: runeHolding(lot.contents, params.rune) }))
    .filter((entry): entry is { lot: RuneLotCandidate; held: AttributedRune } => entry.held !== undefined)

  const availableAmount = holdings
    .reduce((sum, entry) => sum + parseAmount(entry.held.amount, 'lot amount'), 0n)
    .toString()
  const common = { rune: params.rune, amount: params.amount, availableAmount }

  const exact = holdings.find((entry) => parseAmount(entry.held.amount, 'lot amount') === wanted)
  if (exact !== undefined) {
    return {
      ...common,
      action: 'list',
      lot: exact.lot,
      reason: 'a lot already holds exactly this amount; no prepare transaction is needed',
    }
  }

  if (parseAmount(availableAmount, 'available') < wanted) {
    return {
      ...common,
      action: 'insufficient',
      reason: `the wallet holds ${availableAmount} of ${params.rune}, short of the ${params.amount} being listed`,
    }
  }

  return {
    ...common,
    action: 'split',
    sources: [...holdings]
      .sort((a, b) => compareAmounts(b.held.amount, a.held.amount))
      .map((entry) => entry.lot),
    reason:
      'no lot holds exactly this amount; a split must confirm first, because a partial balance ' +
      'cannot be divided inside the swap transaction (SPEC §6.2.2)',
  }
}

export interface MakeRuneOfferParams {
  /** The rune lot. It must hold exactly `sellAmount` and nothing else. */
  readonly lot: SwapUtxo
  readonly priceSats: number
  /**
   * The rune balance being sold, in base units. The lot must hold exactly this: there is no way to
   * sell part of a lot inside the swap transaction (SPEC §6.2.2), so a larger balance is refused
   * rather than listed at the price of a smaller one.
   */
  readonly sellAmount: string
  readonly maker: Maker
  readonly attribution: AttributedContents
  readonly expiresAt: string
  /** Sats the buyer's rune-receive output carries. Runes ride the output, not its sats. */
  readonly receiveValueSats?: number
  readonly network?: Network
  readonly now?: Date
}

export interface RuneOfferDraft {
  readonly psbt: string
  readonly envelope: ListingEnvelope
  readonly txid: string
  readonly sellerInputIndex: number
  readonly sellerPaymentIndex: number
  readonly paymentValueSats: number
  readonly receiveValueSats: number
  readonly placeholderInputs: readonly number[]
  readonly placeholderOutputs: readonly number[]
  readonly network: Network
}

/**
 * W7. The seller's rune offer, in the full arrangement the seller's signature needs to exist
 * inside: their input at index 1 with their payment at output 1, and the buyer stood in for by
 * placeholders everywhere else (see `placeholder.ts`).
 */
export async function makeRuneOffer(params: MakeRuneOfferParams): Promise<RuneOfferDraft> {
  const network = params.network ?? networks.bitcoin
  const receiveValueSats = params.receiveValueSats ?? RUNE_RECEIVE_VALUE
  if (receiveValueSats < DUST_LIMIT_SATS) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      `the rune-receive output must clear the dust limit of ${DUST_LIMIT_SATS} sat`,
      { receiveValueSats },
    )
  }
  if (parseLocation(params.lot.outpoint).offset !== undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_LOCATION,
      'a rune lot is an outpoint (txid:vout); the sat offset belongs to inscriptions (SPEC §6.1)',
      { outpoint: params.lot.outpoint },
    )
  }

  assertExactBalance(params.attribution.contents, params.sellAmount, params.lot.outpoint)

  const paymentValueSats = params.priceSats + params.lot.valueSats
  const placeholder = Buffer.from(placeholderScript())
  const outputs = [
    { script: placeholder, value: receiveValueSats },
    {
      script: toScript(addressToScript(params.maker.receiveAddress, network)),
      value: paymentValueSats,
    },
    { script: placeholder, value: PLACEHOLDER_CHANGE_SATS },
  ]

  const outputTotal = outputs.reduce((sum, output) => sum + output.value, 0)
  const fundingValue = outputTotal + PLACEHOLDER_FEE_SATS - params.lot.valueSats

  const psbt = new Psbt({ network })
  addInput(psbt, {
    outpoint: placeholderOutpoint(0),
    valueSats: fundingValue,
    script: placeholder,
  })
  addInput(psbt, params.lot)
  for (const output of outputs) psbt.addOutput({ script: output.script, value: output.value })

  // The wallet still decides the flags; this is the request, and sealOffer() judges what came back.
  psbt.updateInput(RUNE_SELLER_INDEX, { sighashType: SIGHASH_SINGLE_ANYONECANPAY })

  const base64 = psbt.toBase64()
  const envelope = buildRuneEnvelope(params, base64)

  await assertOffer({
    envelope,
    role: 'seller',
    stage: 'draft',
    signer: { addresses: [params.maker.address, params.maker.receiveAddress] },
    network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  return {
    psbt: base64,
    envelope,
    txid: parsePsbtView(base64, network).unsignedTxid,
    sellerInputIndex: RUNE_SELLER_INDEX,
    sellerPaymentIndex: RUNE_SELLER_INDEX,
    paymentValueSats,
    receiveValueSats,
    placeholderInputs: [RUNE_BUYER_RECEIVE_INDEX],
    placeholderOutputs: [RUNE_BUYER_RECEIVE_INDEX, 2],
    network,
  }
}

export interface RuneBuyerWallet {
  /** Spent in full. The first one becomes input 0, which is where the runes are allocated. */
  readonly funding: readonly SwapUtxo[]
  /** Receives the runes at output 0. */
  readonly receiveAddress: string
  readonly changeAddress?: string
}

export interface CompleteRuneSwapParams {
  readonly envelope: ListingEnvelope
  readonly buyer: RuneBuyerWallet
  readonly fee: FeeChoice
  /** Lands after the seller payment. Index 0 belongs to the buyer's runes and to nothing else. */
  readonly platformFee?: { readonly address: string; readonly valueSats: number }
  readonly receiveValueSats?: number
  readonly network?: Network
  readonly indexer?: IndexerAdapter
  readonly now?: Date
}

export interface CompletedRuneSwap {
  readonly psbt: string
  readonly txid: string
  readonly feeSats: number
  readonly vsize: number
  readonly changeSats: number | null
  readonly buyerDeltaSats: number
  readonly verdict: VerifyVerdict
}

/**
 * W7. Completes a seller-signed rune offer. The seller's signed input is carried over at index 1
 * with its payment byte-for-byte at output 1 — the only two things `SIGHASH_SINGLE|ANYONECANPAY`
 * commits to — and the buyer's real input takes index 0 so the runes land on the buyer's output.
 */
export async function completeRuneSwap(
  params: CompleteRuneSwapParams,
): Promise<CompletedRuneSwap> {
  const { envelope, buyer } = params
  const network = params.network ?? networks.bitcoin

  if (envelope.assetClass !== 'rune') {
    throw new RuneBoltError(
      ImplementationErrorCode.E_UNSUPPORTED_ASSET_CLASS,
      `completeRuneSwap builds the runestone-free layout (SPEC §6.2); ${envelope.assetClass} uses the 2-dummy layout`,
      { assetClass: envelope.assetClass },
    )
  }

  await assertOffer({
    envelope,
    role: 'seller',
    stage: 'offer',
    signer: { addresses: [envelope.maker.address, envelope.maker.receiveAddress] },
    network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  const offer = Psbt.fromBase64(envelope.psbt, { network })
  const lot = parseLocation(envelope.lot.location)
  const sellerInput = offer.data.inputs[RUNE_SELLER_INDEX]
  const sellerTxInput = offer.txInputs[RUNE_SELLER_INDEX]
  const sellerPayment = offer.txOutputs[RUNE_SELLER_INDEX]
  if (sellerInput === undefined || sellerTxInput === undefined || sellerPayment === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      `the offer has no input and output at the seller index ${RUNE_SELLER_INDEX}`,
    )
  }

  const [first, ...rest] = buyer.funding
  if (first === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_INSUFFICIENT_FUNDS,
      'a rune purchase needs at least one buyer input, which becomes input 0',
      {},
    )
  }

  const lotValueSats = sellerInput.witnessUtxo?.value
  const lotScript = sellerInput.witnessUtxo?.script
  if (lotValueSats === undefined || lotScript === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      'the seller input carries no witnessUtxo',
      { lot: envelope.lot.location },
    )
  }

  const receiveValueSats = params.receiveValueSats ?? RUNE_RECEIVE_VALUE
  if (receiveValueSats < DUST_LIMIT_SATS) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      `the rune-receive output must clear the dust limit of ${DUST_LIMIT_SATS} sat`,
      { receiveValueSats },
    )
  }

  const receiveScript = toScript(addressToScript(buyer.receiveAddress, network))
  const changeScript = toScript(
    addressToScript(buyer.changeAddress ?? buyer.receiveAddress, network),
  )

  const inputs: SwapUtxo[] = [
    first,
    {
      outpoint: formatLocation({ txid: lot.txid, vout: lot.vout }),
      valueSats: lotValueSats,
      script: Uint8Array.from(lotScript),
    },
    ...rest,
  ]
  const inputScripts = inputs.map((utxo) => toScript(utxo.script))
  const totalInSats = inputs.reduce((sum, utxo) => sum + utxo.valueSats, 0)

  const fixed = [
    // I-1: the buyer's rune-receive output, and nothing else, may sit at index 0.
    { script: receiveScript, value: receiveValueSats },
    { script: Buffer.from(sellerPayment.script), value: sellerPayment.value },
    ...(params.platformFee === undefined
      ? []
      : [
          {
            script: toScript(addressToScript(params.platformFee.address, network)),
            value: params.platformFee.valueSats,
          },
        ]),
  ]
  const fixedOutSats = fixed.reduce((sum, output) => sum + output.value, 0)

  const withChange = resolveFee(params.fee, inputScripts, [
    ...fixed.map((output) => output.script),
    changeScript,
  ])
  let feeSats = withChange.feeSats
  let vsize = withChange.vsize
  let changeSats: number | null = totalInSats - fixedOutSats - feeSats

  if (changeSats < DUST_LIMIT_SATS) {
    const withoutChange = resolveFee(
      params.fee,
      inputScripts,
      fixed.map((output) => output.script),
    )
    vsize = withoutChange.vsize
    changeSats = null
    feeSats = totalInSats - fixedOutSats
    if (feeSats < withoutChange.feeSats) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_INSUFFICIENT_FUNDS,
        `buyer inputs of ${totalInSats} sat cannot pay ${fixedOutSats} sat of outputs plus a ${withoutChange.feeSats} sat fee`,
        { totalInSats, fixedOutSats, feeSats: withoutChange.feeSats },
      )
    }
  }

  const psbt = new Psbt({ network })
  psbt.setVersion(offer.version)
  psbt.setLocktime(offer.locktime)
  addInput(psbt, first)
  psbt.addInput({
    hash: Buffer.from(sellerTxInput.hash),
    index: sellerTxInput.index,
    ...(sellerTxInput.sequence === undefined ? {} : { sequence: sellerTxInput.sequence }),
    ...signatureFields(sellerInput),
  })
  for (const utxo of rest) addInput(psbt, utxo)
  for (const output of fixed) psbt.addOutput({ script: output.script, value: output.value })
  if (changeSats !== null) psbt.addOutput({ script: changeScript, value: changeSats })

  const completed = psbt.toBase64()
  const platformFeeSats = params.platformFee?.valueSats ?? 0
  const buyerDeltaSats = -(envelope.lot.priceSats + feeSats + platformFeeSats)

  const buyerView: SignerView = {
    addresses: [
      buyer.receiveAddress,
      ...(buyer.changeAddress === undefined ? [] : [buyer.changeAddress]),
    ],
    outpoints: buyer.funding.map((utxo) => utxo.outpoint),
  }
  const verdict = await assertOffer({
    envelope,
    psbt: completed,
    role: 'buyer',
    stage: 'offer',
    signer: buyerView,
    network,
    ...(params.indexer === undefined ? {} : { indexer: params.indexer }),
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  // Two independent derivations of the same number, as in the 2-dummy path: this builder's
  // arithmetic, and the verifier's simulation against the buyer's wallet.
  if (verdict.netDeltaSats !== buyerDeltaSats) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_BALANCE_DELTA,
      `derived buyer delta ${buyerDeltaSats} does not match the simulated ${verdict.netDeltaSats}`,
      { derived: buyerDeltaSats, simulated: verdict.netDeltaSats, feeSats, platformFeeSats },
    )
  }

  return {
    psbt: completed,
    txid: parsePsbtView(completed, network).unsignedTxid,
    feeSats,
    vsize,
    changeSats,
    buyerDeltaSats,
    verdict,
  }
}

/**
 * I-10, and the reason the lot model has no `amount` field. A lot is sold whole: the buyer receives
 * every rune on it, because output 0 takes the entire unallocated balance and nothing in the swap
 * can divide it. Listing a 10,000-rune lot as a sale of 3,000 therefore hands the buyer all 10,000
 * at the price of 3,000, and the seller's loss is invisible — no error from Bitcoin, the indexer or
 * the wallet. The split has to have happened already (SPEC §4.4, §6.2.2).
 */
function assertExactBalance(contents: UtxoContents, sellAmount: string, outpoint: string): void {
  const wanted = parseAmount(sellAmount, 'sellAmount')
  if (isMixedUtxo(contents) || contents.inscriptions.length > 0) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_MIXED_UTXO,
      'the lot is a mixed UTXO and is not listable',
      { outpoint, inscriptions: contents.inscriptions.length, runes: contents.runes.length },
    )
  }
  const [held, ...others] = contents.runes
  if (held === undefined || others.length > 0) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_ASSET_MISMATCH,
      `a rune listing must hold exactly one rune, found ${contents.runes.length}`,
      { outpoint, runes: contents.runes.map((rune) => rune.runeId ?? rune.runeName) },
    )
  }
  const actual = parseAmount(held.amount, 'lot amount')
  if (actual !== wanted) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_ASSET_MISMATCH,
      actual > wanted
        ? `the lot holds ${held.amount} but only ${sellAmount} is being sold; the buyer would receive all of it. Split first (SPEC §4.4)`
        : `the lot holds ${held.amount}, less than the ${sellAmount} being sold`,
      {
        outpoint,
        lotAmount: held.amount,
        sellAmount,
        rune: held.runeId ?? held.runeName,
      },
    )
  }
}

function runeHolding(contents: UtxoContents, rune: string): AttributedRune | undefined {
  if (isMixedUtxo(contents) || contents.inscriptions.length > 0) return undefined
  return contents.runes.find((held) => held.runeId === rune || held.runeName === rune)
}

/** Rune amounts are u128 (SPEC §8.3) and must never round-trip through a JS number. */
function parseAmount(value: string, label: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_ENVELOPE,
      `${label} must be a base-10 integer string, found ${JSON.stringify(value)}`,
      { label, value },
    )
  }
  return BigInt(value)
}

function compareAmounts(a: string, b: string): number {
  const left = parseAmount(a, 'lot amount')
  const right = parseAmount(b, 'lot amount')
  return left === right ? 0 : left < right ? -1 : 1
}

function buildRuneEnvelope(params: MakeRuneOfferParams, psbt: string): ListingEnvelope {
  const candidate: ListingEnvelope = {
    v: 1,
    assetClass: 'rune',
    sighashMode: 'SINGLE_ACAP',
    lot: { location: params.lot.outpoint, priceSats: params.priceSats },
    psbt,
    maker: params.maker,
    expiresAt: params.expiresAt,
    attribution: params.attribution,
  }
  return decodeListingEnvelope(encodeListingEnvelope(candidate))
}

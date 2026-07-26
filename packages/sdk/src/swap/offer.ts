import { networks, Psbt } from 'bitcoinjs-lib'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../errors.js'
import type { AttributedContents } from '../types/attribution.js'
import {
  decodeListingEnvelope,
  encodeListingEnvelope,
  type BitmapDisclosure,
  type ListingEnvelope,
  type Maker,
} from '../types/envelope.js'
import type { AssetClass } from '../types/lot.js'
import {
  DUMMY_UTXO_VALUE,
  DUST_LIMIT_SATS,
  SELLER_SIGNATURE_INDEX,
  SIGHASH_SINGLE_ANYONECANPAY,
} from './constants.js'
import { resolveFee, type FeeChoice } from './fee.js'
import { placeholderAddress, placeholderOutpoint, placeholderScript } from './placeholder.js'
import { parsePsbtView } from './psbt.js'
import { makeRuneOffer } from './rune.js'
import {
  addInput,
  addressToScript,
  resolveLotSatOffset,
  toScript,
  type Network,
  type SwapUtxo,
} from './tx.js'
import { assertOffer } from './verify.js'

export interface MakeOfferParams {
  readonly assetClass: AssetClass
  /**
   * The lot UTXO. Its outpoint is the listing location and may be a `txid:vout:offset` satpoint
   * (SPEC §3), in which case the offset supplies `satOffset`. Its value is the postage it carries.
   */
  readonly lot: SwapUtxo
  readonly priceSats: number
  /**
   * I-5. Offset of the inscribed sat inside the lot; routes the asset to offset 0 of output 1.
   * Optional only when the lot outpoint is a satpoint that already carries it.
   */
  readonly satOffset?: number
  readonly maker: Maker
  readonly attribution: AttributedContents
  readonly expiresAt: string
  readonly disclosure?: BitmapDisclosure
  readonly network?: Network
  readonly dummyValueSats?: number
  /** Rune listings only (SPEC §6.2): the exact balance the lot must hold. */
  readonly sellAmount?: string
  /** Rune listings only: sats carried by the buyer's rune-receive output. */
  readonly receiveValueSats?: number
  readonly now?: Date
}

export interface OfferDraft {
  /** Unsigned, full canonical arrangement. This is what the seller's wallet signs. */
  readonly psbt: string
  /** Carries the unsigned PSBT until `sealOffer()` swaps in the signed one. */
  readonly envelope: ListingEnvelope
  readonly txid: string
  /** The 2-dummy layout only. Runes have no sat-offset contract (SPEC §6.2). */
  readonly satOffset?: number
  readonly sellerInputIndex: number
  readonly sellerPaymentIndex: number
  readonly paymentValueSats: number
  /** Indexes `completeSwap()` must replace. Everything the seller's signature does not cover. */
  readonly placeholderInputs: readonly number[]
  readonly placeholderOutputs: readonly number[]
  readonly network: Network
}

const TWO_DUMMY_CLASSES = new Set<AssetClass>(['inscription', 'bitmap', 'brc20'])

/** Placeholder amounts. Replaced wholesale by the buyer, so only their structure matters. */
const PLACEHOLDER_FEE_SATS = 2_000
const PLACEHOLDER_CHANGE_SATS = 10_000

/**
 * W4 / SPEC §6.1. Builds the seller's offer transaction in the full canonical arrangement, with
 * the buyer's side stood in for by placeholders (see `placeholder.ts` for why they must exist
 * before the buyer does).
 *
 * The returned PSBT is unsigned: the SDK holds no keys (ARCHITECTURE §1.1(3)). The seller signs
 * input 2 with `SIGHASH_SINGLE|ANYONECANPAY` and passes the result to `sealOffer()`.
 *
 * Every draft is run through `assertOffer()` before it is returned, so a mis-built offer fails here
 * rather than at a buyer's wallet.
 */
export async function makeOffer(params: MakeOfferParams): Promise<OfferDraft> {
  const network = params.network ?? networks.bitcoin
  if (params.assetClass === 'rune') return runeDraft(params, network)
  if (!TWO_DUMMY_CLASSES.has(params.assetClass)) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_UNSUPPORTED_ASSET_CLASS,
      `makeOffer builds the 2-dummy layout (SPEC §6.1); ${params.assetClass} has no builder`,
      { assetClass: params.assetClass },
    )
  }

  const satOffset = resolveLotSatOffset(params.lot.outpoint, params.satOffset)
  const dummyValue = params.dummyValueSats ?? DUMMY_UTXO_VALUE
  const paymentValueSats = params.priceSats + params.lot.valueSats

  if (satOffset >= params.lot.valueSats) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      'satOffset lies outside the lot',
      { satOffset, lotValueSats: params.lot.valueSats },
    )
  }

  const placeholder = { script: Buffer.from(placeholderScript()), address: placeholderAddress(network) }

  const recombine = dummyValue * 2 + satOffset
  const outputs = [
    { script: placeholder.script, value: recombine },
    { script: placeholder.script, value: params.lot.valueSats },
    { script: toScript(addressToScript(params.maker.receiveAddress, network)), value: paymentValueSats },
    { script: placeholder.script, value: dummyValue },
    { script: placeholder.script, value: dummyValue },
    { script: placeholder.script, value: PLACEHOLDER_CHANGE_SATS },
  ]

  const outputTotal = outputs.reduce((sum, output) => sum + output.value, 0)
  const fundingValue =
    outputTotal + PLACEHOLDER_FEE_SATS - dummyValue * 2 - params.lot.valueSats

  const psbt = new Psbt({ network })
  addInput(psbt, {
    outpoint: placeholderOutpoint(0),
    valueSats: dummyValue,
    script: placeholder.script,
  })
  addInput(psbt, {
    outpoint: placeholderOutpoint(1),
    valueSats: dummyValue,
    script: placeholder.script,
  })
  addInput(psbt, params.lot)
  addInput(psbt, {
    outpoint: placeholderOutpoint(3),
    valueSats: fundingValue,
    script: placeholder.script,
  })
  for (const output of outputs) psbt.addOutput({ script: output.script, value: output.value })

  // The wallet still decides the flags; this is the request, and sealOffer() judges what came back.
  psbt.updateInput(SELLER_SIGNATURE_INDEX, { sighashType: SIGHASH_SINGLE_ANYONECANPAY })

  const base64 = psbt.toBase64()
  const envelope = buildEnvelope(params, base64)

  const draft: OfferDraft = {
    psbt: base64,
    envelope,
    txid: parsePsbtView(base64, network).unsignedTxid,
    satOffset,
    sellerInputIndex: SELLER_SIGNATURE_INDEX,
    sellerPaymentIndex: SELLER_SIGNATURE_INDEX,
    paymentValueSats,
    placeholderInputs: [0, 1, 3],
    placeholderOutputs: [0, 1, 3, 4, 5],
    network,
  }

  await assertOffer({
    envelope,
    role: 'seller',
    stage: 'draft',
    signer: { addresses: [params.maker.address, params.maker.receiveAddress] },
    satOffset,
    network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  return draft
}

export interface SealOfferParams {
  readonly draft: OfferDraft
  /** The draft PSBT as returned by the seller's wallet, with input 2 signed. */
  readonly signedPsbt: string
  readonly now?: Date
}

/**
 * W4. Turns a signed draft into the publishable envelope. It re-runs the whole checklist at stage
 * `offer` — a wallet that quietly rewrote an output, signed the wrong input, or used the wrong
 * sighash flags is caught here, before the offer is published and becomes someone else's problem.
 */
export async function sealOffer(params: SealOfferParams): Promise<ListingEnvelope> {
  const { draft } = params
  const view = parsePsbtView(params.signedPsbt, draft.network)

  // Segwit signatures do not touch the txid, so an unequal txid means the transaction itself
  // changed between the draft and what came back from the wallet.
  if (view.unsignedTxid !== draft.txid) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_OFFER_MUTATED,
      'the signed PSBT is not the draft that was handed to the wallet',
      { expected: draft.txid, actual: view.unsignedTxid },
    )
  }

  const envelope: ListingEnvelope = { ...draft.envelope, psbt: params.signedPsbt }
  await assertOffer({
    envelope,
    role: 'seller',
    stage: 'offer',
    signer: { addresses: [envelope.maker.address, envelope.maker.receiveAddress] },
    ...(draft.satOffset === undefined ? {} : { satOffset: draft.satOffset }),
    network: draft.network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })
  return envelope
}

export interface CancelSpendParams {
  /** The listed lot. Spending it is what makes the offer unconfirmable. */
  readonly lot: SwapUtxo
  /** The seller's own address: this is a send-to-self, not a transfer. */
  readonly toAddress: string
  readonly fee: FeeChoice
  readonly funding?: readonly SwapUtxo[]
  readonly network?: Network
}

export interface CancelSpend {
  readonly psbt: string
  readonly spends: readonly string[]
  readonly valueSats: number
  readonly feeSats: number
  readonly vsize: number
}

/**
 * W4 / SPEC §8.5. The trustless cancellation: a send-to-self that spends the listed lot, after
 * which the offer PSBT can never confirm because its input no longer exists.
 *
 * A deed cancel is a request that cooperating books honour; this is the only cancellation that
 * depends on nobody's cooperation. Both exist, and a surface that presents the deed as final is
 * out of spec.
 */
export function makeCancelSpend(params: CancelSpendParams): CancelSpend {
  const network = params.network ?? networks.bitcoin
  const inputs = [params.lot, ...(params.funding ?? [])]
  const inputScripts = inputs.map((utxo) => toScript(utxo.script))
  const outputScript = toScript(addressToScript(params.toAddress, network))

  const totalIn = inputs.reduce((sum, utxo) => sum + utxo.valueSats, 0)
  const { feeSats, vsize } = resolveFee(params.fee, inputScripts, [outputScript])
  const valueSats = totalIn - feeSats
  if (valueSats < DUST_LIMIT_SATS) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_INSUFFICIENT_FUNDS,
      `a cancel spend of ${totalIn} sat cannot pay a ${feeSats} sat fee and stay above dust`,
      { totalIn, feeSats, dustLimitSats: DUST_LIMIT_SATS },
    )
  }

  const psbt = new Psbt({ network })
  for (const utxo of inputs) addInput(psbt, utxo)
  psbt.addOutput({ script: outputScript, value: valueSats })

  return {
    psbt: psbt.toBase64(),
    spends: inputs.map((utxo) => utxo.outpoint),
    valueSats,
    feeSats,
    vsize,
  }
}

function buildEnvelope(params: MakeOfferParams, psbt: string): ListingEnvelope {
  const candidate: ListingEnvelope = {
    v: 1,
    assetClass: params.assetClass,
    sighashMode: 'SINGLE_ACAP',
    lot: { location: params.lot.outpoint, priceSats: params.priceSats },
    psbt,
    maker: params.maker,
    expiresAt: params.expiresAt,
    attribution: params.attribution,
    ...(params.disclosure === undefined ? {} : { disclosure: params.disclosure }),
  }
  // Round-tripping validates every field the wire format requires, including the bitmap scope
  // disclosure, rather than trusting the caller's object shape.
  return decodeListingEnvelope(encodeListingEnvelope(candidate))
}

/**
 * SPEC §6.2. Runes get their own arrangement, not a variation on the 2-dummy one: no dummies, no
 * sat offset, and a balance the lot must match exactly. `makeRuneOffer()` is the direct entry
 * point; this adapts the shared `makeOffer()` surface onto it.
 */
async function runeDraft(params: MakeOfferParams, network: Network): Promise<OfferDraft> {
  if (params.sellAmount === undefined) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_ASSET_MISMATCH,
      'a rune listing must state sellAmount, so the lot can be checked against it (SPEC §6.2.2)',
      { lot: params.lot.outpoint },
    )
  }
  const draft = await makeRuneOffer({
    lot: params.lot,
    priceSats: params.priceSats,
    sellAmount: params.sellAmount,
    maker: params.maker,
    attribution: params.attribution,
    expiresAt: params.expiresAt,
    network,
    ...(params.receiveValueSats === undefined
      ? {}
      : { receiveValueSats: params.receiveValueSats }),
    ...(params.now === undefined ? {} : { now: params.now }),
  })
  return {
    psbt: draft.psbt,
    envelope: draft.envelope,
    txid: draft.txid,
    sellerInputIndex: draft.sellerInputIndex,
    sellerPaymentIndex: draft.sellerPaymentIndex,
    paymentValueSats: draft.paymentValueSats,
    placeholderInputs: draft.placeholderInputs,
    placeholderOutputs: draft.placeholderOutputs,
    network: draft.network,
  }
}

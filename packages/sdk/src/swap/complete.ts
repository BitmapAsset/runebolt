import { networks, Psbt } from 'bitcoinjs-lib'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../errors.js'
import type { IndexerAdapter } from '../indexer/adapter.js'
import type { ListingEnvelope } from '../types/envelope.js'
import { formatLocation, parseLocation, type Location } from '../types/location.js'
import type { AssetClass } from '../types/lot.js'
import {
  DUMMY_UTXO_MAX_VALUE,
  DUMMY_UTXO_MIN_VALUE,
  DUMMY_UTXO_VALUE,
  DUST_LIMIT_SATS,
  SELLER_SIGNATURE_INDEX,
} from './constants.js'
import { resolveFee, type FeeChoice } from './fee.js'
import { addInput, addressToScript, toScript, type Network, type SwapUtxo } from './offer.js'
import { parsePsbtView } from './psbt.js'
import { assertOffer, type SignerView, type VerifyVerdict } from './verify.js'

export interface BuyerWallet {
  /** I-7. At least two UTXOs in the 580–1000 sat band; the first two conforming ones are used. */
  readonly dummies: readonly SwapUtxo[]
  /** Spent in full — coin selection belongs to the wallet, not to the protocol builder. */
  readonly funding: readonly SwapUtxo[]
  /** Receives the asset and the two regenerated dummies. */
  readonly receiveAddress: string
  readonly changeAddress?: string
}

export interface CompleteSwapParams {
  readonly envelope: ListingEnvelope
  readonly buyer: BuyerWallet
  readonly fee: FeeChoice
  /** SPEC §6.1: optional, and it lands at index 3 so the canonical indexes 0–2 are untouched. */
  readonly platformFee?: { readonly address: string; readonly valueSats: number }
  readonly satOffset: number
  readonly network?: Network
  readonly indexer?: IndexerAdapter
  readonly now?: Date
}

export interface CompletedSwap {
  /** Buyer inputs unsigned, seller signature carried over. The buyer's wallet signs this. */
  readonly psbt: string
  /** Segwit-only, so this is also the txid of the broadcastable transaction. */
  readonly txid: string
  readonly feeSats: number
  readonly vsize: number
  readonly changeSats: number | null
  /** Derived here, cross-checked against the verifier's own simulation before returning. */
  readonly buyerDeltaSats: number
  readonly verdict: VerifyVerdict
}

const TWO_DUMMY_CLASSES = new Set<AssetClass>(['inscription', 'bitmap', 'brc20'])

/**
 * W5 / SPEC §6.1. Completes a seller-signed offer into a broadcastable swap: real buyer dummies at
 * inputs 0 and 1, the seller's signed input carried over untouched at index 2, funding after it,
 * and the buyer's outputs around the seller payment that the signature commits to.
 *
 * The seller's signature survives because it commits to exactly two things — its own input, and the
 * output at the same index. Both are preserved byte-for-byte; everything else is rebuilt.
 */
export async function completeSwap(params: CompleteSwapParams): Promise<CompletedSwap> {
  const { envelope, buyer } = params
  const network = params.network ?? networks.bitcoin

  if (!TWO_DUMMY_CLASSES.has(envelope.assetClass)) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_UNSUPPORTED_ASSET_CLASS,
      `completeSwap builds the 2-dummy layout (SPEC §6.1); ${envelope.assetClass} uses the runestone-free layout (SPEC §6.2), which lands in W7`,
      { assetClass: envelope.assetClass },
    )
  }

  // The offer as received, judged from the maker's side: every index, value and asset-set rule
  // holds regardless of who is reading, and the seller's signature state is checked here.
  await assertOffer({
    envelope,
    role: 'seller',
    stage: 'offer',
    signer: { addresses: [envelope.maker.address, envelope.maker.receiveAddress] },
    satOffset: params.satOffset,
    network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  const offer = Psbt.fromBase64(envelope.psbt, { network })
  const lot = parseLocation(envelope.lot.location)
  const sellerInput = offer.data.inputs[SELLER_SIGNATURE_INDEX]
  const sellerTxInput = offer.txInputs[SELLER_SIGNATURE_INDEX]
  const sellerPayment = offer.txOutputs[SELLER_SIGNATURE_INDEX]
  if (sellerInput === undefined || sellerTxInput === undefined || sellerPayment === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      `the offer has no input and output at the seller index ${SELLER_SIGNATURE_INDEX}`,
    )
  }

  const dummies = buyer.dummies.filter((utxo) => inDummyBand(utxo.valueSats)).slice(0, 2)
  if (dummies.length < 2) {
    throw new RuneBoltError(
      ProtocolErrorCode.E_NO_DUMMY_UTXOS,
      `a purchase needs 2 dummy UTXOs in [${DUMMY_UTXO_MIN_VALUE}, ${DUMMY_UTXO_MAX_VALUE}] sat, found ${dummies.length}`,
      { dummies: buyer.dummies.map((utxo) => utxo.valueSats) },
    )
  }
  const [dummy0, dummy1] = dummies as [SwapUtxo, SwapUtxo]

  const lotValueSats = valueOf(sellerInput, envelope)
  if (params.satOffset >= lotValueSats) {
    throw new RuneBoltError(ProtocolErrorCode.E_SAT_OFFSET, 'satOffset lies outside the lot', {
      satOffset: params.satOffset,
      lotValueSats,
    })
  }

  const receiveScript = toScript(addressToScript(buyer.receiveAddress, network))
  const changeScript = toScript(
    addressToScript(buyer.changeAddress ?? buyer.receiveAddress, network),
  )

  const inputs = [dummy0, dummy1, lotUtxo(sellerInput, lot, lotValueSats), ...buyer.funding]
  const inputScripts = inputs.map((utxo) => toScript(utxo.script))
  const totalInSats = inputs.reduce((sum, utxo) => sum + utxo.valueSats, 0)

  const fixed = [
    // I-5: both dummies plus the sat offset, which lands the inscribed sat at offset 0 of output 1.
    { script: receiveScript, value: dummy0.valueSats + dummy1.valueSats + params.satOffset },
    { script: receiveScript, value: lotValueSats },
    { script: Buffer.from(sellerPayment.script), value: sellerPayment.value },
    ...(params.platformFee === undefined
      ? []
      : [
          {
            script: toScript(addressToScript(params.platformFee.address, network)),
            value: params.platformFee.valueSats,
          },
        ]),
    // I-8: the buyer must leave the swap able to buy again.
    { script: receiveScript, value: DUMMY_UTXO_VALUE },
    { script: receiveScript, value: DUMMY_UTXO_VALUE },
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
    // A dust change output costs more to spend than it is worth, so it becomes fee instead.
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
  addInput(psbt, dummy0)
  addInput(psbt, dummy1)
  psbt.addInput({
    hash: Buffer.from(sellerTxInput.hash),
    index: sellerTxInput.index,
    ...(sellerTxInput.sequence === undefined ? {} : { sequence: sellerTxInput.sequence }),
    ...signatureFields(sellerInput),
  })
  for (const utxo of buyer.funding) addInput(psbt, utxo)
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
    outpoints: [dummy0, dummy1, ...buyer.funding].map((utxo) => utxo.outpoint),
  }
  const verdict = await assertOffer({
    envelope,
    psbt: completed,
    role: 'buyer',
    stage: 'offer',
    signer: buyerView,
    satOffset: params.satOffset,
    network,
    ...(params.indexer === undefined ? {} : { indexer: params.indexer }),
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  // Two independent derivations of the same number: this builder's arithmetic, and the verifier's
  // simulation of the transaction against the buyer's wallet. Disagreement means one of them is
  // wrong about where the money went, which is not a difference to paper over.
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

export interface FinalizeSwapParams {
  readonly envelope: ListingEnvelope
  /** The completed swap with every buyer input signed. */
  readonly psbt: string
  readonly buyer: SignerView
  readonly satOffset: number
  readonly network?: Network
  readonly now?: Date
}

export interface FinalSwap {
  readonly txHex: string
  readonly txid: string
  readonly vsize: number
  readonly feeSats: number
}

/**
 * W5. The last gate before the network. It re-runs the full checklist at stage `final` — nothing
 * is finalized on the strength of having been verified earlier, because the PSBT went through a
 * wallet in between.
 */
export async function finalizeSwap(params: FinalizeSwapParams): Promise<FinalSwap> {
  const network = params.network ?? networks.bitcoin
  await assertOffer({
    envelope: params.envelope,
    psbt: params.psbt,
    role: 'buyer',
    stage: 'final',
    signer: params.buyer,
    satOffset: params.satOffset,
    network,
    ...(params.now === undefined ? {} : { now: params.now }),
  })

  const psbt = Psbt.fromBase64(params.psbt, { network })
  psbt.finalizeAllInputs()
  const tx = psbt.extractTransaction()
  const view = parsePsbtView(params.psbt, network)
  return { txHex: tx.toHex(), txid: tx.getId(), vsize: tx.virtualSize(), feeSats: view.feeSats }
}

type PsbtInputData = Psbt['data']['inputs'][number]

function signatureFields(input: PsbtInputData): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (input.witnessUtxo !== undefined) fields['witnessUtxo'] = input.witnessUtxo
  if (input.nonWitnessUtxo !== undefined) fields['nonWitnessUtxo'] = input.nonWitnessUtxo
  if (input.sighashType !== undefined) fields['sighashType'] = input.sighashType
  if (input.partialSig !== undefined) fields['partialSig'] = input.partialSig
  if (input.tapKeySig !== undefined) fields['tapKeySig'] = input.tapKeySig
  if (input.tapScriptSig !== undefined) fields['tapScriptSig'] = input.tapScriptSig
  if (input.tapLeafScript !== undefined) fields['tapLeafScript'] = input.tapLeafScript
  if (input.tapInternalKey !== undefined) fields['tapInternalKey'] = input.tapInternalKey
  if (input.tapMerkleRoot !== undefined) fields['tapMerkleRoot'] = input.tapMerkleRoot
  if (input.redeemScript !== undefined) fields['redeemScript'] = input.redeemScript
  if (input.witnessScript !== undefined) fields['witnessScript'] = input.witnessScript
  if (input.finalScriptSig !== undefined) fields['finalScriptSig'] = input.finalScriptSig
  if (input.finalScriptWitness !== undefined) fields['finalScriptWitness'] = input.finalScriptWitness
  return fields
}

function lotUtxo(input: PsbtInputData, lot: Location, valueSats: number): SwapUtxo {
  const script = input.witnessUtxo?.script
  if (script === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      'the seller input carries no witnessUtxo',
    )
  }
  return { outpoint: formatLocation(lot), valueSats, script: Uint8Array.from(script) }
}

function valueOf(input: PsbtInputData, envelope: ListingEnvelope): number {
  const value = input.witnessUtxo?.value
  if (value === undefined) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      'the seller input carries no witnessUtxo value',
      { lot: envelope.lot.location },
    )
  }
  return value
}

function inDummyBand(valueSats: number): boolean {
  return valueSats >= DUMMY_UTXO_MIN_VALUE && valueSats <= DUMMY_UTXO_MAX_VALUE
}

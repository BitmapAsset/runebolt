import { Psbt } from 'bitcoinjs-lib'
import { makeOffer, sealOffer, type MakeOfferParams, type OfferDraft, type SwapUtxo } from '../../src/swap/offer.js'
import { SIGHASH_SINGLE_ANYONECANPAY } from '../../src/swap/constants.js'
import type { ListingEnvelope } from '../../src/types/envelope.js'
import {
  BUYER,
  NETWORK,
  NOW,
  SELLER,
  SELLER_PAYOUT,
  attribution,
  inscriptionContents,
  type Party,
} from './swap.js'

/** W4/W5 fixtures: a real seller-signed offer, and the buyer wallet that completes it. */

export const LOT_OUTPOINT = `${'a3'.repeat(32)}:0`
export const LOT_VALUE_SATS = 10_000
export const SAT_OFFSET_SATS = 5_000
export const PRICE_SATS = 250_000

export function utxo(seed: string, valueSats: number, owner: Party, vout = 0): SwapUtxo {
  return { outpoint: `${seed.repeat(32)}:${vout}`, valueSats, script: owner.script }
}

export function offerParams(overrides: Partial<MakeOfferParams> = {}): MakeOfferParams {
  return {
    assetClass: 'inscription',
    lot: { outpoint: LOT_OUTPOINT, valueSats: LOT_VALUE_SATS, script: SELLER.script },
    priceSats: PRICE_SATS,
    satOffset: SAT_OFFSET_SATS,
    maker: {
      address: SELLER.address,
      publicKey: SELLER.publicKeyHex,
      receiveAddress: SELLER_PAYOUT.address,
    },
    attribution: attribution(inscriptionContents()),
    expiresAt: '2030-01-01T00:00:00Z',
    network: NETWORK,
    now: NOW,
    ...overrides,
  }
}

/**
 * What the seller's wallet does: sign input 2, and only input 2. A non-default `sighashType`
 * overwrites the draft's request, which is exactly the wallet behaviour I-19 exists to catch —
 * bip174 refuses to overwrite the field, so the fixture sets it directly.
 */
export function sellerSign(draft: OfferDraft, sighashType = SIGHASH_SINGLE_ANYONECANPAY): string {
  const psbt = Psbt.fromBase64(draft.psbt, { network: NETWORK })
  const input = psbt.data.inputs[draft.sellerInputIndex]
  if (input === undefined) throw new Error('draft has no seller input')
  input.sighashType = sighashType
  psbt.signInput(draft.sellerInputIndex, SELLER.keyPair, [sighashType])
  return psbt.toBase64()
}

export async function sealedOffer(
  overrides: Partial<MakeOfferParams> = {},
): Promise<{ draft: OfferDraft; envelope: ListingEnvelope }> {
  const draft = await makeOffer(offerParams(overrides))
  const envelope = await sealOffer({ draft, signedPsbt: sellerSign(draft), now: NOW })
  return { draft, envelope }
}

export const LOT_SATPOINT = `${LOT_OUTPOINT}:${SAT_OFFSET_SATS}`

/**
 * The same lot listed by satpoint (SPEC §3): the location carries the offset and no separate
 * `satOffset` is passed anywhere, so every consumer has to read it off the location.
 */
export function satpointOfferParams(): MakeOfferParams {
  const params = offerParams()
  return {
    assetClass: params.assetClass,
    lot: { outpoint: LOT_SATPOINT, valueSats: LOT_VALUE_SATS, script: SELLER.script },
    priceSats: params.priceSats,
    maker: params.maker,
    attribution: params.attribution,
    expiresAt: params.expiresAt,
    network: NETWORK,
    now: NOW,
  }
}

export async function sealedSatpointOffer(): Promise<{
  draft: OfferDraft
  envelope: ListingEnvelope
}> {
  const draft = await makeOffer(satpointOfferParams())
  const envelope = await sealOffer({ draft, signedPsbt: sellerSign(draft), now: NOW })
  return { draft, envelope }
}

export function buyerWallet(overrides: { dummies?: SwapUtxo[]; funding?: SwapUtxo[] } = {}) {
  return {
    dummies: overrides.dummies ?? [utxo('b1', 600, BUYER), utxo('b2', 600, BUYER)],
    funding: overrides.funding ?? [utxo('b3', 400_000, BUYER)],
    receiveAddress: BUYER.address,
  }
}

export const BUYER_SIGNER = { addresses: [BUYER.address] }

import ecc from '@bitcoinerlab/secp256k1'
import { Psbt } from 'bitcoinjs-lib'
import { describe, expect, it } from 'vitest'
import { ImplementationErrorCode, ProtocolErrorCode } from '../src/errors.js'
import { DUMMY_UTXO_VALUE, SELLER_SIGNATURE_INDEX } from '../src/swap/constants.js'
import { completeSwap, finalizeSwap, type BuyerWallet } from '../src/swap/complete.js'
import { parsePsbtView } from '../src/swap/psbt.js'
import { verifyOffer } from '../src/swap/verify.js'
import {
  BUYER_SIGNER,
  LOT_VALUE_SATS,
  PRICE_SATS,
  SAT_OFFSET_SATS,
  buyerWallet,
  sealedOffer,
  utxo,
} from './helpers/build.js'
import { buyerSign } from './helpers/sign.js'
import { BUYER, NETWORK, NOW, SELLER_PAYOUT, THIRD_PARTY } from './helpers/swap.js'

/**
 * W5. The buyer's half. The load-bearing claim is that rebuilding the transaction around the
 * seller's signed input leaves that signature valid — `SIGHASH_SINGLE|ANYONECANPAY` commits to the
 * seller's input and to the output at the same index, and to nothing else.
 */

const base = { network: NETWORK, now: NOW } as const

function validator(pubkey: Buffer, msghash: Buffer, signature: Buffer): boolean {
  return ecc.verify(msghash, pubkey, signature)
}

async function completed(overrides: Partial<BuyerWallet> = {}) {
  const { envelope } = await sealedOffer()
  const swap = await completeSwap({
    ...base,
    envelope,
    buyer: { ...buyerWallet(), ...overrides },
    fee: { rateSatPerVb: 5 },
    satOffset: SAT_OFFSET_SATS,
  })
  return { envelope, swap }
}

describe('completeSwap produces a broadcastable swap', () => {
  it('keeps the seller signature valid across the rebuild', async () => {
    const { swap } = await completed()
    const psbt = Psbt.fromBase64(swap.psbt, { network: NETWORK })
    expect(psbt.validateSignaturesOfInput(SELLER_SIGNATURE_INDEX, validator)).toBe(true)
  })

  it('preserves the seller payment at index 2 byte-for-byte', async () => {
    const { envelope, swap } = await completed()
    const offer = parsePsbtView(envelope.psbt, NETWORK)
    const final = parsePsbtView(swap.psbt, NETWORK)
    expect(final.outputs[SELLER_SIGNATURE_INDEX]?.address).toBe(SELLER_PAYOUT.address)
    expect(final.outputs[SELLER_SIGNATURE_INDEX]?.valueSats).toBe(
      offer.outputs[SELLER_SIGNATURE_INDEX]?.valueSats,
    )
    expect(final.inputs[SELLER_SIGNATURE_INDEX]?.outpoint).toBe(
      offer.inputs[SELLER_SIGNATURE_INDEX]?.outpoint,
    )
  })

  it('replaces every placeholder with the real buyer', async () => {
    const { swap } = await completed()
    const view = parsePsbtView(swap.psbt, NETWORK)
    const buyerOutputs = view.outputs.filter((output) => output.address === BUYER.address)
    expect(buyerOutputs.length).toBe(view.outputs.length - 1)
    expect(view.outputs[1]?.valueSats).toBe(LOT_VALUE_SATS)
    expect(view.outputs[0]?.valueSats).toBe(DUMMY_UTXO_VALUE * 2 + SAT_OFFSET_SATS)
  })

  it('regenerates two dummies for the buyer (I-8)', async () => {
    const { swap } = await completed()
    const view = parsePsbtView(swap.psbt, NETWORK)
    const fresh = view.outputs.slice(3).filter((output) => output.valueSats === DUMMY_UTXO_VALUE)
    expect(fresh).toHaveLength(2)
  })

  it('re-verifies as a completed swap', async () => {
    const { envelope, swap } = await completed()
    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt: swap.psbt,
      role: 'buyer',
      stage: 'offer',
      signer: BUYER_SIGNER,
      satOffset: SAT_OFFSET_SATS,
    })
    expect(verdict.errors).toEqual([])
    expect(swap.verdict.ok).toBe(true)
  })
})

describe('the buyer delta matches the verifier derivation exactly', () => {
  it('is price + fee, with no tolerance', async () => {
    const { swap } = await completed()
    expect(swap.buyerDeltaSats).toBe(-(PRICE_SATS + swap.feeSats))
    expect(swap.verdict.netDeltaSats).toBe(swap.buyerDeltaSats)
    expect(swap.verdict.expectedDeltaSats).toBe(swap.buyerDeltaSats)
  })

  it('holds across fee rates', async () => {
    const { envelope } = await sealedOffer()
    for (const rateSatPerVb of [1, 2, 7, 25, 100]) {
      const swap = await completeSwap({
        ...base,
        envelope,
        buyer: buyerWallet(),
        fee: { rateSatPerVb },
        satOffset: SAT_OFFSET_SATS,
      })
      expect(swap.buyerDeltaSats).toBe(-(PRICE_SATS + swap.feeSats))
      expect(swap.verdict.netDeltaSats).toBe(swap.buyerDeltaSats)
      expect(swap.feeSats).toBe(Math.ceil(swap.vsize * rateSatPerVb))
    }
  })

  it('counts a platform fee as the buyer paying it, not the seller', async () => {
    const { envelope } = await sealedOffer()
    const platformFee = { address: THIRD_PARTY.address, valueSats: 12_500 }
    const swap = await completeSwap({
      ...base,
      envelope,
      buyer: buyerWallet(),
      fee: { totalSats: 3_000 },
      platformFee,
      satOffset: SAT_OFFSET_SATS,
    })
    expect(swap.buyerDeltaSats).toBe(-(PRICE_SATS + 3_000 + platformFee.valueSats))
    expect(swap.verdict.netDeltaSats).toBe(swap.buyerDeltaSats)
    const view = parsePsbtView(swap.psbt, NETWORK)
    expect(view.outputs[3]?.address).toBe(THIRD_PARTY.address)
  })

  it('turns dust change into fee rather than emitting an unspendable output', async () => {
    const { envelope } = await sealedOffer()
    // Funding chosen so the change output would land at 331 sat — under the dust limit, over the
    // fee the transaction still owes once that output is dropped.
    const swap = await completeSwap({
      ...base,
      envelope,
      buyer: buyerWallet({ funding: [utxo('b4', 267_000, BUYER)] }),
      fee: { rateSatPerVb: 1 },
      satOffset: SAT_OFFSET_SATS,
    })
    expect(swap.changeSats).toBeNull()
    expect(parsePsbtView(swap.psbt, NETWORK).outputs).toHaveLength(5)
    expect(swap.buyerDeltaSats).toBe(-(PRICE_SATS + swap.feeSats))
  })
})

describe('completeSwap refuses what it cannot build safely', () => {
  it('rejects a buyer without two conforming dummies (I-7)', async () => {
    const { envelope } = await sealedOffer()
    await expect(
      completeSwap({
        ...base,
        envelope,
        buyer: buyerWallet({ dummies: [utxo('b1', 600, BUYER), utxo('b2', 5_000, BUYER)] }),
        fee: { rateSatPerVb: 5 },
        satOffset: SAT_OFFSET_SATS,
      }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_NO_DUMMY_UTXOS })
  })

  it('rejects funding that cannot cover the price and the fee', async () => {
    const { envelope } = await sealedOffer()
    await expect(
      completeSwap({
        ...base,
        envelope,
        buyer: buyerWallet({ funding: [utxo('b5', 50_000, BUYER)] }),
        fee: { rateSatPerVb: 5 },
        satOffset: SAT_OFFSET_SATS,
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_INSUFFICIENT_FUNDS })
  })

  it('rejects an expired offer at buy time (I-18)', async () => {
    const { envelope } = await sealedOffer({ expiresAt: '2026-07-27T00:00:00Z' })
    await expect(
      completeSwap({
        ...base,
        now: new Date('2026-07-28T00:00:00Z'),
        envelope,
        buyer: buyerWallet(),
        fee: { rateSatPerVb: 5 },
        satOffset: SAT_OFFSET_SATS,
      }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_EXPIRED })
  })

  // Runes route to the runestone-free builder (SPEC §6.2) rather than being refused outright, so
  // an inscription lot relabelled as a rune is now caught on its contents instead of its label.
  it('rejects an inscription lot relabelled as a rune', async () => {
    const { envelope } = await sealedOffer()
    await expect(
      completeSwap({
        ...base,
        envelope: { ...envelope, assetClass: 'rune' },
        buyer: buyerWallet(),
        fee: { rateSatPerVb: 5 },
        satOffset: SAT_OFFSET_SATS,
      }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_ASSET_MISMATCH })
  })
})

describe('finalizeSwap', () => {
  it('extracts a broadcastable transaction with the txid the buyer already verified', async () => {
    const { envelope, swap } = await completed()
    const signed = buyerSign(swap.psbt)
    const final = await finalizeSwap({
      ...base,
      envelope,
      psbt: signed,
      buyer: BUYER_SIGNER,
      satOffset: SAT_OFFSET_SATS,
    })
    expect(final.txid).toBe(swap.txid)
    expect(final.txHex).toMatch(/^[0-9a-f]+$/)
    expect(final.feeSats).toBe(swap.feeSats)
    expect(final.vsize).toBeLessThanOrEqual(swap.vsize)
  })

  it('refuses a swap the buyer has not finished signing', async () => {
    const { envelope, swap } = await completed()
    await expect(
      finalizeSwap({
        ...base,
        envelope,
        psbt: swap.psbt,
        buyer: BUYER_SIGNER,
        satOffset: SAT_OFFSET_SATS,
      }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_SIGNATURE_STATE })
  })
})

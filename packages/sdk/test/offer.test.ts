import { Psbt } from 'bitcoinjs-lib'
import { describe, expect, it } from 'vitest'
import { ImplementationErrorCode, ProtocolErrorCode, RuneBoltError } from '../src/errors.js'
import {
  DUMMY_UTXO_VALUE,
  SELLER_SIGNATURE_INDEX,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '../src/swap/constants.js'
import { makeCancelSpend, makeOffer, sealOffer } from '../src/swap/offer.js'
import {
  isPlaceholderOutpoint,
  isPlaceholderScript,
  placeholderAddress,
} from '../src/swap/placeholder.js'
import { parsePsbtView } from '../src/swap/psbt.js'
import { verifyOffer } from '../src/swap/verify.js'
import { runeContents } from './helpers/swap.js'
import {
  LOT_OUTPOINT,
  LOT_VALUE_SATS,
  PRICE_SATS,
  SAT_OFFSET_SATS,
  offerParams,
  sealedOffer,
  sellerSign,
  utxo,
} from './helpers/build.js'
import { NETWORK, NOW, SELLER, SELLER_PAYOUT } from './helpers/swap.js'

/**
 * W4. The merge gate: every offer `makeOffer()` produces passes `verifyOffer()`, and every offer
 * built wrong is refused. `makeOffer()` asserts this itself, so these tests prove the assertion is
 * load-bearing rather than decorative.
 */

const base = { network: NETWORK, now: NOW } as const
const SELLER_SIGNER = { addresses: [SELLER.address, SELLER_PAYOUT.address] }

describe('makeOffer builds the canonical 2-dummy arrangement', () => {
  it('places the seller input and payment at index 2, with the postage added back', async () => {
    const draft = await makeOffer(offerParams())
    const view = parsePsbtView(draft.psbt, NETWORK)

    expect(view.inputs).toHaveLength(4)
    expect(view.outputs).toHaveLength(6)
    expect(view.inputs[SELLER_SIGNATURE_INDEX]?.outpoint).toBe(LOT_OUTPOINT)
    expect(view.outputs[SELLER_SIGNATURE_INDEX]?.address).toBe(SELLER_PAYOUT.address)
    expect(view.outputs[SELLER_SIGNATURE_INDEX]?.valueSats).toBe(PRICE_SATS + LOT_VALUE_SATS)
    expect(draft.paymentValueSats).toBe(PRICE_SATS + LOT_VALUE_SATS)
  })

  it('carries the sat offset in output 0 so the inscription lands at offset 0 of output 1', async () => {
    const draft = await makeOffer(offerParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    expect(view.outputs[0]?.valueSats).toBe(DUMMY_UTXO_VALUE * 2 + SAT_OFFSET_SATS)
    expect(view.outputs[1]?.valueSats).toBe(LOT_VALUE_SATS)
  })

  it('regenerates two dummies, so a buyer can buy again', async () => {
    const draft = await makeOffer(offerParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    const regenerated = view.outputs.slice(3).filter((o) => o.valueSats === DUMMY_UTXO_VALUE)
    expect(regenerated).toHaveLength(2)
  })

  it('stands the buyer in with recognisable placeholders and nothing else', async () => {
    const draft = await makeOffer(offerParams())
    const view = parsePsbtView(draft.psbt, NETWORK)

    expect(draft.placeholderInputs).toEqual([0, 1, 3])
    expect(draft.placeholderOutputs).toEqual([0, 1, 3, 4, 5])
    for (const index of draft.placeholderInputs) {
      const input = view.inputs[index]
      expect(isPlaceholderScript(input?.script ?? new Uint8Array())).toBe(true)
      expect(isPlaceholderOutpoint(input?.outpoint ?? '')).toBe(true)
    }
    for (const index of draft.placeholderOutputs) {
      expect(isPlaceholderScript(view.outputs[index]?.script ?? new Uint8Array())).toBe(true)
    }
    // The seller's two indexes are the only ones that are not a placeholder.
    expect(isPlaceholderScript(view.inputs[SELLER_SIGNATURE_INDEX]?.script ?? new Uint8Array())).toBe(
      false,
    )
    expect(
      isPlaceholderScript(view.outputs[SELLER_SIGNATURE_INDEX]?.script ?? new Uint8Array()),
    ).toBe(false)
  })

  it('leaves the PSBT unsigned: the SDK holds no keys', async () => {
    const draft = await makeOffer(offerParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    expect(view.inputs.every((input) => !input.signed)).toBe(true)
    expect(view.inputs[SELLER_SIGNATURE_INDEX]?.sighashType).toBe(SIGHASH_SINGLE_ANYONECANPAY)
  })
})

describe('every offer makeOffer produces passes verifyOffer', () => {
  it('the unsigned draft verifies for the seller who is about to sign it', async () => {
    const draft = await makeOffer(offerParams())
    const verdict = await verifyOffer({
      ...base,
      envelope: draft.envelope,
      role: 'seller',
      stage: 'draft',
      signer: SELLER_SIGNER,
      satOffset: SAT_OFFSET_SATS,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(PRICE_SATS)
  })

  it('the sealed offer verifies for the seller who signed it', async () => {
    const { envelope } = await sealedOffer()
    const verdict = await verifyOffer({
      ...base,
      envelope,
      role: 'seller',
      stage: 'offer',
      signer: SELLER_SIGNER,
      satOffset: SAT_OFFSET_SATS,
    })
    expect(verdict.errors).toEqual([])
  })

  it('the placeholder arrangement is a structurally complete swap, not a stub', async () => {
    const { envelope } = await sealedOffer()
    const verdict = await verifyOffer({
      ...base,
      envelope,
      role: 'buyer',
      stage: 'offer',
      signer: { addresses: [placeholderAddress(NETWORK)] },
      satOffset: SAT_OFFSET_SATS,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(verdict.expectedDeltaSats)
  })

  it('round-trips through the wire format', async () => {
    const { envelope } = await sealedOffer()
    expect(envelope.psbt).not.toBe('')
    expect(Psbt.fromBase64(envelope.psbt, { network: NETWORK }).txInputs).toHaveLength(4)
  })

  it('a bitmap offer carries its scope disclosure', async () => {
    const { envelope } = await sealedOffer({
      assetClass: 'bitmap',
      disclosure: {
        districtInscriptionId:
          '617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0',
        parcelsIncluded: false,
        contentLibraryIncluded: false,
      },
    })
    expect(envelope.disclosure?.parcelsIncluded).toBe(false)
  })
})

describe('mis-built offers are refused', () => {
  async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
    await expect(promise).rejects.toMatchObject({ code })
  }

  it('a rune lot is refused rather than built in the wrong layout', async () => {
    await expectCode(
      makeOffer(offerParams({ assetClass: 'rune', attribution: { ...offerParams().attribution, contents: runeContents() } })),
      ImplementationErrorCode.E_UNSUPPORTED_ASSET_CLASS,
    )
  })

  it('a sat offset outside the lot is refused', async () => {
    await expectCode(
      makeOffer(offerParams({ satOffset: LOT_VALUE_SATS })),
      ImplementationErrorCode.E_MALFORMED_PSBT,
    )
  })

  // A satpoint lot location is spec-legal and now supported end to end; see satpoint.test.ts.
  it('a satpoint that contradicts the passed satOffset is refused, not silently resolved', async () => {
    await expectCode(
      makeOffer(
        offerParams({
          lot: { outpoint: `${LOT_OUTPOINT}:5000`, valueSats: LOT_VALUE_SATS, script: SELLER.script },
          satOffset: 4_000,
        }),
      ),
      ImplementationErrorCode.E_MALFORMED_LOCATION,
    )
  })

  it('a mixed UTXO is refused at listing time (I-3)', async () => {
    const params = offerParams()
    await expectCode(
      makeOffer(
        offerParams({
          attribution: {
            ...params.attribution,
            contents: {
              inscriptions: params.attribution.contents.inscriptions,
              runes: runeContents().runes,
              brc20: [],
            },
          },
        }),
      ),
      ProtocolErrorCode.E_MIXED_UTXO,
    )
  })

  it('an already-expired listing is refused', async () => {
    await expectCode(
      makeOffer(offerParams({ expiresAt: '2026-07-25T00:00:00Z' })),
      ProtocolErrorCode.E_EXPIRED,
    )
  })

  it('a wallet that returns a different transaction is caught (I-4 by way of the txid)', async () => {
    const draft = await makeOffer(offerParams())
    const mutated = Psbt.fromBase64(sellerSign(draft), { network: NETWORK })
    const tampered = new Psbt({ network: NETWORK })
    for (const input of mutated.txInputs) {
      tampered.addInput({
        hash: Buffer.from(input.hash),
        index: input.index,
        witnessUtxo: { script: SELLER.script, value: 1_000 },
      })
    }
    for (const output of mutated.txOutputs) {
      tampered.addOutput({ script: Buffer.from(output.script), value: output.value })
    }
    tampered.addOutput({ script: SELLER.script, value: 500 })
    await expectCode(
      sealOffer({ draft, signedPsbt: tampered.toBase64(), now: NOW }),
      ImplementationErrorCode.E_OFFER_MUTATED,
    )
  })

  it('a seller signature at the wrong sighash is caught by its own error code (I-19)', async () => {
    const draft = await makeOffer(offerParams())
    await expectCode(
      sealOffer({ draft, signedPsbt: sellerSign(draft, 0x01), now: NOW }),
      ProtocolErrorCode.E_SIGHASH_MISMATCH,
    )
  })

  it('an unsigned PSBT is not sealable as an offer', async () => {
    const draft = await makeOffer(offerParams())
    await expectCode(
      sealOffer({ draft, signedPsbt: draft.psbt, now: NOW }),
      ProtocolErrorCode.E_SIGNATURE_STATE,
    )
  })
})

describe('trustless cancel — send-to-self (SPEC §8.5)', () => {
  it('spends the listed lot, which is what makes the offer unconfirmable', async () => {
    const { envelope } = await sealedOffer()
    const cancel = makeCancelSpend({
      lot: { outpoint: LOT_OUTPOINT, valueSats: LOT_VALUE_SATS, script: SELLER.script },
      toAddress: SELLER.address,
      fee: { rateSatPerVb: 4 },
      network: NETWORK,
    })

    const offerView = parsePsbtView(envelope.psbt, NETWORK)
    const cancelView = parsePsbtView(cancel.psbt, NETWORK)
    expect(cancel.spends).toEqual([LOT_OUTPOINT])
    expect(cancelView.inputs.map((i) => i.outpoint)).toContain(
      offerView.inputs[SELLER_SIGNATURE_INDEX]?.outpoint,
    )
    expect(cancelView.outputs).toHaveLength(1)
    expect(cancelView.outputs[0]?.address).toBe(SELLER.address)
    expect(cancel.valueSats).toBe(LOT_VALUE_SATS - cancel.feeSats)
  })

  it('accepts funding when the lot cannot pay its own fee', () => {
    const cancel = makeCancelSpend({
      lot: { outpoint: LOT_OUTPOINT, valueSats: 546, script: SELLER.script },
      toAddress: SELLER.address,
      funding: [utxo('c1', 20_000, SELLER)],
      fee: { rateSatPerVb: 10 },
      network: NETWORK,
    })
    expect(cancel.spends).toHaveLength(2)
    expect(cancel.valueSats).toBeGreaterThan(546)
  })

  it('refuses to build a cancel that cannot pay its fee', () => {
    expect(() =>
      makeCancelSpend({
        lot: { outpoint: LOT_OUTPOINT, valueSats: 546, script: SELLER.script },
        toAddress: SELLER.address,
        fee: { rateSatPerVb: 20 },
        network: NETWORK,
      }),
    ).toThrow(RuneBoltError)
  })
})

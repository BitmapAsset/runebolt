import { describe, expect, it } from 'vitest'
import { ImplementationErrorCode, ProtocolErrorCode } from '../src/errors.js'
import { completeSwap, finalizeSwap } from '../src/swap/complete.js'
import { makeOffer } from '../src/swap/offer.js'
import { parsePsbtView } from '../src/swap/psbt.js'
import { verifyOffer, type VerifyVerdict } from '../src/swap/verify.js'
import {
  BUYER_SIGNER,
  LOT_OUTPOINT,
  LOT_SATPOINT,
  LOT_VALUE_SATS,
  PRICE_SATS,
  SAT_OFFSET_SATS,
  buyerWallet,
  offerParams,
  satpointOfferParams,
  sealedSatpointOffer,
} from './helpers/build.js'
import { SAT_OFFSET, twoDummyScenario } from './helpers/scenarios.js'
import { BUYER, NETWORK, NOW, SELLER, SELLER_VIEW } from './helpers/swap.js'
import { buyerSign } from './helpers/sign.js'

/**
 * A lot location is `txid:vout[:offset]` (SPEC §3). The third field names a sat *inside* the
 * output; it is not part of the outpoint an input spends. Comparing the formatted location against
 * a PSBT outpoint therefore made every spec-legal satpoint listing look like an asset mismatch —
 * a false E_ASSET_MISMATCH on a valid offer, in the safety core.
 */

const base = { network: NETWORK, now: NOW } as const

function codes(verdict: VerifyVerdict): string[] {
  return verdict.errors.map((error) => error.code)
}

describe('a satpoint lot location matches the outpoint it names', () => {
  it('verifies with the offset read off the location and no separate satOffset', async () => {
    const scenario = twoDummyScenario({
      lotLocation: `${'a3'.repeat(32)}:0:${SAT_OFFSET}`,
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(scenario.envelope.lot.priceSats)
  })

  it('still verifies when the caller passes the same offset explicitly', async () => {
    const scenario = twoDummyScenario({
      lotLocation: `${'a3'.repeat(32)}:0:${SAT_OFFSET}`,
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expect(verdict.errors).toEqual([])
  })
})

describe('the lot check still bites — a satpoint is not a wildcard', () => {
  it('rejects a satpoint naming a different vout of the same transaction', async () => {
    const scenario = twoDummyScenario({
      lotLocation: `${'a3'.repeat(32)}:7:${SAT_OFFSET}`,
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expect(codes(verdict)).toContain(ProtocolErrorCode.E_ASSET_MISMATCH)
    expect(verdict.ok).toBe(false)
  })

  it('rejects a satpoint naming a different transaction', async () => {
    const scenario = twoDummyScenario({
      lotLocation: `${'ee'.repeat(32)}:0:${SAT_OFFSET}`,
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expect(codes(verdict)).toContain(ProtocolErrorCode.E_ASSET_MISMATCH)
  })

  it('refuses two sources of truth that disagree rather than picking one (I-5)', async () => {
    const scenario = twoDummyScenario({
      lotLocation: `${'a3'.repeat(32)}:0:${SAT_OFFSET}`,
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      // The location says the inscribed sat is at 5,000. A caller claiming 1 routes it elsewhere,
      // and preferring either source silently picks a winner.
      satOffset: 1,
    })
    expect(codes(verdict)).toContain(ProtocolErrorCode.E_SAT_OFFSET)
    expect(verdict.errors.map((error) => error.invariant)).toContain('I-5')
  })
})

describe('a satpoint listing works end to end', () => {
  it('builds, seals, completes and finalizes with the offset never passed by hand', async () => {
    const { draft, envelope } = await sealedSatpointOffer()
    expect(envelope.lot.location).toBe(LOT_SATPOINT)
    expect(draft.satOffset).toBe(SAT_OFFSET_SATS)

    const swap = await completeSwap({
      ...base,
      envelope,
      buyer: buyerWallet(),
      fee: { rateSatPerVb: 5 },
    })
    expect(swap.verdict.ok).toBe(true)
    expect(swap.buyerDeltaSats).toBe(-(PRICE_SATS + swap.feeSats))

    const view = parsePsbtView(swap.psbt, NETWORK)
    // I-5 held without anyone restating the offset: output 0 recombines both dummies plus it.
    expect(view.outputs[0]?.valueSats).toBe(600 * 2 + SAT_OFFSET_SATS)
    expect(view.outputs[1]?.valueSats).toBe(LOT_VALUE_SATS)
    expect(view.inputs[2]?.outpoint).toBe(LOT_OUTPOINT)

    const final = await finalizeSwap({
      ...base,
      envelope,
      psbt: buyerSign(swap.psbt),
      buyer: BUYER_SIGNER,
    })
    expect(final.txid).toBe(swap.txid)
  })

  it('the buyer verifying the completed swap sees no asset mismatch', async () => {
    const { envelope } = await sealedSatpointOffer()
    const swap = await completeSwap({
      ...base,
      envelope,
      buyer: buyerWallet(),
      fee: { rateSatPerVb: 5 },
    })
    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt: swap.psbt,
      role: 'buyer',
      stage: 'offer',
      signer: { addresses: [BUYER.address] },
    })
    expect(verdict.errors).toEqual([])
  })
})

describe('makeOffer and the satpoint', () => {
  it('accepts a satpoint lot location instead of rejecting it', async () => {
    const draft = await makeOffer(satpointOfferParams())
    expect(draft.envelope.lot.location).toBe(LOT_SATPOINT)
    expect(parsePsbtView(draft.psbt, NETWORK).inputs[2]?.outpoint).toBe(LOT_OUTPOINT)
  })

  it('refuses a satOffset that disagrees with the location', async () => {
    await expect(
      makeOffer({ ...satpointOfferParams(), satOffset: 1 }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_MALFORMED_LOCATION })
  })

  it('refuses a bare outpoint with no offset rather than assuming zero', async () => {
    const params = offerParams()
    await expect(
      makeOffer({
        assetClass: params.assetClass,
        lot: { outpoint: LOT_OUTPOINT, valueSats: LOT_VALUE_SATS, script: SELLER.script },
        priceSats: params.priceSats,
        maker: params.maker,
        attribution: params.attribution,
        expiresAt: params.expiresAt,
        network: NETWORK,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_MALFORMED_LOCATION })
  })

  it('refuses a location whose offset lies outside the lot', async () => {
    await expect(
      makeOffer({
        ...satpointOfferParams(),
        lot: {
          outpoint: `${LOT_OUTPOINT}:${LOT_VALUE_SATS}`,
          valueSats: LOT_VALUE_SATS,
          script: SELLER.script,
        },
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_MALFORMED_PSBT })
  })
})

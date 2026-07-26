import { describe, expect, it } from 'vitest'
import { verifyOffer } from '../src/swap/verify.js'
import { NETWORK, BUYER_VIEW, NOW, SELLER_VIEW } from './helpers/swap.js'
import { runeScenario, twoDummyScenario } from './helpers/scenarios.js'

const base = { network: NETWORK, now: NOW } as const

describe('verifyOffer accepts conforming swaps', () => {
  it('2-dummy layout, seller about to sign', async () => {
    const scenario = twoDummyScenario()
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: 5000,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.ok).toBe(true)
    expect(verdict.netDeltaSats).toBe(scenario.envelope.lot.priceSats)
    expect(verdict.unsignedTxid).toMatch(/^[0-9a-f]{64}$/)
    expect(verdict.diff).toContain('net balance')
  })

  it('2-dummy layout, buyer about to sign a seller-signed offer', async () => {
    const scenario = twoDummyScenario({ signers: ['seller'] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
      satOffset: 5000,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(verdict.expectedDeltaSats)
  })

  it('rune layout, seller about to sign', async () => {
    const scenario = runeScenario()
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(scenario.envelope.lot.priceSats)
  })

  it('rune layout, buyer about to sign', async () => {
    const scenario = runeScenario({ signers: ['seller'] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
    })
    expect(verdict.errors).toEqual([])
  })

  it('never signs: the verdict is always a dry run with a txid and a diff', async () => {
    const scenario = twoDummyScenario()
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: 5000,
    })
    expect(verdict.unsignedTxid).not.toBeNull()
    expect(verdict.diff.split('\n').length).toBeGreaterThan(5)
    expect(scenario.envelope.psbt).toBe(scenario.psbt)
  })
})

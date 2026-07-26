import { describe, expect, it } from 'vitest'
import { verifyOffer } from '../src/swap/verify.js'
import { NETWORK, NOW, SELLER_VIEW, type FixtureOutput } from './helpers/swap.js'
import { SAT_OFFSET, twoDummyOutputs, twoDummyScenario } from './helpers/scenarios.js'

/**
 * ARCHITECTURE §4: for arbitrary output permutations, verifyOffer() accepts only those where the
 * signer's net delta equals the asserted price. This is the one generic defence in the system —
 * it catches rearrangements no named invariant enumerates.
 */

function fingerprint(outputs: readonly FixtureOutput[]): string {
  return outputs.map((output) => `${output.owner?.address ?? 'script'}:${output.valueSats}`).join('|')
}

/** Deterministic shuffle: the suite must not become flaky, but must still cover many orders. */
function shuffle<T>(values: readonly T[], seed: number): T[] {
  const out = [...values]
  let state = seed
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    const j = state % (i + 1)
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}

describe('balance-delta property', () => {
  it('accepts only the canonical output order across 60 permutations', async () => {
    const canonical = twoDummyOutputs()
    const canonicalPrint = fingerprint(canonical)
    let accepted = 0

    // Seed 0 is the canonical arrangement, so the property is not vacuously satisfied by a
    // verifier that rejects everything.
    for (let seed = 0; seed <= 60; seed += 1) {
      const outputs = seed === 0 ? canonical : shuffle(canonical, seed)
      const scenario = twoDummyScenario({ outputs })
      const verdict = await verifyOffer({
        network: NETWORK,
        now: NOW,
        envelope: scenario.envelope,
        role: 'seller',
        signer: SELLER_VIEW,
        satOffset: SAT_OFFSET,
      })
      if (verdict.ok) {
        // Two 600-sat dummy outputs to the same address are interchangeable, so an accepted
        // permutation must still be byte-identical to the canonical arrangement.
        expect(fingerprint(outputs)).toBe(canonicalPrint)
        accepted += 1
      }
    }

    expect(accepted).toBeGreaterThan(0)
  })

  it('reports the simulated delta even when it is wrong', async () => {
    const canonical = twoDummyOutputs()
    const outputs = shuffle(canonical, 7)
    const scenario = twoDummyScenario({ outputs })
    const verdict = await verifyOffer({
      network: NETWORK,
      now: NOW,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expect(verdict.netDeltaSats).not.toBeNull()
    expect(verdict.expectedDeltaSats).toBe(scenario.envelope.lot.priceSats)
  })
})

import { describe, expect, it } from 'vitest'
import { OrdIndexerAdapter } from '../src/indexer/ord.js'
import { parseLocation } from '../src/types/location.js'

/**
 * Opt-in live read against a real ord node. CI stays offline and deterministic; this is how the
 * recorded fixtures get re-proven against reality:
 *
 *   RUNEBOLT_ORD_URL=https://ordinals.com pnpm test
 */

const BASE = process.env['RUNEBOLT_ORD_URL']
const RUNE_UTXO = '6c255c08883bf93799064172b55fd71e10405d7c0f80fc9e2e1da45daa40e4a4:1'
const CURSED = '617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0'

describe.skipIf(BASE === undefined)('ord adapter against a live node', () => {
  const ord = new OrdIndexerAdapter({ baseUrl: BASE ?? '' })

  it('reports a version and a block height', async () => {
    expect(await ord.version()).toMatch(/^\d+\.\d+\.\d+/)
    expect(await ord.blockHeight()).toBeGreaterThan(800_000)
  }, 30_000)

  it('attributes a rune-bearing UTXO', async () => {
    const result = await ord.utxoContents(parseLocation(RUNE_UTXO))
    expect(result.indexer).toBe('ord')
    expect(result.contents.runes[0]?.runeName).toBe('SPARKY•RUNEDOG')
    expect(result.contents.runes[0]?.amount).toMatch(/^\d+$/)
  }, 30_000)

  it('handles a negative inscription number', async () => {
    const info = await ord.inscriptionInfo(CURSED)
    expect(info.number).toBe(-1)
  }, 30_000)
})

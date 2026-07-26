import { describe, expect, it } from 'vitest'
import { RuneBoltError } from '../src/errors.js'
import { OrdIndexerAdapter } from '../src/indexer/ord.js'
import { isMixedUtxo } from '../src/types/attribution.js'
import { parseLocation } from '../src/types/location.js'
import { RECORDED_BASE, recordedFetch } from './helpers/recorded-fetch.js'

/**
 * W2. Every response here was recorded verbatim from a live ord instance
 * (see tools/record-ord-fixtures.mjs); the live path itself is exercised by ord-live.test.ts.
 */

const RUNE_UTXO = '6c255c08883bf93799064172b55fd71e10405d7c0f80fc9e2e1da45daa40e4a4:1'
const INSCRIBED_UTXO = 'c9fa07991c847f815f79e4457dadfe36842d26c0fa2ed71bf1729ade27496920:0'
const SPENT_UTXO = 'aa81d42be532eb8e32a6f5ecef7a1818f5494747d81f7ead45ff89cdbe4f0096:0'
const CURSED = '617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0'

function adapter(overrides: Record<string, string> = {}): OrdIndexerAdapter {
  return new OrdIndexerAdapter({
    baseUrl: RECORDED_BASE,
    fetchImpl: recordedFetch(overrides),
    now: () => new Date('2026-07-26T12:00:00Z'),
  })
}

describe('ord adapter', () => {
  it('reads the version from the HTML status page when the JSON status omits it', async () => {
    expect(await adapter().version()).toBe('0.27.1')
  })

  it('attributes every read with indexer, version, height and observation time', async () => {
    const result = await adapter().utxoContents(parseLocation(RUNE_UTXO))
    expect(result.indexer).toBe('ord')
    expect(result.indexerVersion).toBe('0.27.1')
    expect(result.blockHeight).toBe(959697)
    expect(result.observedAt).toBe('2026-07-26T12:00:00.000Z')
  })

  it('reads a rune-bearing UTXO and resolves the rune id', async () => {
    const result = await adapter().utxoContents(parseLocation(RUNE_UTXO))
    expect(result.contents.runes).toEqual([
      {
        runeId: '840000:357',
        runeName: 'SPARKY•RUNEDOG',
        amount: '116521',
        divisibility: 0,
        symbol: '🔳',
      },
    ])
    expect(result.contents.inscriptions).toEqual([])
    expect(result.contents.valueSats).toBe(546)
  })

  it('keeps u128 rune amounts exact instead of rounding them through a JS number', async () => {
    const huge = '340282366920938463463374607431768211455'
    const overrides = {
      [`application/json /r/utxo/${RUNE_UTXO}`]: JSON.stringify({
        inscriptions: [],
        runes: { 'SPARKY•RUNEDOG': { amount: Number(huge), divisibility: 0, symbol: '🔳' } },
        value: 546,
      }).replace(`"amount":${Number(huge)}`, `"amount":${huge}`),
    }
    const result = await adapter(overrides).utxoContents(parseLocation(RUNE_UTXO))
    expect(result.contents.runes[0]?.amount).toBe(huge)
  })

  it('reads a multi-inscription UTXO and flags it as unlistable', async () => {
    const result = await adapter().utxoContents(parseLocation(INSCRIBED_UTXO))
    expect(result.contents.inscriptions.length).toBeGreaterThan(1)
    expect(result.contents.inscriptions).toContain(CURSED)
    expect(isMixedUtxo(result.contents)).toBe(false)
  })

  it('handles negative inscription numbers (cursed inscriptions are tradeable)', async () => {
    const info = await adapter().inscriptionInfo(CURSED)
    expect(info.number).toBe(-1)
    expect(info.charms).toContain('cursed')
    expect(info.satpoint).toBe(`${INSCRIBED_UTXO}:8897948`)
    expect(info.valueSats).toBe(9_000_000)
  })

  it('treats an outpoint ord cannot find as spent (I-15 fails closed)', async () => {
    const ord = adapter()
    expect(await ord.isSpent(parseLocation(SPENT_UTXO))).toBe(true)
    expect(await ord.isSpent(parseLocation(RUNE_UTXO))).toBe(false)
  })

  it('refuses to attribute contents for an outpoint it cannot see', async () => {
    await expect(adapter().utxoContents(parseLocation(SPENT_UTXO))).rejects.toBeInstanceOf(
      RuneBoltError,
    )
  })

  it('reads rune metadata including the id and divisibility', async () => {
    const info = await adapter().runeInfo('SPARKY•RUNEDOG')
    expect(info.runeId).toBe('840000:357')
    expect(info.runeName).toBe('SPARKY•RUNEDOG')
    expect(info.divisibility).toBe(0)
  })

  it('surfaces a non-JSON body rather than guessing', async () => {
    const ord = adapter({
      [`application/json /r/utxo/${RUNE_UTXO}`]: 'JSON API disabled',
    })
    await expect(ord.utxoContents(parseLocation(RUNE_UTXO))).rejects.toThrow(
      /non-JSON body|JSON API/,
    )
  })

  it('ignores the sat offset when addressing an outpoint', async () => {
    const withOffset = await adapter().utxoContents(parseLocation(`${RUNE_UTXO}:1234`))
    expect(withOffset.contents.valueSats).toBe(546)
  })
})

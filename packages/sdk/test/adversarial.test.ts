import { describe, expect, it } from 'vitest'
import { ProtocolErrorCode, SILENT_LOSS_INVARIANTS } from '../src/errors.js'
import type { IndexerAdapter } from '../src/indexer/adapter.js'
import { verifyOffer, type VerifyVerdict } from '../src/swap/verify.js'
import type { AttributedContents, UtxoContents } from '../src/types/attribution.js'
import {
  BUYER,
  BUYER_VIEW,
  NETWORK,
  NOW,
  SELLER,
  SELLER_PAYOUT,
  SELLER_VIEW,
  THIRD_PARTY,
  inscriptionContents,
  input,
  runeContents,
  runestoneScript,
} from './helpers/swap.js'
import {
  DUMMY_VALUE,
  FEE,
  FUNDING,
  LOT_VALUE,
  PRICE,
  RUNE_FEE,
  RUNE_FUNDING,
  RUNE_FUNDING_2,
  RUNE_LOT_VALUE,
  RUNE_PRICE,
  SAT_OFFSET,
  runeScenario,
  twoDummyScenario,
} from './helpers/scenarios.js'

/**
 * ARCHITECTURE §4: for every SILENT-LOSS invariant there is a test that deliberately constructs
 * the violation and asserts the named error. The coverage assertion at the bottom of this file
 * fails if one of them ever loses its fixture.
 */

const covered = new Set<string>()
const base = { network: NETWORK, now: NOW } as const

function expectFailsClosed(verdict: VerifyVerdict, code: ProtocolErrorCode): void {
  const codes = verdict.errors.map((error) => error.code)
  expect(codes, `expected ${code}, got ${codes.join(', ') || '<none>'}`).toContain(code)
  expect(verdict.ok).toBe(false)
  covered.add(code)
}

const TOTAL_IN = DUMMY_VALUE * 2 + LOT_VALUE + FUNDING
const RECOMBINE = DUMMY_VALUE * 2 + SAT_OFFSET
const PAYMENT = PRICE + LOT_VALUE
const CHANGE = TOTAL_IN - RECOMBINE - LOT_VALUE - PAYMENT - DUMMY_VALUE * 2 - FEE

const RUNE_TOTAL_IN = RUNE_FUNDING + RUNE_LOT_VALUE + RUNE_FUNDING_2
const RUNE_PAYMENT = RUNE_PRICE + RUNE_LOT_VALUE
const RUNE_CHANGE = RUNE_TOTAL_IN - RUNE_LOT_VALUE - RUNE_PAYMENT - RUNE_FEE

describe('I-1 E_RUNE_OUTPUT_INDEX — SILENT-LOSS', () => {
  it('a platform-fee output at index 0 takes the entire rune balance', async () => {
    const feeSats = 10_000
    const scenario = runeScenario({
      signers: ['seller'],
      outputs: [
        { valueSats: feeSats, owner: THIRD_PARTY },
        { valueSats: RUNE_PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: RUNE_LOT_VALUE, owner: BUYER },
        { valueSats: RUNE_CHANGE - feeSats, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_RUNE_OUTPUT_INDEX)
  })

  it('the seller taking index 0 back as change is caught before signing', async () => {
    const scenario = runeScenario({
      outputs: [
        { valueSats: RUNE_LOT_VALUE, owner: SELLER },
        { valueSats: RUNE_PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: RUNE_CHANGE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_RUNE_OUTPUT_INDEX)
  })
})

describe('I-2 E_RUNESTONE_PRESENT — SILENT-LOSS', () => {
  it('a runestone injected into the swap path is rejected, not merely discouraged', async () => {
    const scenario = runeScenario({
      signers: ['seller'],
      outputs: [
        { valueSats: RUNE_LOT_VALUE, owner: BUYER },
        { valueSats: RUNE_PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: 0, script: runestoneScript() },
        { valueSats: RUNE_CHANGE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_RUNESTONE_PRESENT)
    expect(verdict.diff).toContain('RUNESTONE')
  })

  it('a bare OP_RETURN is rejected too', async () => {
    const scenario = runeScenario({
      outputs: [
        { valueSats: RUNE_LOT_VALUE, owner: BUYER },
        { valueSats: RUNE_PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: 0, script: Buffer.from([0x6a, 0x01, 0x00]) },
        { valueSats: RUNE_CHANGE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_RUNESTONE_PRESENT)
  })
})

describe('I-4 E_INDEX_MISALIGNED — SILENT-LOSS', () => {
  it('a seller payment at index 3 is not covered by the SIGHASH_SINGLE signature', async () => {
    const decoy = 5_000
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: RECOMBINE, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: decoy, owner: THIRD_PARTY },
        { valueSats: PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE - decoy, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_INDEX_MISALIGNED)
  })

  it('a seller asset input away from index 2 is rejected', async () => {
    const scenario = twoDummyScenario({
      sellerInputIndex: 0,
      inputs: [
        input(0xa3, LOT_VALUE, SELLER),
        input(0xa1, DUMMY_VALUE, BUYER),
        input(0xa2, DUMMY_VALUE, BUYER),
        input(0xa4, FUNDING, BUYER),
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_INDEX_MISALIGNED)
  })
})

describe('I-5 E_SAT_OFFSET — SILENT-LOSS', () => {
  it('dropping the sat offset from output 0 buries the inscription in the dummy recombine', async () => {
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: DUMMY_VALUE * 2, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE + SAT_OFFSET, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SAT_OFFSET)
  })

  it('an unknown sat offset fails closed rather than being assumed to be zero', async () => {
    const scenario = twoDummyScenario()
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SAT_OFFSET)
  })

  it('an OP_RETURN at the asset-receive index is rejected', async () => {
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: RECOMBINE, owner: BUYER },
        { valueSats: 0, script: runestoneScript() },
        { valueSats: PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE + LOT_VALUE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SAT_OFFSET)
  })
})

describe('I-6 / I-11 value and balance checks', () => {
  it('omitting the postage from the seller payment underprices the sale', async () => {
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: RECOMBINE, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: PRICE, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE + LOT_VALUE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_PAYMENT_VALUE)
    expectFailsClosed(verdict, ProtocolErrorCode.E_BALANCE_DELTA)
    expect(verdict.netDeltaSats).toBe(PRICE - LOT_VALUE)
  })

  it('shaving a single sat off the payment is caught', async () => {
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: RECOMBINE, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: PAYMENT - 1, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE + 1, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_BALANCE_DELTA)
  })
})

describe('I-7 / I-8 dummy UTXOs', () => {
  it('a dummy outside the 580–1000 band is rejected', async () => {
    const small = 100
    const scenario = twoDummyScenario({
      inputs: [
        input(0xa1, small, BUYER),
        input(0xa2, DUMMY_VALUE, BUYER),
        input(0xa3, LOT_VALUE, SELLER),
        input(0xa4, FUNDING, BUYER),
      ],
      outputs: [
        { valueSats: small + DUMMY_VALUE + SAT_OFFSET, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: DUMMY_VALUE, owner: BUYER },
        { valueSats: CHANGE, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_NO_DUMMY_UTXOS)
  })

  it('a purchase that does not regenerate two dummies is rejected', async () => {
    const scenario = twoDummyScenario({
      outputs: [
        { valueSats: RECOMBINE, owner: BUYER },
        { valueSats: LOT_VALUE, owner: BUYER },
        { valueSats: PAYMENT, owner: SELLER_PAYOUT },
        { valueSats: CHANGE + DUMMY_VALUE * 2, owner: BUYER },
      ],
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_DUMMY_NOT_REGENERATED)
  })
})

describe('I-9 / I-10 / I-13 / I-14 asset-set checks', () => {
  it('rejects when the signer owns no asset-bearing input', async () => {
    const scenario = twoDummyScenario()
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: { addresses: [SELLER_PAYOUT.address] },
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_MULTIPLE_OWNED_INPUTS)
  })

  it('rejects runes inside an inscription offer (ord parity)', async () => {
    const contents: UtxoContents = {
      inscriptions: inscriptionContents().inscriptions,
      runes: runeContents().runes,
      brc20: [],
    }
    const scenario = twoDummyScenario({ contents })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_RUNES_IN_INSCRIPTION_OFFER)
    expectFailsClosed(verdict, ProtocolErrorCode.E_MIXED_UTXO)
  })

  it('rejects a multi-inscription lot', async () => {
    const scenario = twoDummyScenario({
      contents: { inscriptions: ['a'.repeat(64) + 'i0', 'b'.repeat(64) + 'i0'], runes: [], brc20: [] },
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_INSCRIPTION_COUNT)
  })

  it('rejects a rune listing whose lot holds two rune ids', async () => {
    const scenario = runeScenario({
      contents: {
        inscriptions: [],
        runes: [
          { runeId: '840000:3', runeName: 'SPARKY•RUNEDOG', amount: '1' },
          { runeId: '840000:4', runeName: 'OTHER•RUNE', amount: '2' },
        ],
        brc20: [],
      },
    })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_MIXED_UTXO)
    expectFailsClosed(verdict, ProtocolErrorCode.E_ASSET_MISMATCH)
  })
})

describe('I-12 signature state', () => {
  it('rejects an offer where the signer has already signed their own input', async () => {
    const scenario = twoDummyScenario({ signers: ['buyer', 'seller'] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SIGNATURE_STATE)
  })

  it('rejects an unsigned counterparty input', async () => {
    const scenario = twoDummyScenario({ signers: [] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SIGNATURE_STATE)
  })

  it('rejects a seller signature that is not SIGHASH_SINGLE|ANYONECANPAY', async () => {
    const scenario = twoDummyScenario({ signers: ['seller'], sellerSighashType: 0x01 })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_SIGNATURE_STATE)
  })
})

describe('I-15 / I-16 / I-18 buy-time and serve-time checks', () => {
  const attributed = (contents: UtxoContents): AttributedContents => ({
    indexer: 'stub',
    indexerVersion: '0.0.0',
    blockHeight: 1,
    observedAt: '2026-07-26T00:00:00Z',
    contents,
  })

  function stubIndexer(spent: boolean, contents: UtxoContents): IndexerAdapter {
    return {
      name: 'stub',
      version: async () => '0.0.0',
      isSpent: async () => spent,
      utxoContents: async () => attributed(contents),
      runeInfo: async () => {
        throw new Error('not used')
      },
      inscriptionInfo: async () => {
        throw new Error('not used')
      },
    }
  }

  it('rejects a spent lot at buy time', async () => {
    const scenario = twoDummyScenario({ signers: ['seller'] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
      satOffset: SAT_OFFSET,
      indexer: stubIndexer(true, inscriptionContents()),
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_LOT_SPENT)
  })

  it('rejects a lot whose contents drifted since listing', async () => {
    const scenario = twoDummyScenario({ signers: ['seller'] })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
      satOffset: SAT_OFFSET,
      indexer: stubIndexer(false, { inscriptions: ['c'.repeat(64) + 'i0'], runes: [], brc20: [] }),
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_LOT_DRIFT)
  })

  it('rejects an expired listing', async () => {
    const scenario = twoDummyScenario({ expiresAt: '2026-07-25T00:00:00Z' })
    const verdict = await verifyOffer({
      ...base,
      envelope: scenario.envelope,
      role: 'seller',
      signer: SELLER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expectFailsClosed(verdict, ProtocolErrorCode.E_EXPIRED)
  })
})

describe('SILENT-LOSS coverage', () => {
  it('every SILENT-LOSS invariant has an adversarial fixture that failed closed', () => {
    const missing = SILENT_LOSS_INVARIANTS.filter((invariant) => !covered.has(invariant.code))
    expect(missing.map((invariant) => `${invariant.id} ${invariant.code}`)).toEqual([])
  })
})

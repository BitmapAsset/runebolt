import ecc from '@bitcoinerlab/secp256k1'
import { Psbt } from 'bitcoinjs-lib'
import { describe, expect, it } from 'vitest'
import { ImplementationErrorCode, ProtocolErrorCode } from '../src/errors.js'
import { completeSwap, finalizeSwap } from '../src/swap/complete.js'
import {
  RUNE_BUYER_RECEIVE_INDEX,
  RUNE_RECEIVE_VALUE,
  RUNE_SELLER_INDEX,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '../src/swap/constants.js'
import { makeOffer, sealOffer } from '../src/swap/offer.js'
import { isPlaceholderOutpoint, isPlaceholderScript } from '../src/swap/placeholder.js'
import { parsePsbtView } from '../src/swap/psbt.js'
import {
  completeRuneSwap,
  makeRuneOffer,
  planRuneListing,
  type MakeRuneOfferParams,
  type RuneLotCandidate,
} from '../src/swap/rune.js'
import { verifyOffer } from '../src/swap/verify.js'
import type { UtxoContents } from '../src/types/attribution.js'
import { buyerSign } from './helpers/sign.js'
import {
  BUYER,
  NETWORK,
  NOW,
  SELLER,
  SELLER_PAYOUT,
  THIRD_PARTY,
  attribution,
  inscriptionContents,
  runeContents,
} from './helpers/swap.js'
import { utxo } from './helpers/build.js'

/**
 * W7 / SPEC §6.2. The runestone-free layout, and the refusal that makes it safe: a lot is sold
 * whole, so a listing whose lot holds more than the amount being sold is a silent loss for the
 * seller and is rejected at build time rather than discovered after confirmation.
 */

const base = { network: NETWORK, now: NOW } as const

const RUNE_LOT = `${'d0'.repeat(32)}:0`
const RUNE_LOT_VALUE = 546
const RUNE_PRICE = 100_000
const SELL_AMOUNT = '3000'

function runeParams(overrides: Partial<MakeRuneOfferParams> = {}): MakeRuneOfferParams {
  return {
    lot: { outpoint: RUNE_LOT, valueSats: RUNE_LOT_VALUE, script: SELLER.script },
    priceSats: RUNE_PRICE,
    sellAmount: SELL_AMOUNT,
    maker: {
      address: SELLER.address,
      publicKey: SELLER.publicKeyHex,
      receiveAddress: SELLER_PAYOUT.address,
    },
    attribution: attribution(runeContents(SELL_AMOUNT)),
    expiresAt: '2030-01-01T00:00:00Z',
    network: NETWORK,
    now: NOW,
    ...overrides,
  }
}

/** What the seller's wallet does: sign input 1, and only input 1. */
function sellerSignRune(psbtBase64: string, sighashType = SIGHASH_SINGLE_ANYONECANPAY): string {
  const psbt = Psbt.fromBase64(psbtBase64, { network: NETWORK })
  const input = psbt.data.inputs[RUNE_SELLER_INDEX]
  if (input === undefined) throw new Error('draft has no seller input')
  input.sighashType = sighashType
  psbt.signInput(RUNE_SELLER_INDEX, SELLER.keyPair, [sighashType])
  return psbt.toBase64()
}

async function sealedRuneOffer(overrides: Partial<MakeRuneOfferParams> = {}) {
  const draft = await makeRuneOffer(runeParams(overrides))
  const envelope = await sealOffer({ draft, signedPsbt: sellerSignRune(draft.psbt), now: NOW })
  return { draft, envelope }
}

function runeBuyer() {
  return { funding: [utxo('e1', 200_000, BUYER)], receiveAddress: BUYER.address }
}

describe('makeRuneOffer builds the runestone-free arrangement (SPEC §6.2)', () => {
  it('puts the seller input and payment at index 1, with the lot value added back', async () => {
    const draft = await makeRuneOffer(runeParams())
    const view = parsePsbtView(draft.psbt, NETWORK)

    expect(view.inputs[RUNE_SELLER_INDEX]?.outpoint).toBe(RUNE_LOT)
    expect(view.outputs[RUNE_SELLER_INDEX]?.address).toBe(SELLER_PAYOUT.address)
    expect(view.outputs[RUNE_SELLER_INDEX]?.valueSats).toBe(RUNE_PRICE + RUNE_LOT_VALUE)
    expect(draft.paymentValueSats).toBe(RUNE_PRICE + RUNE_LOT_VALUE)
  })

  it('leaves index 0 for the buyer, which is where every input rune lands', async () => {
    const draft = await makeRuneOffer(runeParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    expect(view.outputs[RUNE_BUYER_RECEIVE_INDEX]?.valueSats).toBe(RUNE_RECEIVE_VALUE)
    expect(isPlaceholderScript(view.outputs[RUNE_BUYER_RECEIVE_INDEX]?.script ?? new Uint8Array()))
      .toBe(true)
    expect(isPlaceholderOutpoint(view.inputs[0]?.outpoint ?? '')).toBe(true)
  })

  it('emits no runestone and no OP_RETURN at all', async () => {
    const draft = await makeRuneOffer(runeParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    expect(view.outputs.some((output) => output.isOpReturn)).toBe(false)
    expect(view.outputs.some((output) => output.isRunestone)).toBe(false)
  })

  it('carries no dummies and no sat offset: those belong to the 2-dummy layout', async () => {
    const draft = await makeRuneOffer(runeParams())
    const view = parsePsbtView(draft.psbt, NETWORK)
    expect(view.inputs).toHaveLength(2)
    expect(view.outputs).toHaveLength(3)
    expect(draft.placeholderInputs).toEqual([0])
  })

  it('verifies for the seller who is about to sign it', async () => {
    const draft = await makeRuneOffer(runeParams())
    const verdict = await verifyOffer({
      ...base,
      envelope: draft.envelope,
      role: 'seller',
      stage: 'draft',
      signer: { addresses: [SELLER.address, SELLER_PAYOUT.address] },
    })
    expect(verdict.errors).toEqual([])
    expect(verdict.netDeltaSats).toBe(RUNE_PRICE)
  })

  it('seals into a publishable envelope and verifies as a signed offer', async () => {
    const { envelope } = await sealedRuneOffer()
    const verdict = await verifyOffer({
      ...base,
      envelope,
      role: 'seller',
      stage: 'offer',
      signer: { addresses: [SELLER.address, SELLER_PAYOUT.address] },
    })
    expect(verdict.errors).toEqual([])
    expect(parsePsbtView(envelope.psbt, NETWORK).inputs[RUNE_SELLER_INDEX]?.sighashType).toBe(
      SIGHASH_SINGLE_ANYONECANPAY,
    )
  })

  it('is reachable through makeOffer with a sellAmount', async () => {
    const draft = await makeOffer({
      assetClass: 'rune',
      lot: { outpoint: RUNE_LOT, valueSats: RUNE_LOT_VALUE, script: SELLER.script },
      priceSats: RUNE_PRICE,
      sellAmount: SELL_AMOUNT,
      maker: runeParams().maker,
      attribution: attribution(runeContents(SELL_AMOUNT)),
      expiresAt: '2030-01-01T00:00:00Z',
      network: NETWORK,
      now: NOW,
    })
    expect(draft.sellerInputIndex).toBe(RUNE_SELLER_INDEX)
    expect(draft.satOffset).toBeUndefined()
  })
})

/**
 * SPEC §6.2.2, and the highest-risk surface in the protocol. To sell 3,000 of a 10,000 balance you
 * would need an edict in an OP_RETURN, which the seller's SIGHASH_SINGLE|ANYONECANPAY signature
 * does not commit to — the buyer finalizes the transaction and could reassign the whole balance.
 * The only safe answer is that the split has already happened, so a partial listing is refused.
 */
describe('a partial balance cannot be listed — it must be split first', () => {
  it('refuses to list 3,000 out of a 10,000 lot', async () => {
    await expect(
      makeRuneOffer(runeParams({ attribution: attribution(runeContents('10000')) })),
    ).rejects.toMatchObject({
      code: ProtocolErrorCode.E_ASSET_MISMATCH,
      detail: { lotAmount: '10000', sellAmount: '3000' },
    })
  })

  it('refuses a lot that holds less than the amount being sold', async () => {
    await expect(
      makeRuneOffer(runeParams({ attribution: attribution(runeContents('2999')) })),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_ASSET_MISMATCH })
  })

  it('refuses a single sat of drift in either direction', async () => {
    for (const amount of ['2999', '3001']) {
      await expect(
        makeRuneOffer(runeParams({ attribution: attribution(runeContents(amount)) })),
      ).rejects.toMatchObject({ code: ProtocolErrorCode.E_ASSET_MISMATCH })
    }
  })

  it('compares u128 amounts exactly, without going through a JS number', async () => {
    // Two distinct balances that are the same IEEE-754 double.
    const held = '18446744073709551617'
    const sold = '18446744073709551616'
    expect(Number(held)).toBe(Number(sold))
    await expect(
      makeRuneOffer(
        runeParams({ sellAmount: sold, attribution: attribution(runeContents(held)) }),
      ),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_ASSET_MISMATCH })
  })

  it('accepts the exact balance, which is what a confirmed split leaves behind', async () => {
    const draft = await makeRuneOffer(
      runeParams({ sellAmount: '10000', attribution: attribution(runeContents('10000')) }),
    )
    expect(draft.envelope.attribution.contents.runes[0]?.amount).toBe('10000')
  })

  it('refuses a lot carrying two runes, and one carrying an inscription', async () => {
    const twoRunes: UtxoContents = {
      inscriptions: [],
      runes: [
        { runeId: '840000:3', runeName: 'SPARKY•RUNEDOG', amount: SELL_AMOUNT },
        { runeId: '840000:4', runeName: 'OTHER•RUNE', amount: '1' },
      ],
      brc20: [],
    }
    await expect(
      makeRuneOffer(runeParams({ attribution: attribution(twoRunes) })),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_MIXED_UTXO })

    const mixed: UtxoContents = {
      inscriptions: inscriptionContents().inscriptions,
      runes: runeContents(SELL_AMOUNT).runes,
      brc20: [],
    }
    await expect(
      makeRuneOffer(runeParams({ attribution: attribution(mixed) })),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_MIXED_UTXO })
  })
})

/** SPEC §4.2: detecting the skip case is mandatory; an exact-balance holder pays no prepare. */
describe('planRuneListing — prepare, or skip it', () => {
  const RUNE = '840000:3'

  function candidate(seed: string, amount: string): RuneLotCandidate {
    return {
      outpoint: `${seed.repeat(32)}:0`,
      valueSats: 546,
      script: SELLER.script,
      contents: runeContents(amount),
    }
  }

  it('skips the split when a lot already holds exactly the amount', () => {
    const exact = candidate('c1', '3000')
    const plan = planRuneListing({
      rune: RUNE,
      amount: '3000',
      lots: [candidate('c2', '10000'), exact, candidate('c3', '500')],
    })
    expect(plan.action).toBe('list')
    expect(plan.lot?.outpoint).toBe(exact.outpoint)
    expect(plan.availableAmount).toBe('13500')
  })

  it('matches by rune name as well as by id', () => {
    const plan = planRuneListing({
      rune: 'SPARKY•RUNEDOG',
      amount: '3000',
      lots: [candidate('c1', '3000')],
    })
    expect(plan.action).toBe('list')
  })

  it('calls for a split when no lot holds the exact amount', () => {
    const plan = planRuneListing({
      rune: RUNE,
      amount: '3000',
      lots: [candidate('c1', '10000'), candidate('c2', '2000')],
    })
    expect(plan.action).toBe('split')
    expect(plan.sources?.map((lot) => lot.outpoint)).toEqual([
      candidate('c1', '10000').outpoint,
      candidate('c2', '2000').outpoint,
    ])
    expect(plan.reason).toContain('§6.2.2')
  })

  it('reports a shortfall instead of planning a split it cannot fund', () => {
    const plan = planRuneListing({
      rune: RUNE,
      amount: '3000',
      lots: [candidate('c1', '1000'), candidate('c2', '500')],
    })
    expect(plan.action).toBe('insufficient')
    expect(plan.availableAmount).toBe('1500')
  })

  it('ignores mixed UTXOs, which are not listable at all (I-3)', () => {
    const mixed: RuneLotCandidate = {
      outpoint: `${'c9'.repeat(32)}:0`,
      valueSats: 10_000,
      script: SELLER.script,
      contents: {
        inscriptions: inscriptionContents().inscriptions,
        runes: runeContents('3000').runes,
        brc20: [],
      },
    }
    const plan = planRuneListing({ rune: RUNE, amount: '3000', lots: [mixed] })
    expect(plan.action).toBe('insufficient')
    expect(plan.availableAmount).toBe('0')
  })

  it('sums a u128 balance without losing precision', () => {
    const plan = planRuneListing({
      rune: RUNE,
      amount: '1',
      lots: [candidate('c1', '18446744073709551616'), candidate('c2', '1')],
    })
    expect(plan.action).toBe('list')
    expect(plan.availableAmount).toBe('18446744073709551617')
  })
})

describe('completeRuneSwap turns the offer into a broadcastable swap', () => {
  it('keeps the seller signature valid across the rebuild', async () => {
    const { envelope } = await sealedRuneOffer()
    const swap = await completeRuneSwap({
      ...base,
      envelope,
      buyer: runeBuyer(),
      fee: { rateSatPerVb: 5 },
    })
    const psbt = Psbt.fromBase64(swap.psbt, { network: NETWORK })
    expect(
      psbt.validateSignaturesOfInput(RUNE_SELLER_INDEX, (pubkey, msghash, signature) =>
        ecc.verify(msghash, pubkey, signature),
      ),
    ).toBe(true)
    expect(swap.verdict.ok).toBe(true)
  })

  it('puts the buyer at index 0 and the seller payment byte-for-byte at index 1', async () => {
    const { envelope } = await sealedRuneOffer()
    const offer = parsePsbtView(envelope.psbt, NETWORK)
    const swap = await completeRuneSwap({
      ...base,
      envelope,
      buyer: runeBuyer(),
      fee: { rateSatPerVb: 5 },
    })
    const view = parsePsbtView(swap.psbt, NETWORK)
    expect(view.outputs[RUNE_BUYER_RECEIVE_INDEX]?.address).toBe(BUYER.address)
    expect(view.outputs[RUNE_SELLER_INDEX]?.address).toBe(SELLER_PAYOUT.address)
    expect(view.outputs[RUNE_SELLER_INDEX]?.valueSats).toBe(
      offer.outputs[RUNE_SELLER_INDEX]?.valueSats,
    )
    expect(view.inputs[RUNE_SELLER_INDEX]?.outpoint).toBe(RUNE_LOT)
    expect(view.outputs.some((output) => output.isOpReturn)).toBe(false)
  })

  it('charges the buyer exactly price + fee, with no tolerance', async () => {
    const { envelope } = await sealedRuneOffer()
    for (const rateSatPerVb of [1, 5, 25, 100]) {
      const swap = await completeRuneSwap({
        ...base,
        envelope,
        buyer: runeBuyer(),
        fee: { rateSatPerVb },
      })
      expect(swap.buyerDeltaSats).toBe(-(RUNE_PRICE + swap.feeSats))
      expect(swap.verdict.netDeltaSats).toBe(swap.buyerDeltaSats)
      expect(swap.feeSats).toBe(Math.ceil(swap.vsize * rateSatPerVb))
    }
  })

  it('keeps a platform fee away from index 0, where it would take the whole balance', async () => {
    const { envelope } = await sealedRuneOffer()
    const platformFee = { address: THIRD_PARTY.address, valueSats: 7_500 }
    const swap = await completeRuneSwap({
      ...base,
      envelope,
      buyer: runeBuyer(),
      fee: { totalSats: 2_000 },
      platformFee,
    })
    const view = parsePsbtView(swap.psbt, NETWORK)
    expect(view.outputs[RUNE_BUYER_RECEIVE_INDEX]?.address).toBe(BUYER.address)
    expect(view.outputs[2]?.address).toBe(THIRD_PARTY.address)
    expect(swap.buyerDeltaSats).toBe(-(RUNE_PRICE + 2_000 + platformFee.valueSats))
  })

  it('spends several buyer inputs, with the extras after the seller', async () => {
    const { envelope } = await sealedRuneOffer()
    const swap = await completeRuneSwap({
      ...base,
      envelope,
      buyer: {
        funding: [utxo('e1', 60_000, BUYER), utxo('e2', 60_000, BUYER), utxo('e3', 60_000, BUYER)],
        receiveAddress: BUYER.address,
      },
      fee: { rateSatPerVb: 4 },
    })
    const view = parsePsbtView(swap.psbt, NETWORK)
    expect(view.inputs).toHaveLength(4)
    expect(view.inputs[RUNE_SELLER_INDEX]?.outpoint).toBe(RUNE_LOT)
    expect(swap.verdict.ok).toBe(true)
  })

  it('goes end to end: build, seal, complete, sign, finalize', async () => {
    const { envelope } = await sealedRuneOffer()
    const swap = await completeRuneSwap({
      ...base,
      envelope,
      buyer: runeBuyer(),
      fee: { rateSatPerVb: 5 },
    })
    const final = await finalizeSwap({
      ...base,
      envelope,
      psbt: buyerSign(swap.psbt, RUNE_SELLER_INDEX),
      buyer: { addresses: [BUYER.address] },
    })
    expect(final.txid).toBe(swap.txid)
    expect(final.txHex).toMatch(/^[0-9a-f]+$/)
  })

  it('is reachable through completeSwap', async () => {
    const { envelope } = await sealedRuneOffer()
    const swap = await completeSwap({
      ...base,
      envelope,
      buyer: { funding: [utxo('e1', 200_000, BUYER)], receiveAddress: BUYER.address },
      fee: { rateSatPerVb: 5 },
    })
    expect(swap.verdict.ok).toBe(true)
    expect(swap.changeSats).not.toBeNull()
  })

  it('refuses a buyer with no inputs: index 0 has to be the buyer', async () => {
    const { envelope } = await sealedRuneOffer()
    await expect(
      completeRuneSwap({
        ...base,
        envelope,
        buyer: { funding: [], receiveAddress: BUYER.address },
        fee: { rateSatPerVb: 5 },
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_INSUFFICIENT_FUNDS })
  })

  it('refuses funding that cannot cover the price and the fee', async () => {
    const { envelope } = await sealedRuneOffer()
    await expect(
      completeRuneSwap({
        ...base,
        envelope,
        buyer: { funding: [utxo('e9', 50_000, BUYER)], receiveAddress: BUYER.address },
        fee: { rateSatPerVb: 5 },
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_INSUFFICIENT_FUNDS })
  })

  it('refuses a rune-receive output below the dust limit', async () => {
    const { envelope } = await sealedRuneOffer()
    await expect(
      completeRuneSwap({
        ...base,
        envelope,
        buyer: runeBuyer(),
        fee: { rateSatPerVb: 5 },
        receiveValueSats: 300,
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_MALFORMED_PSBT })
  })

  it('refuses an expired offer at buy time (I-18)', async () => {
    const { envelope } = await sealedRuneOffer({ expiresAt: '2026-07-27T00:00:00Z' })
    await expect(
      completeRuneSwap({
        ...base,
        now: new Date('2026-07-28T00:00:00Z'),
        envelope,
        buyer: runeBuyer(),
        fee: { rateSatPerVb: 5 },
      }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_EXPIRED })
  })

  it('refuses an inscription offer rather than building the wrong layout', async () => {
    const { envelope } = await sealedRuneOffer()
    await expect(
      completeRuneSwap({
        ...base,
        envelope: { ...envelope, assetClass: 'inscription' },
        buyer: runeBuyer(),
        fee: { rateSatPerVb: 5 },
      }),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_UNSUPPORTED_ASSET_CLASS })
  })
})

/**
 * The threat model, built rather than described. `SIGHASH_SINGLE|ANYONECANPAY` commits the seller
 * to their input and to the output at the same index — and to nothing else. The buyer finalizes
 * the transaction, so every one of these attacks produces a transaction Bitcoin, the indexer and
 * the seller's wallet would all accept: each test asserts the seller's signature is *still valid*
 * before asserting that `verifyOffer()` is what refuses it.
 */
describe('a malicious buyer completing a rune swap', () => {
  /** Rebuilds around the seller's signed input, preserving input 1 and output 1 exactly. */
  function maliciousComplete(
    envelope: { psbt: string },
    outputs: readonly { script: Buffer; value: number }[],
  ): string {
    const offer = Psbt.fromBase64(envelope.psbt, { network: NETWORK })
    const sellerInput = offer.data.inputs[RUNE_SELLER_INDEX]
    const sellerTxInput = offer.txInputs[RUNE_SELLER_INDEX]
    if (sellerInput?.witnessUtxo === undefined || sellerTxInput === undefined) {
      throw new Error('no seller input')
    }
    const { witnessUtxo } = sellerInput

    const psbt = new Psbt({ network: NETWORK })
    psbt.addInput({
      hash: `${'e1'.repeat(32)}`,
      index: 0,
      witnessUtxo: { script: BUYER.script, value: 200_000 },
    })
    psbt.addInput({
      hash: Buffer.from(sellerTxInput.hash),
      index: sellerTxInput.index,
      witnessUtxo,
      ...(sellerInput.sighashType === undefined ? {} : { sighashType: sellerInput.sighashType }),
      ...(sellerInput.partialSig === undefined ? {} : { partialSig: sellerInput.partialSig }),
    })
    for (const output of outputs) psbt.addOutput({ script: output.script, value: output.value })
    return psbt.toBase64()
  }

  function sellerSignatureIsValid(psbtBase64: string): boolean {
    return Psbt.fromBase64(psbtBase64, { network: NETWORK }).validateSignaturesOfInput(
      RUNE_SELLER_INDEX,
      (pubkey, msghash, signature) => ecc.verify(msghash, pubkey, signature),
    )
  }

  const payment = RUNE_PRICE + RUNE_LOT_VALUE

  it('cannot take the balance by putting its own output anywhere but index 0 (I-1)', async () => {
    const { envelope } = await sealedRuneOffer()
    // A platform fee at index 0 collects every input rune; the buyer's own output at 2 gets none.
    const psbt = maliciousComplete(envelope, [
      { script: THIRD_PARTY.script, value: 10_000 },
      { script: SELLER_PAYOUT.script, value: payment },
      { script: BUYER.script, value: 200_546 - payment - 10_000 - 2_000 },
    ])
    expect(sellerSignatureIsValid(psbt)).toBe(true)

    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt,
      role: 'buyer',
      signer: { addresses: [BUYER.address] },
    })
    expect(verdict.errors.map((error) => error.code)).toContain(
      ProtocolErrorCode.E_RUNE_OUTPUT_INDEX,
    )
    expect(verdict.ok).toBe(false)
  })

  it('cannot smuggle in a runestone, which would burn every input rune (I-2)', async () => {
    const { envelope } = await sealedRuneOffer()
    // OP_RETURN OP_13 <edict payload>: malformed here, and a cenotaph burns the whole balance.
    const runestone = Buffer.from([0x6a, 0x5d, 0x03, 0x16, 0x01, 0x03])
    const psbt = maliciousComplete(envelope, [
      { script: BUYER.script, value: RUNE_RECEIVE_VALUE },
      { script: SELLER_PAYOUT.script, value: payment },
      { script: runestone, value: 0 },
      { script: BUYER.script, value: 200_546 - RUNE_RECEIVE_VALUE - payment - 2_000 },
    ])
    expect(sellerSignatureIsValid(psbt)).toBe(true)

    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt,
      role: 'buyer',
      signer: { addresses: [BUYER.address] },
    })
    expect(verdict.errors.map((error) => error.code)).toContain(
      ProtocolErrorCode.E_RUNESTONE_PRESENT,
    )
  })

  it('cannot short the seller by shaving the payment, which breaks the signature', async () => {
    const { envelope } = await sealedRuneOffer()
    const psbt = maliciousComplete(envelope, [
      { script: BUYER.script, value: RUNE_RECEIVE_VALUE },
      { script: SELLER_PAYOUT.script, value: payment - 1 },
      { script: BUYER.script, value: 200_546 - RUNE_RECEIVE_VALUE - payment - 1_999 },
    ])
    // Output 1 is the one output the signature does commit to, so this attack does not even
    // produce a valid transaction — and the verifier names it anyway.
    expect(sellerSignatureIsValid(psbt)).toBe(false)

    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt,
      role: 'buyer',
      signer: { addresses: [BUYER.address] },
    })
    expect(verdict.errors.map((error) => error.code)).toContain(ProtocolErrorCode.E_PAYMENT_VALUE)
  })

  /**
   * SPEC §6.2.2 end to end. Had a 10,000 lot been listed as a sale of 3,000, the buyer would write
   * an edict assigning all 10,000 to themselves, pay the 3,000 price, and the seller's rune-change
   * output would not be covered by their signature. Two independent refusals stop it: the listing
   * never gets built, and the edict cannot enter the swap even if it did.
   */
  it('cannot split a partial balance in its own favour — the listing never exists', async () => {
    await expect(
      makeRuneOffer(runeParams({ attribution: attribution(runeContents('10000')) })),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_ASSET_MISMATCH })

    // And the edict it would have needed is refused by the swap path regardless.
    const { envelope } = await sealedRuneOffer()
    const edict = Buffer.from([0x6a, 0x5d, 0x05, 0x00, 0xc0, 0x0f, 0x03, 0x00])
    const psbt = maliciousComplete(envelope, [
      { script: BUYER.script, value: RUNE_RECEIVE_VALUE },
      { script: SELLER_PAYOUT.script, value: payment },
      { script: edict, value: 0 },
      { script: SELLER.script, value: 546 },
      { script: BUYER.script, value: 200_546 - RUNE_RECEIVE_VALUE - payment - 546 - 2_000 },
    ])
    expect(sellerSignatureIsValid(psbt)).toBe(true)

    const verdict = await verifyOffer({
      ...base,
      envelope,
      psbt,
      role: 'buyer',
      signer: { addresses: [BUYER.address] },
    })
    expect(verdict.errors.map((error) => error.code)).toContain(
      ProtocolErrorCode.E_RUNESTONE_PRESENT,
    )
  })
})

describe('the rune builders refuse what the verifier would catch', () => {
  it('refuses a seller signature at the wrong sighash (I-19)', async () => {
    const draft = await makeRuneOffer(runeParams())
    await expect(
      sealOffer({ draft, signedPsbt: sellerSignRune(draft.psbt, 0x01), now: NOW }),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_SIGHASH_MISMATCH })
  })

  it('refuses a satpoint lot location: the sat offset belongs to inscriptions', async () => {
    await expect(
      makeRuneOffer(
        runeParams({
          lot: { outpoint: `${RUNE_LOT}:100`, valueSats: RUNE_LOT_VALUE, script: SELLER.script },
        }),
      ),
    ).rejects.toMatchObject({ code: ImplementationErrorCode.E_MALFORMED_LOCATION })
  })

  it('refuses a rune-receive output below the dust limit at listing time', async () => {
    await expect(makeRuneOffer(runeParams({ receiveValueSats: 100 }))).rejects.toMatchObject({
      code: ImplementationErrorCode.E_MALFORMED_PSBT,
    })
  })

  it('refuses an already-expired listing', async () => {
    await expect(
      makeRuneOffer(runeParams({ expiresAt: '2026-07-25T00:00:00Z' })),
    ).rejects.toMatchObject({ code: ProtocolErrorCode.E_EXPIRED })
  })
})

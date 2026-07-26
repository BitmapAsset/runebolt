import { Psbt } from 'bitcoinjs-lib'
import { describe, expect, it } from 'vitest'
import { ProtocolErrorCode } from '../src/errors.js'
import {
  SELLER_SIGNATURE_INDEX,
  SIGHASH_NONE,
  SIGHASH_SINGLE_ANYONECANPAY,
} from '../src/swap/constants.js'
import { preSignLint } from '../src/swap/lint.js'
import { parsePsbtView } from '../src/swap/psbt.js'
import { verifyOffer } from '../src/swap/verify.js'
import { SAT_OFFSET, twoDummyScenario } from './helpers/scenarios.js'
import { BUYER_VIEW, NETWORK, NOW, SELLER, inscriptionContents } from './helpers/swap.js'

/**
 * Finalizing an input moves the signature into the witness and drops both `partialSig` and
 * `sighashType` (BIP-174). Reading the unsigned hint after that returns nothing, so every sighash
 * judgement went quiet on precisely the PSBTs a wallet hands back already finalized — including
 * the Unisat/sats-connect finalization behaviour the SDK is explicitly built around
 * (ARCHITECTURE §2.3). The flags are read off the witness instead.
 */

const base = { network: NETWORK, now: NOW } as const

/** Signs the seller input at the given flags and finalizes it, as a wallet would. */
function finalizedAt(sighashType: number): { psbt: string; envelope: ReturnType<typeof twoDummyScenario>['envelope'] } {
  const scenario = twoDummyScenario({ signers: ['buyer'] })
  const psbt = Psbt.fromBase64(scenario.psbt, { network: NETWORK })
  const input = psbt.data.inputs[SELLER_SIGNATURE_INDEX]
  if (input === undefined) throw new Error('scenario has no seller input')
  input.sighashType = sighashType
  psbt.signInput(SELLER_SIGNATURE_INDEX, SELLER.keyPair, [sighashType])
  psbt.finalizeInput(SELLER_SIGNATURE_INDEX)

  const finalized = psbt.toBase64()
  return { psbt: finalized, envelope: { ...scenario.envelope, psbt: finalized } }
}

describe('the sighash byte survives finalization', () => {
  it('reads SIGHASH_NONE off a finalized input, where the hint no longer exists', () => {
    const { psbt } = finalizedAt(SIGHASH_NONE)
    const raw = Psbt.fromBase64(psbt, { network: NETWORK }).data.inputs[SELLER_SIGNATURE_INDEX]
    // The finalizer really did drop everything the old read depended on.
    expect(raw?.sighashType).toBeUndefined()
    expect(raw?.partialSig).toBeUndefined()
    expect(raw?.finalScriptWitness).toBeDefined()

    const view = parsePsbtView(psbt, NETWORK)
    expect(view.inputs[SELLER_SIGNATURE_INDEX]?.signed).toBe(true)
    expect(view.inputs[SELLER_SIGNATURE_INDEX]?.sighashType).toBe(SIGHASH_NONE)
  })

  it('warns about a finalized SIGHASH_NONE input instead of passing it in silence', () => {
    const { psbt, envelope } = finalizedAt(SIGHASH_NONE)
    const view = parsePsbtView(psbt, NETWORK)
    const warnings = preSignLint(view, envelope, inscriptionContents(), view.inputs[2])
    expect(warnings.map((warning) => warning.code)).toContain('SIGHASH_NONE')
  })

  it('still reports the correct flags on a finalized, correctly signed input', () => {
    const { psbt } = finalizedAt(SIGHASH_SINGLE_ANYONECANPAY)
    const view = parsePsbtView(psbt, NETWORK)
    expect(view.inputs[SELLER_SIGNATURE_INDEX]?.sighashType).toBe(SIGHASH_SINGLE_ANYONECANPAY)
  })

  it('catches a finalized seller signature at the wrong sighash (I-19)', async () => {
    const { envelope } = finalizedAt(0x01)
    const verdict = await verifyOffer({
      ...base,
      envelope,
      role: 'buyer',
      signer: BUYER_VIEW,
      satOffset: SAT_OFFSET,
    })
    expect(verdict.errors.map((error) => error.code)).toContain(
      ProtocolErrorCode.E_SIGHASH_MISMATCH,
    )
    expect(verdict.errors.map((error) => error.invariant)).toContain('I-19')
  })
})

import type { networks } from 'bitcoinjs-lib'
import { ProtocolErrorCode, RuneBoltError, type RuneBoltErrorCode } from '../errors.js'
import type { IndexerAdapter } from '../indexer/adapter.js'
import { contentsEqual, isMixedUtxo, type UtxoContents } from '../types/attribution.js'
import { isExpired, type ListingEnvelope } from '../types/envelope.js'
import { parseLocation, sameOutpoint } from '../types/location.js'
import {
  DUMMY_UTXO_MAX_VALUE,
  DUMMY_UTXO_MIN_VALUE,
  RUNE_BUYER_RECEIVE_INDEX,
  RUNE_SELLER_INDEX,
  SELLER_SIGNATURE_INDEX,
  SIGHASH_SINGLE_ANYONECANPAY,
} from './constants.js'
import { preSignLint, type LintWarning } from './lint.js'
import { parsePsbtView, type PsbtInputView, type PsbtView } from './psbt.js'

export type SignerRole = 'seller' | 'buyer'

/**
 * Where the offer sits in the sell-offer lifecycle. It decides which inputs are expected to carry
 * a signature and nothing else — every structural check runs identically at every stage.
 *
 * | stage      | lot input             | every other input |
 * |------------|-----------------------|-------------------|
 * | `draft`    | unsigned              | unsigned          |
 * | `offer`    | signed                | unsigned          |
 * | `pre-sign` | per ownership         | per ownership     |
 * | `final`    | signed                | signed            |
 *
 * `pre-sign` is the default and is the only role-relative stage: own inputs unsigned, counterparty
 * inputs signed — "everyone else has signed and I am about to". `draft` and `offer` exist because a
 * *sell* offer is signed by the seller first, against buyer placeholders that nobody has signed
 * (SPEC §6.1): requiring counterparty signatures there would be requiring a counterparty.
 */
export type OfferStage = 'draft' | 'offer' | 'pre-sign' | 'final'

export interface SignerView {
  /** Addresses the signer controls. Ownership of inputs and outputs is decided from these. */
  readonly addresses: readonly string[]
  /** Extra outpoints the signer controls, for scripts whose address cannot be rendered. */
  readonly outpoints?: readonly string[]
}

export interface VerifyOfferParams {
  readonly envelope: ListingEnvelope
  readonly role: SignerRole
  readonly signer: SignerView
  /** Defaults to `pre-sign`, which is the checklist `ord`'s `offer accept` runs. */
  readonly stage?: OfferStage
  /** Defaults to `envelope.psbt`; pass the completed swap when the buyer verifies before signing. */
  readonly psbt?: string
  readonly indexer?: IndexerAdapter
  /** Sat offset of the inscription inside the lot (I-5). Resolved from the lot or the indexer. */
  readonly satOffset?: number
  readonly network?: networks.Network
  readonly now?: Date
}

export interface VerifyFinding {
  readonly code: RuneBoltErrorCode
  readonly invariant: string | undefined
  readonly message: string
  readonly detail: Readonly<Record<string, unknown>>
}

export interface VerifyVerdict {
  readonly ok: boolean
  readonly role: SignerRole
  readonly unsignedTxid: string | null
  readonly netDeltaSats: number | null
  readonly expectedDeltaSats: number | null
  readonly feeSats: number | null
  readonly errors: readonly VerifyFinding[]
  readonly warnings: readonly LintWarning[]
  /** Human-readable diff. verifyOffer never signs, so every call is a dry run (SPEC §7.2.5). */
  readonly diff: string
}

const TWO_DUMMY_CLASSES = new Set(['inscription', 'bitmap', 'brc20'])

/**
 * SPEC §7.2. A direct port of `ord`'s `offer/accept.rs` checklist, extended with the RuneBolt
 * index contracts (SPEC §6). Not optional and not advisory: signing helpers call it
 * unconditionally and there is no bypass flag.
 *
 * It never throws for a bad offer — every violation is collected so the caller sees all of them —
 * and it never signs. Use `assertOffer()` where a throw is wanted.
 */
export async function verifyOffer(params: VerifyOfferParams): Promise<VerifyVerdict> {
  const findings: VerifyFinding[] = []
  const add = (
    code: RuneBoltErrorCode,
    message: string,
    detail: Record<string, unknown> = {},
  ): void => {
    findings.push(finding(code, message, detail))
  }

  const { envelope, role, signer } = params
  const now = params.now ?? new Date()

  if (isExpired(envelope, now)) {
    add(ProtocolErrorCode.E_EXPIRED, 'listing has passed expiresAt', {
      expiresAt: envelope.expiresAt,
    })
  }

  let view: PsbtView
  try {
    view = parsePsbtView(params.psbt ?? envelope.psbt, params.network)
  } catch (error) {
    return verdict(role, null, null, null, null, [asFinding(error)], [], 'PSBT could not be parsed')
  }

  const lot = parseLocation(envelope.lot.location)
  // A lot location is `txid:vout[:offset]` (SPEC §3). The offset names a sat *inside* the output
  // and is not part of the outpoint a PSBT input spends, so identity is outpoint equality.
  // String-comparing the formatted location instead makes every spec-legal satpoint listing look
  // like an asset mismatch.
  const isLot = (outpoint: string): boolean => sameOutpoint(parseLocation(outpoint), lot)
  const owns = ownership(signer)
  const ownedInputs = view.inputs.filter((input) => owns(input.address, input.outpoint))
  const lotInput = view.inputs.find((input) => isLot(input.outpoint))

  if (lotInput === undefined) {
    add(ProtocolErrorCode.E_ASSET_MISMATCH, 'no PSBT input spends the listed lot', {
      lot: envelope.lot.location,
      inputs: view.inputs.map((i) => i.outpoint),
    })
  }

  // Step 2 of the checklist needs the lot's contents. Prefer a fresh indexer read (I-15, I-16);
  // fall back to the envelope's attribution, which is the seller's claim rather than a fact.
  let contents: UtxoContents = envelope.attribution.contents
  if (params.indexer !== undefined) {
    try {
      const spent = await params.indexer.isSpent(lot)
      if (spent) {
        add(ProtocolErrorCode.E_LOT_SPENT, 'the listed lot is spent or unindexed at buy time', {
          lot: envelope.lot.location,
        })
      } else {
        const fresh = await params.indexer.utxoContents(lot)
        if (!contentsEqual(fresh.contents, envelope.attribution.contents)) {
          add(ProtocolErrorCode.E_LOT_DRIFT, 'lot contents changed since listing time', {
            listed: envelope.attribution.contents,
            observed: fresh.contents,
          })
        }
        contents = fresh.contents
      }
    } catch (error) {
      findings.push(asFinding(error))
    }
  }

  // I-9. `outgoing` in ord is the set of asset-bearing inputs the signer controls: a buyer
  // legitimately owns several plain funding inputs, but neither party may put two assets in flight.
  const ownedAssetInputs = ownedInputs.filter((input) => isLot(input.outpoint))
  const expectedOwnedAssetInputs = role === 'seller' ? 1 : 0
  if (ownedAssetInputs.length !== expectedOwnedAssetInputs) {
    add(
      ProtocolErrorCode.E_MULTIPLE_OWNED_INPUTS,
      `expected ${expectedOwnedAssetInputs} asset-bearing input(s) owned by the ${role}, found ${ownedAssetInputs.length}`,
      { owned: ownedAssetInputs.map((i) => i.outpoint) },
    )
  }

  checkAssetSet(envelope, contents, add)

  const isRune = envelope.assetClass === 'rune'
  if (isRune) {
    checkRuneLayout(view, lotInput, envelope, role, owns, add)
  } else if (TWO_DUMMY_CLASSES.has(envelope.assetClass)) {
    await checkTwoDummyLayout(view, lotInput, envelope, params, contents, add)
  }

  const delta = balanceDelta(view, owns)
  const expectedDelta = expectedBalanceDelta(view, envelope, role, owns)
  if (lotInput !== undefined && delta !== expectedDelta) {
    // The one generic defence in the system (SPEC §7.2 step 3): it catches output rearrangement
    // that no named invariant enumerates.
    add(
      ProtocolErrorCode.E_BALANCE_DELTA,
      `simulated net balance delta ${delta} does not equal the asserted ${expectedDelta}`,
      { netDeltaSats: delta, expectedDeltaSats: expectedDelta, priceSats: envelope.lot.priceSats },
    )
  }

  checkSignatureState(view, ownedInputs, lotInput, envelope, params.stage ?? 'pre-sign', add)

  const warnings = preSignLint(view, envelope, contents, lotInput)

  return verdict(
    role,
    view.unsignedTxid,
    delta,
    expectedDelta,
    view.feeSats,
    findings,
    warnings,
    renderDiff(view, envelope, role, delta, expectedDelta),
  )
}

/** Throws the first violation. This is what a signing helper calls. */
export async function assertOffer(params: VerifyOfferParams): Promise<VerifyVerdict> {
  const result = await verifyOffer(params)
  const first = result.errors[0]
  if (first !== undefined) {
    throw new RuneBoltError(first.code, first.message, { ...first.detail, verdict: result.diff })
  }
  return result
}

type Add = (code: RuneBoltErrorCode, message: string, detail?: Record<string, unknown>) => void
type Owns = (address: string | undefined, outpoint?: string) => boolean

function ownership(signer: SignerView): Owns {
  const addresses = new Set(signer.addresses)
  const outpoints = new Set(signer.outpoints ?? [])
  return (address, outpoint) =>
    (address !== undefined && addresses.has(address)) ||
    (outpoint !== undefined && outpoints.has(outpoint))
}

/** SPEC §7.2 step 2 + §8.1: the declared assetClass is a hint, re-derived from the lot here. */
function checkAssetSet(envelope: ListingEnvelope, contents: UtxoContents, add: Add): void {
  if (isMixedUtxo(contents)) {
    add(ProtocolErrorCode.E_MIXED_UTXO, 'the lot is a mixed UTXO and is not listable', {
      inscriptions: contents.inscriptions.length,
      runes: contents.runes.map((r) => r.runeId ?? r.runeName),
    })
  }

  if (envelope.assetClass === 'rune') {
    if (contents.runes.length !== 1) {
      add(
        ProtocolErrorCode.E_ASSET_MISMATCH,
        `rune listing must hold exactly one rune, found ${contents.runes.length}`,
        { runes: contents.runes.map((r) => r.runeId ?? r.runeName) },
      )
    }
    return
  }

  // I-13 mirrors ord's `ensure!(runes.is_empty(), ...)` in offer/accept.rs.
  if (contents.runes.length > 0) {
    add(
      ProtocolErrorCode.E_RUNES_IN_INSCRIPTION_OFFER,
      'the lot of an inscription offer contains runes',
      { runes: contents.runes.map((r) => r.runeId ?? r.runeName) },
    )
  }
  if (contents.inscriptions.length !== 1) {
    add(
      ProtocolErrorCode.E_INSCRIPTION_COUNT,
      `expected exactly one inscription in the lot, found ${contents.inscriptions.length}`,
      { inscriptions: contents.inscriptions },
    )
  }
  if (envelope.assetClass === 'bitmap' && envelope.disclosure !== undefined) {
    const declared = envelope.disclosure.districtInscriptionId
    if (!contents.inscriptions.includes(declared)) {
      add(
        ProtocolErrorCode.E_ASSET_MISMATCH,
        'the disclosed district inscription is not in the lot',
        { declared, inscriptions: contents.inscriptions },
      )
    }
  }
}

/** SPEC §6.2. Output 0 belongs to the buyer and there is no runestone anywhere. */
function checkRuneLayout(
  view: PsbtView,
  lotInput: PsbtInputView | undefined,
  envelope: ListingEnvelope,
  role: SignerRole,
  owns: Owns,
  add: Add,
): void {
  for (const output of view.outputs) {
    if (output.isOpReturn) {
      // A malformed runestone is a cenotaph and burns every input rune (SPEC §6.2.1, R10).
      add(
        ProtocolErrorCode.E_RUNESTONE_PRESENT,
        `output ${output.index} is an OP_RETURN; the rune swap path carries none`,
        { index: output.index, runestone: output.isRunestone },
      )
    }
  }

  if (lotInput !== undefined && lotInput.index !== RUNE_SELLER_INDEX) {
    add(
      ProtocolErrorCode.E_INDEX_MISALIGNED,
      `seller rune input must be at index ${RUNE_SELLER_INDEX}, found ${lotInput.index}`,
      { index: lotInput.index },
    )
  }

  const paymentIndex = view.outputs.findIndex(
    (output) => output.address === envelope.maker.receiveAddress,
  )
  if (paymentIndex !== RUNE_SELLER_INDEX) {
    add(
      ProtocolErrorCode.E_INDEX_MISALIGNED,
      `seller payment output must be at index ${RUNE_SELLER_INDEX}, found ${paymentIndex}`,
      { paymentIndex, receiveAddress: envelope.maker.receiveAddress },
    )
  }
  const payment = view.outputs[RUNE_SELLER_INDEX]

  const receive = view.outputs[RUNE_BUYER_RECEIVE_INDEX]
  if (receive === undefined) {
    add(ProtocolErrorCode.E_RUNE_OUTPUT_INDEX, 'the swap has no output at index 0', {})
  } else if (role === 'buyer' && !owns(receive.address)) {
    // Anything but the buyer at index 0 silently takes the whole rune balance (R3).
    add(
      ProtocolErrorCode.E_RUNE_OUTPUT_INDEX,
      'output 0 is not the buyer rune-receive output; the entire rune balance would go elsewhere',
      { index: 0, address: receive.address },
    )
  } else if (role === 'seller' && (owns(receive.address) || receive.isOpReturn)) {
    add(
      ProtocolErrorCode.E_RUNE_OUTPUT_INDEX,
      'output 0 must be the counterparty rune-receive output',
      { index: 0, address: receive.address },
    )
  }

  if (lotInput !== undefined && payment !== undefined) {
    const expected = envelope.lot.priceSats + lotInput.valueSats
    if (payment.valueSats !== expected) {
      add(
        ProtocolErrorCode.E_PAYMENT_VALUE,
        `seller payment must be priceSats + input value (${expected}), found ${payment.valueSats}`,
        { expected, actual: payment.valueSats },
      )
    }
  }
}

/** SPEC §6.1. The 2-dummy layout, where every index is a value-routing decision. */
async function checkTwoDummyLayout(
  view: PsbtView,
  lotInput: PsbtInputView | undefined,
  envelope: ListingEnvelope,
  params: VerifyOfferParams,
  contents: UtxoContents,
  add: Add,
): Promise<void> {
  if (view.inputs.length < 3 || view.outputs.length < 3) {
    add(
      ProtocolErrorCode.E_INDEX_MISALIGNED,
      'the 2-dummy layout needs at least 3 inputs and 3 outputs',
      { inputs: view.inputs.length, outputs: view.outputs.length },
    )
    return
  }

  if (lotInput !== undefined && lotInput.index !== SELLER_SIGNATURE_INDEX) {
    add(
      ProtocolErrorCode.E_INDEX_MISALIGNED,
      `seller asset input must be at index ${SELLER_SIGNATURE_INDEX}, found ${lotInput.index}`,
      { index: lotInput.index },
    )
  }

  // SIGHASH_SINGLE commits to the output at the signing input's index and to nothing else, so a
  // seller payment anywhere but index 2 is not covered by the seller's signature at all.
  const paymentIndex = view.outputs.findIndex(
    (output) => output.address === envelope.maker.receiveAddress,
  )
  if (paymentIndex !== SELLER_SIGNATURE_INDEX) {
    add(
      ProtocolErrorCode.E_INDEX_MISALIGNED,
      `seller payment output must be at index ${SELLER_SIGNATURE_INDEX}, found ${paymentIndex}`,
      { paymentIndex, receiveAddress: envelope.maker.receiveAddress },
    )
  }

  const payment = view.outputs[SELLER_SIGNATURE_INDEX]
  if (lotInput !== undefined && payment !== undefined) {
    const expected = envelope.lot.priceSats + lotInput.valueSats
    if (payment.valueSats !== expected) {
      add(
        ProtocolErrorCode.E_PAYMENT_VALUE,
        `seller payment must be priceSats + postage (${expected}), found ${payment.valueSats}`,
        { expected, actual: payment.valueSats, postageSats: lotInput.valueSats },
      )
    }
  }

  const dummies = [view.inputs[0], view.inputs[1]]
  for (const [position, dummy] of dummies.entries()) {
    if (dummy === undefined || !inDummyBand(dummy.valueSats)) {
      add(
        ProtocolErrorCode.E_NO_DUMMY_UTXOS,
        `input ${position} must be a dummy UTXO in [${DUMMY_UTXO_MIN_VALUE}, ${DUMMY_UTXO_MAX_VALUE}] sat`,
        { index: position, valueSats: dummy?.valueSats },
      )
    }
  }

  const regenerated = view.outputs
    .slice(SELLER_SIGNATURE_INDEX + 1)
    .filter((output) => inDummyBand(output.valueSats)).length
  if (regenerated < 2) {
    add(
      ProtocolErrorCode.E_DUMMY_NOT_REGENERATED,
      `a purchase must emit 2 fresh dummy UTXOs, found ${regenerated}`,
      { regenerated },
    )
  }

  await checkSatOffset(view, lotInput, envelope, params, contents, add)
}

/**
 * I-5. Output 0 recombines both dummies plus the inscription's offset inside the lot, which is
 * exactly what lands the inscribed sat at offset 0 of output 1. Get it wrong and the inscription
 * ends up inside the dummy-recombine output or in the miner's fee, with no error anywhere.
 */
async function checkSatOffset(
  view: PsbtView,
  lotInput: PsbtInputView | undefined,
  envelope: ListingEnvelope,
  params: VerifyOfferParams,
  contents: UtxoContents,
  add: Add,
): Promise<void> {
  const assetOutput = view.outputs[1]
  if (assetOutput === undefined || assetOutput.isOpReturn) {
    add(ProtocolErrorCode.E_SAT_OFFSET, 'output 1 must carry the asset to the buyer', { index: 1 })
    return
  }

  // Two sources that disagree route the inscribed sat to two different places, and preferring
  // either one silently picks a winner. Refuse instead.
  const fromLot = parseLocation(envelope.lot.location).offset
  if (params.satOffset !== undefined && fromLot !== undefined && fromLot !== params.satOffset) {
    add(
      ProtocolErrorCode.E_SAT_OFFSET,
      `satOffset ${params.satOffset} disagrees with the offset ${fromLot} in the lot location`,
      { satOffset: params.satOffset, locationOffset: fromLot, lot: envelope.lot.location },
    )
    return
  }

  const satOffset = await resolveSatOffset(envelope, params, contents)
  if (satOffset === undefined) {
    // Fail closed: without the offset the routing of the inscribed sat cannot be verified at all.
    add(
      ProtocolErrorCode.E_SAT_OFFSET,
      'sat offset of the inscription inside the lot is unknown; pass satOffset or an indexer',
      { lot: envelope.lot.location },
    )
    return
  }

  const dummy0 = view.inputs[0]?.valueSats
  const dummy1 = view.inputs[1]?.valueSats
  const recombine = view.outputs[0]?.valueSats
  if (dummy0 === undefined || dummy1 === undefined || recombine === undefined) return

  const expected = dummy0 + dummy1 + satOffset
  if (recombine !== expected) {
    add(
      ProtocolErrorCode.E_SAT_OFFSET,
      `output 0 must be dummy1 + dummy2 + satOffset (${expected}), found ${recombine}`,
      { expected, actual: recombine, satOffset },
    )
  }

  if (lotInput !== undefined && satOffset >= lotInput.valueSats) {
    add(ProtocolErrorCode.E_SAT_OFFSET, 'sat offset lies outside the lot', {
      satOffset,
      lotValueSats: lotInput.valueSats,
    })
  }
}

async function resolveSatOffset(
  envelope: ListingEnvelope,
  params: VerifyOfferParams,
  contents: UtxoContents,
): Promise<number | undefined> {
  if (params.satOffset !== undefined) return params.satOffset

  const fromLot = parseLocation(envelope.lot.location).offset
  if (fromLot !== undefined) return fromLot

  const inscriptionId = contents.inscriptions[0]
  if (params.indexer === undefined || inscriptionId === undefined) return undefined
  try {
    const info = await params.indexer.inscriptionInfo(inscriptionId)
    return parseSatpointOffset(info.satpoint)
  } catch {
    return undefined
  }
}

function parseSatpointOffset(satpoint: string): number | undefined {
  const parts = satpoint.split(':')
  const raw = parts[2]
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined
  const offset = Number(raw)
  return Number.isSafeInteger(offset) ? offset : undefined
}

function inDummyBand(value: number): boolean {
  return value >= DUMMY_UTXO_MIN_VALUE && value <= DUMMY_UTXO_MAX_VALUE
}

/** I-12, plus I-19 on the sighash flags the seller's signature actually carries. */
function checkSignatureState(
  view: PsbtView,
  ownedInputs: readonly PsbtInputView[],
  lotInput: PsbtInputView | undefined,
  envelope: ListingEnvelope,
  stage: OfferStage,
  add: Add,
): void {
  const owned = new Set(ownedInputs.map((input) => input.index))

  for (const input of view.inputs) {
    const isLot = lotInput !== undefined && input.index === lotInput.index
    const expected = expectedSignature(stage, owned.has(input.index), isLot)
    if (expected === 'signed' && !input.signed) {
      add(ProtocolErrorCode.E_SIGNATURE_STATE, `input ${input.index} is unsigned at stage ${stage}`, {
        index: input.index,
        stage,
      })
    }
    if (expected === 'unsigned' && input.signed) {
      add(
        ProtocolErrorCode.E_SIGNATURE_STATE,
        `input ${input.index} is already signed at stage ${stage}`,
        { index: input.index, stage },
      )
    }
  }

  // I-19. Judged from the signature itself, not from the unsigned `sighashType` hint, and judged
  // wherever the lot input carries one: a seller who signs SIGHASH_ALL by accident has signed a
  // transaction the buyer can no longer complete, and one who signs SIGHASH_NONE has signed away
  // the output that pays them.
  if (
    lotInput?.signed === true &&
    envelope.sighashMode === 'SINGLE_ACAP' &&
    lotInput.sighashType !== SIGHASH_SINGLE_ANYONECANPAY
  ) {
    add(
      ProtocolErrorCode.E_SIGHASH_MISMATCH,
      `seller signature must be SIGHASH_SINGLE|ANYONECANPAY (0x83) for sighashMode SINGLE_ACAP, found ${describeSighash(lotInput.sighashType)}`,
      { sighashType: lotInput.sighashType, sighashMode: envelope.sighashMode },
    )
  }
}

function expectedSignature(
  stage: OfferStage,
  isOwn: boolean,
  isLot: boolean,
): 'signed' | 'unsigned' {
  switch (stage) {
    case 'draft':
      return 'unsigned'
    case 'offer':
      return isLot ? 'signed' : 'unsigned'
    case 'final':
      return 'signed'
    case 'pre-sign':
      return isOwn ? 'unsigned' : 'signed'
  }
}

function describeSighash(value: number | undefined): string {
  return value === undefined ? 'none' : `0x${value.toString(16)}`
}

function balanceDelta(view: PsbtView, owns: Owns): number {
  const inputs = view.inputs
    .filter((input) => owns(input.address, input.outpoint))
    .reduce((sum, input) => sum + input.valueSats, 0)
  const outputs = view.outputs
    .filter((output) => owns(output.address))
    .reduce((sum, output) => sum + output.valueSats, 0)
  return outputs - inputs
}

/**
 * The seller's delta is the asserted price exactly. The buyer's is the price plus the miner fee
 * plus anything paid to a third party (a platform fee), all of which are derivable from the PSBT —
 * so the buyer check is as exact as the seller's, not a tolerance.
 */
function expectedBalanceDelta(
  view: PsbtView,
  envelope: ListingEnvelope,
  role: SignerRole,
  owns: Owns,
): number {
  if (role === 'seller') return envelope.lot.priceSats

  const thirdParty = view.outputs
    .filter(
      (output) =>
        !owns(output.address) &&
        output.address !== envelope.maker.receiveAddress &&
        output.address !== envelope.maker.address,
    )
    .reduce((sum, output) => sum + output.valueSats, 0)
  return -(envelope.lot.priceSats + view.feeSats + thirdParty)
}

function renderDiff(
  view: PsbtView,
  envelope: ListingEnvelope,
  role: SignerRole,
  delta: number,
  expectedDelta: number,
): string {
  const lines = [
    `txid (unsigned)   ${view.unsignedTxid}`,
    `role              ${role}`,
    `asset class       ${envelope.assetClass} (declared)`,
    `lot               ${envelope.lot.location}`,
    `price             ${envelope.lot.priceSats} sat`,
    `fee               ${view.feeSats} sat`,
    `net balance       ${delta >= 0 ? '+' : ''}${delta} sat (expected ${expectedDelta >= 0 ? '+' : ''}${expectedDelta})`,
    `indexer           ${envelope.attribution.indexer} ${envelope.attribution.indexerVersion} @ height ${envelope.attribution.blockHeight}`,
    'inputs',
    ...view.inputs.map(
      (input) =>
        `  [${input.index}] ${input.outpoint} ${input.valueSats} sat ${input.signed ? `signed ${describeSighash(input.sighashType)}` : 'unsigned'} ${input.address ?? '<script>'}`,
    ),
    'outputs',
    ...view.outputs.map(
      (output) =>
        `  [${output.index}] ${output.valueSats} sat ${output.isRunestone ? 'RUNESTONE' : output.isOpReturn ? 'OP_RETURN' : (output.address ?? '<script>')}`,
    ),
  ]
  return lines.join('\n')
}

function finding(
  code: RuneBoltErrorCode,
  message: string,
  detail: Record<string, unknown>,
): VerifyFinding {
  const error = new RuneBoltError(code, message, detail)
  return { code, invariant: error.invariant, message, detail: error.detail }
}

function asFinding(error: unknown): VerifyFinding {
  if (error instanceof RuneBoltError) {
    return { code: error.code, invariant: error.invariant, message: error.message, detail: error.detail }
  }
  throw error
}

function verdict(
  role: SignerRole,
  unsignedTxid: string | null,
  netDeltaSats: number | null,
  expectedDeltaSats: number | null,
  feeSats: number | null,
  errors: readonly VerifyFinding[],
  warnings: readonly LintWarning[],
  diff: string,
): VerifyVerdict {
  return {
    ok: errors.length === 0,
    role,
    unsignedTxid,
    netDeltaSats,
    expectedDeltaSats,
    feeSats,
    errors,
    warnings,
    diff,
  }
}

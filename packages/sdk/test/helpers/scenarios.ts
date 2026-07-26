import type { ListingEnvelope } from '../../src/types/envelope.js'
import type { UtxoContents } from '../../src/types/attribution.js'
import {
  BUYER,
  SELLER,
  SELLER_PAYOUT,
  buildPsbt,
  envelope,
  input,
  inscriptionContents,
  runeContents,
  type FixtureInput,
  type FixtureOutput,
} from './swap.js'

/**
 * The canonical, spec-conforming swaps. Every adversarial fixture is a named deviation from one
 * of these, so a test reads as "this one thing is wrong".
 */

export const DUMMY_VALUE = 600
export const LOT_VALUE = 10_000
export const SAT_OFFSET = 5_000
export const PRICE = 250_000
export const FUNDING = 400_000
export const FEE = 2_000

export const RUNE_LOT_VALUE = 546
export const RUNE_PRICE = 100_000
export const RUNE_FUNDING = 300_000
export const RUNE_FUNDING_2 = 50_000
export const RUNE_FEE = 1_500

export interface Scenario {
  readonly psbt: string
  readonly envelope: ListingEnvelope
  readonly lotInput: FixtureInput
  readonly outputs: readonly FixtureOutput[]
}

export interface TwoDummyOverrides {
  readonly outputs?: readonly FixtureOutput[]
  readonly inputs?: readonly FixtureInput[]
  readonly signers?: readonly ('buyer' | 'seller')[]
  readonly sellerInputIndex?: number
  readonly sellerSighashType?: number
  readonly priceSats?: number
  readonly contents?: UtxoContents
  readonly assetClass?: ListingEnvelope['assetClass']
  readonly expiresAt?: string
  readonly disclosure?: ListingEnvelope['disclosure']
  readonly lotLocation?: string
}

export function twoDummyInputs(): FixtureInput[] {
  return [
    input(0xa1, DUMMY_VALUE, BUYER),
    input(0xa2, DUMMY_VALUE, BUYER),
    input(0xa3, LOT_VALUE, SELLER),
    input(0xa4, FUNDING, BUYER),
  ]
}

export function twoDummyOutputs(): FixtureOutput[] {
  const totalIn = DUMMY_VALUE * 2 + LOT_VALUE + FUNDING
  const recombine = DUMMY_VALUE * 2 + SAT_OFFSET
  const payment = PRICE + LOT_VALUE
  const change = totalIn - recombine - LOT_VALUE - payment - DUMMY_VALUE * 2 - FEE
  return [
    { valueSats: recombine, owner: BUYER },
    { valueSats: LOT_VALUE, owner: BUYER },
    { valueSats: payment, owner: SELLER_PAYOUT },
    { valueSats: DUMMY_VALUE, owner: BUYER },
    { valueSats: DUMMY_VALUE, owner: BUYER },
    { valueSats: change, owner: BUYER },
  ]
}

/** SPEC §6.1, inscription/bitmap/BRC-20. */
export function twoDummyScenario(overrides: TwoDummyOverrides = {}): Scenario {
  const inputs = overrides.inputs ?? twoDummyInputs()
  const outputs = overrides.outputs ?? twoDummyOutputs()
  const sellerInputIndex = overrides.sellerInputIndex ?? 2
  const lotInput = inputs[sellerInputIndex]
  if (lotInput === undefined) throw new Error('scenario has no seller input')

  const psbt = buildPsbt({
    inputs,
    outputs,
    sellerInputIndex,
    signers: overrides.signers ?? ['buyer'],
    ...(overrides.sellerSighashType === undefined
      ? {}
      : { sellerSighashType: overrides.sellerSighashType }),
  })

  return {
    psbt,
    lotInput,
    outputs,
    envelope: envelope({
      assetClass: overrides.assetClass ?? 'inscription',
      lotInput,
      priceSats: overrides.priceSats ?? PRICE,
      psbt,
      contents: overrides.contents ?? inscriptionContents(),
      ...(overrides.expiresAt === undefined ? {} : { expiresAt: overrides.expiresAt }),
      ...(overrides.disclosure === undefined ? {} : { disclosure: overrides.disclosure }),
      ...(overrides.lotLocation === undefined ? {} : { lotLocation: overrides.lotLocation }),
    }),
  }
}

export interface RuneOverrides {
  readonly outputs?: readonly FixtureOutput[]
  readonly inputs?: readonly FixtureInput[]
  readonly signers?: readonly ('buyer' | 'seller')[]
  readonly sellerInputIndex?: number
  readonly priceSats?: number
  readonly contents?: UtxoContents
}

export function runeInputs(): FixtureInput[] {
  return [
    input(0xb1, RUNE_FUNDING, BUYER),
    input(0xb2, RUNE_LOT_VALUE, SELLER),
    input(0xb3, RUNE_FUNDING_2, BUYER),
  ]
}

export function runeOutputs(): FixtureOutput[] {
  const totalIn = RUNE_FUNDING + RUNE_LOT_VALUE + RUNE_FUNDING_2
  const payment = RUNE_PRICE + RUNE_LOT_VALUE
  const change = totalIn - RUNE_LOT_VALUE - payment - RUNE_FEE
  return [
    { valueSats: RUNE_LOT_VALUE, owner: BUYER },
    { valueSats: payment, owner: SELLER_PAYOUT },
    { valueSats: change, owner: BUYER },
  ]
}

/** SPEC §6.2, runestone-free. */
export function runeScenario(overrides: RuneOverrides = {}): Scenario {
  const inputs = overrides.inputs ?? runeInputs()
  const outputs = overrides.outputs ?? runeOutputs()
  const sellerInputIndex = overrides.sellerInputIndex ?? 1
  const lotInput = inputs[sellerInputIndex]
  if (lotInput === undefined) throw new Error('scenario has no seller input')

  const psbt = buildPsbt({
    inputs,
    outputs,
    sellerInputIndex,
    signers: overrides.signers ?? ['buyer'],
  })

  return {
    psbt,
    lotInput,
    outputs,
    envelope: envelope({
      assetClass: 'rune',
      lotInput,
      priceSats: overrides.priceSats ?? RUNE_PRICE,
      psbt,
      contents: overrides.contents ?? runeContents(),
    }),
  }
}

import type { UtxoContents } from '../types/attribution.js'
import type { ListingEnvelope } from '../types/envelope.js'
import { DUST_LIMIT_SATS, SIGHASH_NONE } from './constants.js'
import type { PsbtInputView, PsbtView } from './psbt.js'

/**
 * SPEC §7.3. Ported from Unisat's signing-screen warnings. The lint runs after verifyOffer() and
 * surfaces warnings to a human; it does not block programmatically.
 */
export const LINT_CODES = [
  'SIGHASH_NONE',
  'ASSET_BURN_RISK',
  'MIXED_ASSET_TRANSACTION',
  'INSCRIPTION_MERGE',
  'INSCRIPTION_VALUE_CHANGE',
  'DUST_OUTPUT',
  'FEE_ANOMALY',
] as const

export type LintCode = (typeof LINT_CODES)[number]

export interface LintWarning {
  readonly code: LintCode
  readonly message: string
  readonly detail: Readonly<Record<string, unknown>>
}

/** Warn when the miner fee exceeds this share of the asking price. */
const FEE_SHARE_WARNING = 0.25

export function preSignLint(
  view: PsbtView,
  envelope: ListingEnvelope,
  contents: UtxoContents,
  lotInput: PsbtInputView | undefined,
): LintWarning[] {
  const warnings: LintWarning[] = []
  const warn = (code: LintCode, message: string, detail: Record<string, unknown> = {}): void => {
    warnings.push({ code, message, detail: Object.freeze({ ...detail }) })
  }

  for (const input of view.inputs) {
    if (input.sighashType !== undefined && (input.sighashType & 0x1f) === SIGHASH_NONE) {
      warn('SIGHASH_NONE', `input ${input.index} is signed SIGHASH_NONE and commits to no output`, {
        index: input.index,
      })
    }
  }

  const assetOutputIndex = envelope.assetClass === 'rune' ? 0 : 1
  const assetOutput = view.outputs[assetOutputIndex]
  if (assetOutput === undefined || assetOutput.isOpReturn) {
    warn('ASSET_BURN_RISK', `no asset-receive output at index ${assetOutputIndex}`, {
      assetOutputIndex,
    })
  } else if (assetOutput.valueSats < DUST_LIMIT_SATS) {
    warn('ASSET_BURN_RISK', 'the asset-receive output is below the dust limit', {
      valueSats: assetOutput.valueSats,
    })
  }

  const families = [
    contents.inscriptions.length > 0 ? 'inscription' : undefined,
    contents.runes.length > 0 ? 'rune' : undefined,
    contents.brc20.length > 0 ? 'brc20' : undefined,
  ].filter((family): family is string => family !== undefined)
  if (families.length > 1) {
    warn('MIXED_ASSET_TRANSACTION', `the lot mixes ${families.join(' + ')}`, { families })
  }

  if (contents.inscriptions.length > 1) {
    warn('INSCRIPTION_MERGE', `${contents.inscriptions.length} inscriptions share the lot`, {
      inscriptions: contents.inscriptions,
    })
  }

  if (lotInput !== undefined && assetOutput !== undefined && envelope.assetClass !== 'rune') {
    if (assetOutput.valueSats !== lotInput.valueSats) {
      warn('INSCRIPTION_VALUE_CHANGE', 'the inscription output value differs from the lot value', {
        lotValueSats: lotInput.valueSats,
        outputValueSats: assetOutput.valueSats,
      })
    }
  }

  for (const output of view.outputs) {
    if (!output.isOpReturn && output.valueSats < DUST_LIMIT_SATS) {
      warn('DUST_OUTPUT', `output ${output.index} is below the dust limit`, {
        index: output.index,
        valueSats: output.valueSats,
      })
    }
  }

  if (view.feeSats < 0) {
    warn('FEE_ANOMALY', 'outputs exceed inputs', { feeSats: view.feeSats })
  } else if (view.feeSats > envelope.lot.priceSats * FEE_SHARE_WARNING) {
    warn('FEE_ANOMALY', 'the miner fee is a large share of the asking price', {
      feeSats: view.feeSats,
      priceSats: envelope.lot.priceSats,
    })
  }

  return warnings
}

import { address as addressModule, networks, Psbt } from 'bitcoinjs-lib'
import { ImplementationErrorCode, RuneBoltError } from '../errors.js'
import { parseLocation } from '../types/location.js'

/**
 * Transaction-building primitives shared by both wire formats (SPEC §6.1 and §6.2). They live
 * apart from the builders so the rune path and the 2-dummy path can each own their arrangement
 * without importing each other.
 */

export type Network = networks.Network

export interface SwapUtxo {
  /** `txid:vout`. */
  readonly outpoint: string
  readonly valueSats: number
  /** scriptPubKey, hex or raw bytes. */
  readonly script: string | Uint8Array
  readonly sequence?: number
}

export function addInput(psbt: Psbt, utxo: SwapUtxo): void {
  const { txid, vout } = parseLocation(utxo.outpoint)
  psbt.addInput({
    hash: txid,
    index: vout,
    witnessUtxo: { script: Buffer.from(toScript(utxo.script)), value: utxo.valueSats },
    ...(utxo.sequence === undefined ? {} : { sequence: utxo.sequence }),
  })
}

export function toScript(script: string | Uint8Array): Buffer {
  return typeof script === 'string' ? Buffer.from(script, 'hex') : Buffer.from(script)
}

export function addressToScript(address: string, network: Network): Uint8Array {
  try {
    return Uint8Array.from(addressModule.toOutputScript(address, network))
  } catch (error) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_PSBT,
      `address ${address} is not valid on this network`,
      { address, cause: String(error) },
    )
  }
}

type PsbtInputData = Psbt['data']['inputs'][number]

/** Everything a counterparty's signed input must keep when the transaction is rebuilt around it. */
export function signatureFields(input: PsbtInputData): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  if (input.witnessUtxo !== undefined) fields['witnessUtxo'] = input.witnessUtxo
  if (input.nonWitnessUtxo !== undefined) fields['nonWitnessUtxo'] = input.nonWitnessUtxo
  if (input.sighashType !== undefined) fields['sighashType'] = input.sighashType
  if (input.partialSig !== undefined) fields['partialSig'] = input.partialSig
  if (input.tapKeySig !== undefined) fields['tapKeySig'] = input.tapKeySig
  if (input.tapScriptSig !== undefined) fields['tapScriptSig'] = input.tapScriptSig
  if (input.tapLeafScript !== undefined) fields['tapLeafScript'] = input.tapLeafScript
  if (input.tapInternalKey !== undefined) fields['tapInternalKey'] = input.tapInternalKey
  if (input.tapMerkleRoot !== undefined) fields['tapMerkleRoot'] = input.tapMerkleRoot
  if (input.redeemScript !== undefined) fields['redeemScript'] = input.redeemScript
  if (input.witnessScript !== undefined) fields['witnessScript'] = input.witnessScript
  if (input.finalScriptSig !== undefined) fields['finalScriptSig'] = input.finalScriptSig
  if (input.finalScriptWitness !== undefined) fields['finalScriptWitness'] = input.finalScriptWitness
  return fields
}

/**
 * I-5. A lot location may be a `txid:vout:offset` satpoint, in which case it already states where
 * the inscribed sat sits. An explicit `satOffset` wins, but two sources that disagree route the sat
 * to two different outputs, so a disagreement is refused rather than resolved by precedence.
 */
export function resolveLotSatOffset(location: string, satOffset: number | undefined): number {
  const fromLocation = parseLocation(location).offset
  if (satOffset === undefined) {
    if (fromLocation === undefined) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_MALFORMED_LOCATION,
        'the sat offset is unknown: pass satOffset, or a txid:vout:offset lot location',
        { location },
      )
    }
    return fromLocation
  }
  if (fromLocation !== undefined && fromLocation !== satOffset) {
    throw new RuneBoltError(
      ImplementationErrorCode.E_MALFORMED_LOCATION,
      `satOffset ${satOffset} disagrees with the offset ${fromLocation} in the lot location`,
      { location, satOffset, locationOffset: fromLocation },
    )
  }
  return satOffset
}

import { address as bitcoinAddress, networks, Psbt, Transaction } from 'bitcoinjs-lib'
import { ImplementationErrorCode, RuneBoltError } from '../errors.js'

export type Network = networks.Network

export interface PsbtInputView {
  readonly index: number
  readonly outpoint: string
  readonly valueSats: number
  readonly script: Uint8Array
  readonly address: string | undefined
  readonly signed: boolean
  readonly sighashType: number | undefined
}

export interface PsbtOutputView {
  readonly index: number
  readonly valueSats: number
  readonly script: Uint8Array
  readonly address: string | undefined
  readonly isOpReturn: boolean
  readonly isRunestone: boolean
}

export interface PsbtView {
  readonly unsignedTxid: string
  readonly inputs: readonly PsbtInputView[]
  readonly outputs: readonly PsbtOutputView[]
  readonly totalInputSats: number
  readonly totalOutputSats: number
  readonly feeSats: number
}

const OP_RETURN = 0x6a
const OP_13 = 0x5d

export function parsePsbtView(base64: string, network: Network = networks.bitcoin): PsbtView {
  let psbt: Psbt
  try {
    psbt = Psbt.fromBase64(base64, { network })
  } catch (error) {
    throw new RuneBoltError(ImplementationErrorCode.E_MALFORMED_PSBT, 'PSBT did not deserialize', {
      cause: String(error),
    })
  }

  const inputs = psbt.txInputs.map((txInput, index): PsbtInputView => {
    const data = psbt.data.inputs[index]
    if (data === undefined) {
      throw new RuneBoltError(ImplementationErrorCode.E_MALFORMED_PSBT, `input ${index} has no data`, {
        index,
      })
    }
    const prevout = resolvePrevout(data, txInput.index, index)
    return {
      index,
      outpoint: `${Buffer.from(txInput.hash).reverse().toString('hex')}:${txInput.index}`,
      valueSats: prevout.value,
      script: prevout.script,
      address: scriptToAddress(prevout.script, network),
      signed: isSigned(data),
      sighashType: signatureSighashType(data),
    }
  })

  const outputs = psbt.txOutputs.map((txOutput, index): PsbtOutputView => {
    const script = Uint8Array.from(txOutput.script)
    const isOpReturn = script[0] === OP_RETURN
    return {
      index,
      valueSats: txOutput.value,
      script,
      address: scriptToAddress(script, network),
      isOpReturn,
      isRunestone: isOpReturn && script[1] === OP_13,
    }
  })

  const totalInputSats = inputs.reduce((sum, input) => sum + input.valueSats, 0)
  const totalOutputSats = outputs.reduce((sum, output) => sum + output.valueSats, 0)

  return {
    unsignedTxid: unsignedTxid(psbt),
    inputs,
    outputs,
    totalInputSats,
    totalOutputSats,
    feeSats: totalInputSats - totalOutputSats,
  }
}

/** Segwit-only layouts, so the unsigned txid is the final txid. */
function unsignedTxid(psbt: Psbt): string {
  const tx = new Transaction()
  tx.version = psbt.version
  tx.locktime = psbt.locktime
  for (const input of psbt.txInputs) tx.addInput(Buffer.from(input.hash), input.index, input.sequence)
  for (const output of psbt.txOutputs) tx.addOutput(Buffer.from(output.script), output.value)
  return tx.getId()
}

interface Prevout {
  value: number
  script: Uint8Array
}

function resolvePrevout(
  data: Psbt['data']['inputs'][number],
  vout: number,
  index: number,
): Prevout {
  if (data.witnessUtxo !== undefined) {
    return { value: data.witnessUtxo.value, script: Uint8Array.from(data.witnessUtxo.script) }
  }
  if (data.nonWitnessUtxo !== undefined) {
    const prevTx = Transaction.fromBuffer(Buffer.from(data.nonWitnessUtxo))
    const out = prevTx.outs[vout]
    if (out === undefined) {
      throw new RuneBoltError(
        ImplementationErrorCode.E_MALFORMED_PSBT,
        `input ${index} references a missing prevout`,
        { index, vout },
      )
    }
    return { value: out.value, script: Uint8Array.from(out.script) }
  }
  // Without prevout values the balance-delta simulation (I-11) cannot run, so refuse to guess.
  throw new RuneBoltError(
    ImplementationErrorCode.E_MALFORMED_PSBT,
    `input ${index} carries no witnessUtxo or nonWitnessUtxo`,
    { index },
  )
}

function isSigned(data: Psbt['data']['inputs'][number]): boolean {
  return (
    (data.partialSig?.length ?? 0) > 0 ||
    data.tapKeySig !== undefined ||
    (data.tapScriptSig?.length ?? 0) > 0 ||
    data.finalScriptSig !== undefined ||
    data.finalScriptWitness !== undefined
  )
}

/**
 * The sighash byte carried by the signature itself, which is what a verifier must judge — an
 * unsigned `sighashType` hint is only a request. ECDSA appends the byte to the DER signature;
 * Schnorr appends it only when it is not SIGHASH_DEFAULT (a bare 64-byte tapKeySig).
 */
function signatureSighashType(data: Psbt['data']['inputs'][number]): number | undefined {
  const partial = data.partialSig?.[0]?.signature
  if (partial !== undefined && partial.length > 0) return partial[partial.length - 1]
  if (data.tapKeySig !== undefined) {
    return data.tapKeySig.length === 65 ? data.tapKeySig[64] : Transaction.SIGHASH_DEFAULT
  }
  return data.sighashType
}

function scriptToAddress(script: Uint8Array, network: Network): string | undefined {
  try {
    return bitcoinAddress.fromOutputScript(Buffer.from(script), network)
  } catch {
    return undefined
  }
}

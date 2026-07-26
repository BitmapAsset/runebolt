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
 *
 * Finalizing an input moves the signature into the witness and drops `partialSig` *and*
 * `sighashType` (BIP-174 §finalizer). Reading the hint after that returns `undefined` and every
 * sighash judgement — I-19 and the SIGHASH_NONE lint alike — goes quiet on exactly the PSBTs that
 * arrive already finalized from a wallet. So the finalized witness is parsed instead.
 */
function signatureSighashType(data: Psbt['data']['inputs'][number]): number | undefined {
  const partial = data.partialSig?.[0]?.signature
  if (partial !== undefined && partial.length > 0) return partial[partial.length - 1]
  if (data.tapKeySig !== undefined) {
    return data.tapKeySig.length === 65 ? data.tapKeySig[64] : Transaction.SIGHASH_DEFAULT
  }
  const tapScript = data.tapScriptSig?.[0]?.signature
  if (tapScript !== undefined) {
    return tapScript.length === 65 ? tapScript[64] : Transaction.SIGHASH_DEFAULT
  }
  return finalizedSighashType(data) ?? data.sighashType
}

function finalizedSighashType(data: Psbt['data']['inputs'][number]): number | undefined {
  const items =
    data.finalScriptWitness === undefined
      ? undefined
      : witnessStack(Uint8Array.from(data.finalScriptWitness))
  const candidates =
    items ??
    (data.finalScriptSig === undefined
      ? []
      : scriptPushes(Uint8Array.from(data.finalScriptSig)))
  for (const item of candidates) {
    const sighash = sighashOfSignature(item)
    if (sighash !== undefined) return sighash
  }
  return undefined
}

/** DER first: a DER signature can itself be 64 or 65 bytes long, which Schnorr sizing would eat. */
function sighashOfSignature(item: Uint8Array): number | undefined {
  if (item[0] === 0x30 && item.length >= 9 && item.length <= 73) return item[item.length - 1]
  if (item.length === 64) return Transaction.SIGHASH_DEFAULT
  if (item.length === 65) return item[64]
  return undefined
}

/** `finalScriptWitness` is a serialized stack: compact-size count, then length-prefixed items. */
function witnessStack(witness: Uint8Array): Uint8Array[] | undefined {
  const count = compactSize(witness, 0)
  if (count === undefined) return undefined
  let offset = count.size
  const items: Uint8Array[] = []
  for (let i = 0; i < count.value; i += 1) {
    const length = compactSize(witness, offset)
    if (length === undefined) return undefined
    offset += length.size
    if (offset + length.value > witness.length) return undefined
    items.push(witness.subarray(offset, offset + length.value))
    offset += length.value
  }
  return offset === witness.length ? items : undefined
}

/** A signed legacy or P2SH scriptSig is push-only, so the signature is one of the pushed items. */
function scriptPushes(script: Uint8Array): Uint8Array[] {
  const pushes: Uint8Array[] = []
  let offset = 0
  while (offset < script.length) {
    const op = script[offset]
    if (op === undefined || op > 0x4e) break
    offset += 1
    let length = op
    if (op === 0x4c || op === 0x4d || op === 0x4e) {
      const width = op === 0x4c ? 1 : op === 0x4d ? 2 : 4
      if (offset + width > script.length) break
      length = 0
      for (let i = 0; i < width; i += 1) length += (script[offset + i] ?? 0) * 256 ** i
      offset += width
    }
    if (offset + length > script.length) break
    pushes.push(script.subarray(offset, offset + length))
    offset += length
  }
  return pushes
}

function compactSize(
  bytes: Uint8Array,
  offset: number,
): { value: number; size: number } | undefined {
  const first = bytes[offset]
  if (first === undefined) return undefined
  if (first < 0xfd) return { value: first, size: 1 }
  const width = first === 0xfd ? 2 : first === 0xfe ? 4 : 0
  // 0xff would be an eight-byte length: not a witness item that exists.
  if (width === 0 || offset + 1 + width > bytes.length) return undefined
  let value = 0
  for (let i = 0; i < width; i += 1) value += (bytes[offset + 1 + i] ?? 0) * 256 ** i
  return { value, size: 1 + width }
}

function scriptToAddress(script: Uint8Array, network: Network): string | undefined {
  try {
    return bitcoinAddress.fromOutputScript(Buffer.from(script), network)
  } catch {
    return undefined
  }
}

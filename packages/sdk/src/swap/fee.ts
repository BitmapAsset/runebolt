/**
 * Transaction size estimation, used to turn a fee rate into a fee. Deliberately shape-based rather
 * than wallet-aware: the SDK never holds keys (ARCHITECTURE §1.1(3)) and so only ever sees
 * scriptPubKeys. Unknown shapes are charged the P2PKH worst case rather than guessed cheap — an
 * underestimate is a stuck transaction carrying an asset.
 */

/** Either an exact fee or a rate to derive one from. Exactly one, chosen by the caller. */
export type FeeChoice = { readonly totalSats: number } | { readonly rateSatPerVb: number }

const OP_DUP = 0x76
const OP_HASH160 = 0xa9
const OP_0 = 0x00
const OP_1 = 0x51
const OP_RETURN = 0x6a

interface Weights {
  readonly input: number
  readonly output: number
}

const P2WPKH: Weights = { input: 68, output: 31 }
const P2WSH: Weights = { input: 105, output: 43 }
const P2TR: Weights = { input: 58, output: 43 }
const P2SH: Weights = { input: 91, output: 32 }
const P2PKH: Weights = { input: 148, output: 34 }

/** 4 version + 4 locktime + 2 segwit marker/flag (0.5 vB) + 2 varint counts, rounded up. */
const TX_OVERHEAD_VB = 11

function weights(script: Uint8Array): Weights {
  if (script.length === 22 && script[0] === OP_0) return P2WPKH
  if (script.length === 34 && script[0] === OP_0) return P2WSH
  if (script.length === 34 && script[0] === OP_1) return P2TR
  if (script.length === 23 && script[0] === OP_HASH160) return P2SH
  if (script.length === 25 && script[0] === OP_DUP) return P2PKH
  return P2PKH
}

export function estimateVsize(
  inputScripts: readonly Uint8Array[],
  outputScripts: readonly Uint8Array[],
): number {
  let vsize = TX_OVERHEAD_VB
  for (const script of inputScripts) vsize += weights(script).input
  for (const script of outputScripts) {
    vsize += script[0] === OP_RETURN ? 9 + script.length : weights(script).output
  }
  return Math.ceil(vsize)
}

export function resolveFee(
  fee: FeeChoice,
  inputScripts: readonly Uint8Array[],
  outputScripts: readonly Uint8Array[],
): { feeSats: number; vsize: number } {
  const vsize = estimateVsize(inputScripts, outputScripts)
  if ('totalSats' in fee) return { feeSats: fee.totalSats, vsize }
  return { feeSats: Math.ceil(vsize * fee.rateSatPerVb), vsize }
}

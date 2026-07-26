import { crypto as bitcoinCrypto, networks, payments } from 'bitcoinjs-lib'

/**
 * SPEC §6.1. A *sell* offer is signed by the seller before a buyer exists, but
 * `SIGHASH_SINGLE|ANYONECANPAY` is only safe inside the full canonical arrangement: the signature
 * commits to the output at the signing input's index, so the seller's input must already sit at
 * index 2 with its payment at output 2 when the signature is made. The two buyer dummies and the
 * buyer's outputs therefore have to exist at signing time even though the buyer does not.
 *
 * They exist as **placeholders**: a deterministic, nothing-up-my-sleeve identity that no one holds
 * a key for. `completeSwap()` replaces every one of them with the real buyer's UTXOs and addresses,
 * which the seller's signature permits — ANYONECANPAY commits to no other input, and SIGHASH_SINGLE
 * commits to no other output.
 *
 * The identity is deterministic so that a book, a verifier or a human reading a PSBT can recognise
 * an offer that still carries placeholders, rather than mistaking one for a completed swap.
 */

export const PLACEHOLDER_LABEL = 'RUNEBOLT/PLACEHOLDER/v1'

const LABEL_BYTES = Buffer.from(PLACEHOLDER_LABEL, 'utf8')

/** P2WPKH over hash160(label). No private key exists for it, by construction. */
export function placeholderScript(): Uint8Array {
  const payment = payments.p2wpkh({
    hash: bitcoinCrypto.hash160(LABEL_BYTES),
    network: networks.bitcoin,
  })
  if (payment.output === undefined) throw new Error('placeholder script could not be derived')
  return Uint8Array.from(payment.output)
}

export function placeholderAddress(network: networks.Network = networks.bitcoin): string {
  const payment = payments.p2wpkh({ hash: bitcoinCrypto.hash160(LABEL_BYTES), network })
  if (payment.address === undefined) throw new Error('placeholder address could not be derived')
  return payment.address
}

/** Distinct, recognisable outpoints. A transaction may not repeat one, so the index is the vout. */
export function placeholderOutpoint(index: number): string {
  return `${bitcoinCrypto.sha256(LABEL_BYTES).toString('hex')}:${index}`
}

export function isPlaceholderScript(script: Uint8Array): boolean {
  const expected = placeholderScript()
  return script.length === expected.length && script.every((byte, i) => byte === expected[i])
}

export function isPlaceholderOutpoint(outpoint: string): boolean {
  const txid = bitcoinCrypto.sha256(LABEL_BYTES).toString('hex')
  return outpoint.startsWith(`${txid}:`)
}

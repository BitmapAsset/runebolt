import ecc from '@bitcoinerlab/secp256k1'
import { networks, payments, Psbt } from 'bitcoinjs-lib'
import { ECPairFactory, type ECPairInterface } from 'ecpair'
import type { AttributedContents, UtxoContents } from '../../src/types/attribution.js'
import type { ListingEnvelope } from '../../src/types/envelope.js'
import { SIGHASH_SINGLE_ANYONECANPAY } from '../../src/swap/constants.js'

/**
 * Fixture factory for W3. It builds swap transactions in whatever shape a test asks for,
 * including deliberately wrong ones — the point is to construct violations that Bitcoin, the
 * indexer and the wallet would all accept in silence.
 */

const ECPair = ECPairFactory(ecc)
export const NETWORK = networks.regtest

export interface Party {
  readonly keyPair: ECPairInterface
  readonly address: string
  readonly script: Buffer
  readonly publicKeyHex: string
}

function party(seed: number): Party {
  const privateKey = Buffer.alloc(32, seed)
  const keyPair = ECPair.fromPrivateKey(privateKey, { network: NETWORK })
  const pubkey = Buffer.from(keyPair.publicKey)
  const payment = payments.p2wpkh({ pubkey, network: NETWORK })
  if (payment.address === undefined || payment.output === undefined) {
    throw new Error('failed to derive fixture party')
  }
  return {
    keyPair,
    address: payment.address,
    script: payment.output,
    publicKeyHex: pubkey.toString('hex'),
  }
}

export const SELLER = party(1)
export const SELLER_PAYOUT = party(2)
export const BUYER = party(3)
export const THIRD_PARTY = party(4)

export interface FixtureInput {
  readonly txid: string
  readonly vout: number
  readonly valueSats: number
  readonly owner: Party
}

export interface FixtureOutput {
  readonly valueSats: number
  readonly owner?: Party
  /** Raw script, for OP_RETURN / runestone outputs. */
  readonly script?: Buffer
}

export interface BuildOptions {
  readonly inputs: readonly FixtureInput[]
  readonly outputs: readonly FixtureOutput[]
  /** Index of the seller's asset input; signed SIGHASH_SINGLE|ANYONECANPAY when requested. */
  readonly sellerInputIndex: number
  readonly signers: readonly ('buyer' | 'seller')[]
  /** Overrides the seller's sighash flags, for the wrong-sighash fixture. */
  readonly sellerSighashType?: number
}

function fakeTxid(seed: number): string {
  return seed.toString(16).padStart(2, '0').repeat(32)
}

export function input(
  seed: number,
  valueSats: number,
  owner: Party,
  vout = 0,
): FixtureInput {
  return { txid: fakeTxid(seed), vout, valueSats, owner }
}

/** OP_RETURN OP_13 <payload> — the runestone envelope (SPEC §6.2.1). */
export function runestoneScript(): Buffer {
  return Buffer.from([0x6a, 0x5d, 0x03, 0x16, 0x01, 0x03])
}

export function buildPsbt(options: BuildOptions): string {
  const psbt = new Psbt({ network: NETWORK })

  for (const entry of options.inputs) {
    psbt.addInput({
      hash: entry.txid,
      index: entry.vout,
      witnessUtxo: { script: entry.owner.script, value: entry.valueSats },
    })
  }

  for (const out of options.outputs) {
    const script = out.script ?? out.owner?.script
    if (script === undefined) throw new Error('fixture output needs an owner or a script')
    psbt.addOutput({ script, value: out.valueSats })
  }

  if (options.signers.includes('seller')) {
    const sighashType = options.sellerSighashType ?? SIGHASH_SINGLE_ANYONECANPAY
    psbt.updateInput(options.sellerInputIndex, { sighashType })
    psbt.signInput(options.sellerInputIndex, keyFor(options, options.sellerInputIndex), [sighashType])
  }

  if (options.signers.includes('buyer')) {
    for (const [index, entry] of options.inputs.entries()) {
      if (index === options.sellerInputIndex) continue
      psbt.signInput(index, entry.owner.keyPair)
    }
  }

  return psbt.toBase64()
}

function keyFor(options: BuildOptions, index: number): ECPairInterface {
  const entry = options.inputs[index]
  if (entry === undefined) throw new Error(`no fixture input at ${index}`)
  return entry.owner.keyPair
}

export function attribution(contents: UtxoContents): AttributedContents {
  return {
    indexer: 'ord',
    indexerVersion: '0.27.1',
    blockHeight: 959697,
    observedAt: '2026-07-26T00:00:00Z',
    contents,
  }
}

export const INSCRIPTION_ID =
  '617b02026b7d56c85a41c07ebfd67a1186f0888fd07c59428f11b1b9cdf6a84ci0'

export function inscriptionContents(): UtxoContents {
  return { inscriptions: [INSCRIPTION_ID], runes: [], brc20: [] }
}

export function runeContents(amount = '116521'): UtxoContents {
  return {
    inscriptions: [],
    runes: [{ runeId: '840000:3', runeName: 'SPARKY•RUNEDOG', amount, divisibility: 0 }],
    brc20: [],
  }
}

export interface EnvelopeOptions {
  readonly assetClass: ListingEnvelope['assetClass']
  readonly lotInput: FixtureInput
  readonly priceSats: number
  readonly psbt: string
  readonly contents: UtxoContents
  readonly expiresAt?: string
  readonly disclosure?: ListingEnvelope['disclosure']
  /** Overrides the lot location, for satpoint (`txid:vout:offset`) and wrong-outpoint fixtures. */
  readonly lotLocation?: string
}

export function envelope(options: EnvelopeOptions): ListingEnvelope {
  return {
    v: 1,
    assetClass: options.assetClass,
    sighashMode: 'SINGLE_ACAP',
    lot: {
      location: options.lotLocation ?? `${options.lotInput.txid}:${options.lotInput.vout}`,
      priceSats: options.priceSats,
    },
    psbt: options.psbt,
    maker: {
      address: SELLER.address,
      publicKey: SELLER.publicKeyHex,
      receiveAddress: SELLER_PAYOUT.address,
    },
    expiresAt: options.expiresAt ?? '2030-01-01T00:00:00Z',
    attribution: attribution(options.contents),
    ...(options.disclosure === undefined ? {} : { disclosure: options.disclosure }),
  }
}

export const NOW = new Date('2026-07-26T00:00:00Z')

export const SELLER_VIEW = { addresses: [SELLER.address, SELLER_PAYOUT.address] }
export const BUYER_VIEW = { addresses: [BUYER.address] }

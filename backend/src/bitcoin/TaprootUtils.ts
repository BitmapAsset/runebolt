/**
 * Taproot utilities for generating keys and creating multisig addresses.
 *
 * Uses @noble/secp256k1 for real BIP-340 Schnorr signature operations
 * and bitcoinjs-lib for real P2TR address construction.
 */

import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';

// Configure @noble/secp256k1 v3 with hash functions
secp256k1.hashes.sha256 = (msg: Uint8Array) => sha256(msg);
secp256k1.hashes.hmacSha256 = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp256k1.etc.concatBytes(...msgs));

bitcoin.initEccLib(ecc);

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface MultisigAddress {
  address: string;
  script: string;
  internalPubkey: string;
}

/**
 * Get the Bitcoin network from BITCOIN_NETWORK env var.
 */
function getNetwork(): bitcoin.Network {
  const networkName = process.env.BITCOIN_NETWORK || 'mainnet';
  switch (networkName) {
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'regtest':
      return bitcoin.networks.regtest;
    default:
      return bitcoin.networks.bitcoin;
  }
}

export class TaprootUtils {
  /**
   * Generate a new Schnorr key pair using secp256k1.
   */
  static generateKeyPair(): KeyPair {
    const privateKeyBytes = secp256k1.utils.randomSecretKey();
    const publicKeyBytes = secp256k1.schnorr.getPublicKey(privateKeyBytes);

    const privateKey = Buffer.from(privateKeyBytes).toString('hex');
    const publicKey = Buffer.from(publicKeyBytes).toString('hex');

    console.log(`[TaprootUtils] Generated key pair (pubkey: ${publicKey.slice(0, 16)}...)`);

    return { publicKey, privateKey };
  }

  /**
   * Create a 2-of-2 Taproot multisig address from two x-only public keys.
   *
   * Uses real key aggregation (sorted point addition) to produce a combined
   * internal pubkey, then constructs a real P2TR address via bitcoinjs-lib.
   */
  static createMultisigAddress(pubkey1: string, pubkey2: string): MultisigAddress {
    console.log(
      `[TaprootUtils] Creating 2-of-2 multisig: ${pubkey1.slice(0, 8)}... + ${pubkey2.slice(0, 8)}...`
    );

    // Aggregate the two x-only public keys via EC point addition
    const aggregatedXOnly = this.aggregatePublicKeys([pubkey1, pubkey2]);
    const internalPubkey = Buffer.from(aggregatedXOnly, 'hex');

    // Build a real P2TR (Pay-to-Taproot) output using bitcoinjs-lib
    const network = getNetwork();
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey,
      network,
    });

    if (!p2tr.address || !p2tr.output) {
      throw new Error('Failed to create P2TR payment');
    }

    const address = p2tr.address;
    const script = Buffer.from(p2tr.output).toString('hex');

    console.log(`[TaprootUtils] Created multisig address: ${address.slice(0, 20)}...`);

    return { address, script, internalPubkey: aggregatedXOnly };
  }

  /**
   * Aggregate multiple x-only public keys using EC point addition.
   *
   * Converts x-only (32-byte) pubkeys to compressed (33-byte with 0x02 prefix),
   * performs EC point addition, then returns the x-only result.
   */
  static aggregatePublicKeys(pubkeys: string[]): string {
    if (pubkeys.length === 0) {
      throw new Error('Cannot aggregate empty pubkey list');
    }

    if (pubkeys.length === 1) {
      return pubkeys[0];
    }

    console.log(`[TaprootUtils] Aggregating ${pubkeys.length} public keys`);

    // Sort pubkeys lexicographically for deterministic aggregation
    const sorted = [...pubkeys].sort();

    // Convert x-only pubkeys to compressed format (prepend 0x02)
    // and perform sequential point addition
    let accumulated = Buffer.concat([Buffer.from([0x02]), Buffer.from(sorted[0], 'hex')]);

    for (let i = 1; i < sorted.length; i++) {
      const nextCompressed = Buffer.concat([Buffer.from([0x02]), Buffer.from(sorted[i], 'hex')]);
      const sum = ecc.pointAdd(accumulated, nextCompressed);
      if (!sum) {
        throw new Error('Point addition failed — keys may be inverses');
      }
      accumulated = Buffer.from(sum);
    }

    // Extract x-only (drop the prefix byte) from the compressed result
    const xOnly = accumulated.subarray(1);
    return Buffer.from(xOnly).toString('hex');
  }

  /**
   * Verify a BIP-340 Schnorr signature against a public key and message.
   *
   * SECURITY: Uses real cryptographic verification via @noble/secp256k1.
   */
  static verifySchnorrSignature(
    publicKey: string,
    message: string,
    signature: string
  ): boolean {
    console.log(
      `[TaprootUtils] Verifying Schnorr signature from ${publicKey.slice(0, 16)}...`
    );

    try {
      const pubkeyBytes = Buffer.from(publicKey, 'hex');
      const sigBytes = Buffer.from(signature, 'hex');

      if (pubkeyBytes.length !== 32) {
        console.error(`[TaprootUtils] Invalid pubkey length: ${pubkeyBytes.length}, expected 32`);
        return false;
      }

      if (sigBytes.length !== 64) {
        console.error(`[TaprootUtils] Invalid signature length: ${sigBytes.length}, expected 64`);
        return false;
      }

      const messageHash = sha256(new TextEncoder().encode(message));
      return secp256k1.schnorr.verify(sigBytes, messageHash, pubkeyBytes);
    } catch (err) {
      console.error('[TaprootUtils] Signature verification error:', err);
      return false;
    }
  }

  /**
   * Sign a message with BIP-340 Schnorr.
   */
  static async signSchnorr(privateKey: string, message: string): Promise<string> {
    const privkeyBytes = Buffer.from(privateKey, 'hex');
    const messageHash = sha256(new TextEncoder().encode(message));
    const signature = await secp256k1.schnorr.sign(messageHash, privkeyBytes);
    return Buffer.from(signature).toString('hex');
  }

  /**
   * Create a timelocked script path for force-close scenarios.
   * After N blocks, the hub can unilaterally close the channel.
   *
   * Script: OP_CHECKSEQUENCEVERIFY <lockBlocks> OP_DROP <pubkey> OP_CHECKSIG
   */
  static createTimelockScript(pubkey: string, lockBlocks: number): string {
    console.log(
      `[TaprootUtils] Creating timelock script: ${lockBlocks} blocks for ${pubkey.slice(0, 16)}...`
    );

    const lockBlocksHex = lockBlocks.toString(16).padStart(4, '0');
    // OP_CSV (0xb2) <lockBlocks> OP_DROP (0x75) <32-byte-pubkey> OP_CHECKSIG (0xac)
    return `b2${lockBlocksHex}75${pubkey}ac`;
  }
}

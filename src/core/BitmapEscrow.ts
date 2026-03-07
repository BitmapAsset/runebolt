import * as bitcoin from 'bitcoinjs-lib';
import crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { HTLCError } from '../utils/errors';
import { BridgeConfig } from '../types';

const log = createLogger('BitmapEscrow');

export interface BitmapEscrowParams {
  paymentHash: Buffer;
  buyerPubkey: Buffer;
  sellerPubkey: Buffer;
  timelock: number; // block height for refund
  inscriptionId: string; // Ordinals inscription ID (txid:vout format)
  priceSats: number;
}

export interface BitmapEscrowState {
  escrowTxid: string;
  escrowVout: number;
  params: BitmapEscrowParams;
  locked: boolean;
  claimed: boolean;
  refunded: boolean;
}

/**
 * BitmapEscrow handles HTLC-based escrow for Ordinals/Bitmap inscriptions.
 *
 * Bitmap blocks are Ordinals inscriptions (NFTs). The escrow uses the same
 * HTLC pattern as Runes swaps but for non-fungible assets:
 *
 *   OP_IF
 *     OP_SHA256 <payment_hash> OP_EQUALVERIFY
 *     <buyer_pubkey> OP_CHECKSIG        // Buyer claims with preimage (after paying LN)
 *   OP_ELSE
 *     <timelock> OP_CHECKLOCKTIMEVERIFY OP_DROP
 *     <seller_pubkey> OP_CHECKSIG       // Seller reclaims after timeout
 *   OP_ENDIF
 *
 * The inscription (Ordinals NFT) sits on the UTXO locked by this script.
 * Whoever spends it gets the inscription. The Runestone is NOT used here
 * because Bitmap blocks are Ordinals, not Runes.
 */
export class BitmapEscrow {
  private readonly network: bitcoin.Network;
  private readonly htlcTimeoutBlocks: number;
  private readonly escrowStates = new Map<string, BitmapEscrowState>();

  constructor(config: BridgeConfig) {
    this.network = this.getNetwork(config.network);
    this.htlcTimeoutBlocks = config.bridge.htlcTimeoutBlocks;
  }

  private getNetwork(networkName: string): bitcoin.Network {
    switch (networkName) {
      case 'mainnet':
        return bitcoin.networks.bitcoin;
      case 'testnet':
        return bitcoin.networks.testnet;
      case 'regtest':
        return bitcoin.networks.regtest;
      default:
        return bitcoin.networks.regtest;
    }
  }

  /**
   * Generate a fresh preimage/payment-hash pair for a new escrow.
   */
  generateSecret(): { preimage: Buffer; paymentHash: Buffer } {
    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    return { preimage, paymentHash };
  }

  /**
   * Build the HTLC escrow script for a Bitmap inscription sale.
   */
  buildEscrowScript(params: BitmapEscrowParams): Buffer {
    log.info(
      { inscriptionId: params.inscriptionId, priceSats: params.priceSats },
      'Building Bitmap escrow script',
    );

    return bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      params.paymentHash,
      bitcoin.opcodes.OP_EQUALVERIFY,
      params.buyerPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(params.timelock),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      params.sellerPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF,
    ]);
  }

  /**
   * Create a P2WSH address from the escrow script.
   */
  getEscrowAddress(redeemScript: Buffer): string {
    const p2wsh = bitcoin.payments.p2wsh({
      redeem: { output: redeemScript },
      network: this.network,
    });

    if (!p2wsh.address) {
      throw new HTLCError('Failed to generate escrow address');
    }
    return p2wsh.address;
  }

  /**
   * Build the escrow lock transaction.
   * Seller sends their inscription UTXO to the P2WSH escrow address.
   *
   * IMPORTANT: The inscription sits on the UTXO. Whoever spends the UTXO
   * receives the inscription. No Runestone needed — this is Ordinals, not Runes.
   */
  buildLockTransaction(
    params: BitmapEscrowParams,
    inscriptionUtxo: { txid: string; vout: number; value: number; scriptPubKey: Buffer },
    feeRate: number,
  ): { psbt: bitcoin.Psbt; escrowAddress: string; redeemScript: Buffer } {
    log.info(
      { inscriptionId: params.inscriptionId },
      'Building Bitmap escrow lock transaction',
    );

    const redeemScript = this.buildEscrowScript(params);
    const escrowAddress = this.getEscrowAddress(redeemScript);

    const psbt = new bitcoin.Psbt({ network: this.network });

    // Input: the inscription UTXO
    psbt.addInput({
      hash: inscriptionUtxo.txid,
      index: inscriptionUtxo.vout,
      witnessUtxo: {
        script: inscriptionUtxo.scriptPubKey,
        value: inscriptionUtxo.value,
      },
    });

    // Output 0: P2WSH escrow (inscription moves here)
    psbt.addOutput({
      address: escrowAddress,
      value: 546, // dust amount — inscription rides on this UTXO
    });

    // Output 1: Change (if inscription UTXO had excess sats)
    const estimatedSize = 200;
    const fee = Math.ceil(estimatedSize * feeRate);
    const change = inscriptionUtxo.value - 546 - fee;
    if (change > 546) {
      // Change back to seller — caller provides the address
    }

    return { psbt, escrowAddress, redeemScript };
  }

  /**
   * Build the claim transaction (buyer reveals preimage to get the inscription).
   */
  buildClaimTransaction(
    escrowUtxo: { txid: string; vout: number; value: number },
    redeemScript: Buffer,
    buyerAddress: string,
    feeRate: number,
  ): bitcoin.Psbt {
    log.info({ escrowTxid: escrowUtxo.txid }, 'Building Bitmap escrow claim transaction');

    const psbt = new bitcoin.Psbt({ network: this.network });

    psbt.addInput({
      hash: escrowUtxo.txid,
      index: escrowUtxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: redeemScript },
          network: this.network,
        }).output!,
        value: escrowUtxo.value,
      },
      witnessScript: redeemScript,
    });

    // Inscription moves to buyer's address
    psbt.addOutput({
      address: buyerAddress,
      value: 546,
    });

    return psbt;
  }

  /**
   * Build the refund transaction (seller reclaims after timelock).
   */
  buildRefundTransaction(
    escrowUtxo: { txid: string; vout: number; value: number },
    redeemScript: Buffer,
    sellerAddress: string,
    timelock: number,
    feeRate: number,
  ): bitcoin.Psbt {
    log.info({ escrowTxid: escrowUtxo.txid, timelock }, 'Building Bitmap escrow refund transaction');

    const psbt = new bitcoin.Psbt({ network: this.network });

    psbt.addInput({
      hash: escrowUtxo.txid,
      index: escrowUtxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: redeemScript },
          network: this.network,
        }).output!,
        value: escrowUtxo.value,
      },
      witnessScript: redeemScript,
      sequence: 0xfffffffe,
    });

    psbt.setLocktime(timelock);

    // Inscription returns to seller
    psbt.addOutput({
      address: sellerAddress,
      value: 546,
    });

    return psbt;
  }

  buildClaimWitness(signature: Buffer, preimage: Buffer, redeemScript: Buffer): Buffer[] {
    return [signature, preimage, Buffer.from([0x01]), redeemScript];
  }

  buildRefundWitness(signature: Buffer, redeemScript: Buffer): Buffer[] {
    return [signature, Buffer.from([]), redeemScript];
  }

  registerEscrow(txid: string, vout: number, params: BitmapEscrowParams): void {
    const key = `${txid}:${vout}`;
    this.escrowStates.set(key, {
      escrowTxid: txid,
      escrowVout: vout,
      params,
      locked: true,
      claimed: false,
      refunded: false,
    });
    log.info({ key, inscriptionId: params.inscriptionId }, 'Bitmap escrow registered');
  }

  getEscrowState(txid: string, vout: number): BitmapEscrowState | undefined {
    return this.escrowStates.get(`${txid}:${vout}`);
  }

  markClaimed(txid: string, vout: number): void {
    const state = this.escrowStates.get(`${txid}:${vout}`);
    if (state) {
      state.claimed = true;
      state.locked = false;
    }
  }

  markRefunded(txid: string, vout: number): void {
    const state = this.escrowStates.get(`${txid}:${vout}`);
    if (state) {
      state.refunded = true;
      state.locked = false;
    }
  }
}

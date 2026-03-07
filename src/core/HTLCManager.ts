import * as bitcoin from 'bitcoinjs-lib';
import { createLogger } from '../utils/logger';
import { HTLCError } from '../utils/errors';
import { HTLCParams, HTLCState, BridgeConfig, RuneId } from '../types';

const log = createLogger('HTLCManager');

/**
 * HTLCManager handles Hash Time-Locked Contracts for Runes.
 *
 * The HTLC script ensures atomic swaps:
 *   OP_IF
 *     OP_SHA256 <payment_hash> OP_EQUALVERIFY
 *     <claimer_pubkey> OP_CHECKSIG
 *   OP_ELSE
 *     <timelock> OP_CHECKLOCKTIMEVERIFY OP_DROP
 *     <refunder_pubkey> OP_CHECKSIG
 *   OP_ENDIF
 *
 * The Runes transfer is encoded in an OP_RETURN output (Runestone).
 */
export class HTLCManager {
  private readonly network: bitcoin.Network;
  private readonly htlcTimeoutBlocks: number;
  private readonly htlcStates = new Map<string, HTLCState>();

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
   * Build the HTLC redeem script for a Runes atomic swap.
   */
  buildHTLCScript(params: HTLCParams): Buffer {
    log.info(
      {
        paymentHash: params.paymentHash.toString('hex'),
        timelock: params.timelock,
      },
      'Building HTLC script',
    );

    return bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      params.paymentHash,
      bitcoin.opcodes.OP_EQUALVERIFY,
      params.claimerPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(params.timelock),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      params.refunderPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF,
    ]);
  }

  /**
   * Create a P2WSH address from the HTLC script.
   */
  getHTLCAddress(redeemScript: Buffer): string {
    const p2wsh = bitcoin.payments.p2wsh({
      redeem: { output: redeemScript },
      network: this.network,
    });

    if (!p2wsh.address) {
      throw new HTLCError('Failed to generate HTLC address');
    }
    return p2wsh.address;
  }

  /**
   * Encode a Runestone OP_RETURN for Runes transfer.
   *
   * Runestone format (simplified):
   *   OP_RETURN OP_13 <encoded_runestone>
   *
   * The runestone contains edicts that transfer Runes from inputs to outputs.
   */
  encodeRunestone(runeId: RuneId, amount: bigint, outputIndex: number): Buffer {
    // Runestone encoding uses LEB128 varint encoding
    const fields: number[] = [];

    // Tag 0: body (edicts follow)
    // Edict: [runeId.block, runeId.tx, amount, output]
    // Using delta encoding for edict fields
    const edictData = [
      ...this.encodeLEB128(BigInt(runeId.block)),
      ...this.encodeLEB128(BigInt(runeId.tx)),
      ...this.encodeLEB128(amount),
      ...this.encodeLEB128(BigInt(outputIndex)),
    ];

    // Tag 0 = body marker
    fields.push(...this.encodeLEB128(0n));
    fields.push(...edictData);

    const payload = Buffer.from(fields);

    // OP_RETURN OP_13 <payload>
    return bitcoin.script.compile([
      bitcoin.opcodes.OP_RETURN,
      bitcoin.opcodes.OP_13, // Runestone magic number
      payload,
    ]);
  }

  /**
   * LEB128 variable-length integer encoding used by the Runes protocol.
   */
  private encodeLEB128(value: bigint): number[] {
    const bytes: number[] = [];
    let v = value;
    do {
      let byte = Number(v & 0x7fn);
      v >>= 7n;
      if (v > 0n) {
        byte |= 0x80;
      }
      bytes.push(byte);
    } while (v > 0n);
    return bytes;
  }

  /**
   * Build the HTLC locking transaction.
   * This transaction:
   * 1. Spends a Runes UTXO as input
   * 2. Creates an OP_RETURN output with the Runestone (Runes transfer)
   * 3. Creates a P2WSH output locked by the HTLC script
   * 4. Change output for remaining sats
   */
  buildLockTransaction(
    params: HTLCParams,
    inputUtxo: { txid: string; vout: number; value: number; scriptPubKey: Buffer },
    feeRate: number,
  ): { psbt: bitcoin.Psbt; htlcAddress: string; redeemScript: Buffer } {
    log.info({ runeId: params.runeId, amount: params.runeAmount.toString() }, 'Building HTLC lock transaction');

    const redeemScript = this.buildHTLCScript(params);
    const htlcAddress = this.getHTLCAddress(redeemScript);

    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add the Runes UTXO input
    psbt.addInput({
      hash: inputUtxo.txid,
      index: inputUtxo.vout,
      witnessUtxo: {
        script: inputUtxo.scriptPubKey,
        value: inputUtxo.value,
      },
    });

    // Output 0: OP_RETURN Runestone - transfer Runes to output 1 (HTLC)
    const runestone = this.encodeRunestone(params.runeId, params.runeAmount, 1);
    psbt.addOutput({
      script: runestone,
      value: 0,
    });

    // Output 1: P2WSH HTLC output (holds the Runes)
    psbt.addOutput({
      address: htlcAddress,
      value: 546, // dust limit for Runes
    });

    // Output 2: Change (if needed)
    const estimatedSize = 250; // approximate vsize
    const fee = Math.ceil(estimatedSize * feeRate);
    const change = inputUtxo.value - 546 - fee;
    if (change > 546) {
      // Change goes back to refunder - they need to provide their address
      // For now, we'll handle this in the WalletManager
    }

    return { psbt, htlcAddress, redeemScript };
  }

  /**
   * Build the HTLC claim transaction (using preimage).
   * The claimer reveals the preimage to spend the HTLC output.
   */
  buildClaimTransaction(
    htlcUtxo: { txid: string; vout: number; value: number },
    redeemScript: Buffer,
    preimage: Buffer,
    claimerKeyPair: { publicKey: Buffer; sign: (hash: Buffer) => Buffer },
    destinationAddress: string,
    runeId: RuneId,
    runeAmount: bigint,
    feeRate: number,
  ): bitcoin.Psbt {
    log.info({ htlcTxid: htlcUtxo.txid }, 'Building HTLC claim transaction');

    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add HTLC input
    psbt.addInput({
      hash: htlcUtxo.txid,
      index: htlcUtxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: redeemScript },
          network: this.network,
        }).output!,
        value: htlcUtxo.value,
      },
      witnessScript: redeemScript,
    });

    // Output 0: OP_RETURN Runestone - transfer Runes to output 1
    const runestone = this.encodeRunestone(runeId, runeAmount, 1);
    psbt.addOutput({
      script: runestone,
      value: 0,
    });

    // Output 1: Destination for Runes
    psbt.addOutput({
      address: destinationAddress,
      value: 546,
    });

    return psbt;
  }

  /**
   * Build the HTLC refund transaction (after timelock expires).
   */
  buildRefundTransaction(
    htlcUtxo: { txid: string; vout: number; value: number },
    redeemScript: Buffer,
    refundAddress: string,
    runeId: RuneId,
    runeAmount: bigint,
    timelock: number,
    feeRate: number,
  ): bitcoin.Psbt {
    log.info({ htlcTxid: htlcUtxo.txid, timelock }, 'Building HTLC refund transaction');

    const psbt = new bitcoin.Psbt({ network: this.network });

    psbt.addInput({
      hash: htlcUtxo.txid,
      index: htlcUtxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({
          redeem: { output: redeemScript },
          network: this.network,
        }).output!,
        value: htlcUtxo.value,
      },
      witnessScript: redeemScript,
      sequence: 0xfffffffe, // enable nLockTime
    });

    // Set locktime for CLTV
    psbt.setLocktime(timelock);

    // Output 0: OP_RETURN Runestone
    const runestone = this.encodeRunestone(runeId, runeAmount, 1);
    psbt.addOutput({
      script: runestone,
      value: 0,
    });

    // Output 1: Refund address gets the Runes back
    psbt.addOutput({
      address: refundAddress,
      value: 546,
    });

    return psbt;
  }

  /**
   * Create the witness for claiming an HTLC with the preimage.
   */
  buildClaimWitness(
    signature: Buffer,
    preimage: Buffer,
    redeemScript: Buffer,
  ): Buffer[] {
    return [
      signature,
      preimage,
      Buffer.from([0x01]), // OP_TRUE to take the IF branch
      redeemScript,
    ];
  }

  /**
   * Create the witness for refunding an HTLC after timelock.
   */
  buildRefundWitness(signature: Buffer, redeemScript: Buffer): Buffer[] {
    return [
      signature,
      Buffer.from([]), // OP_FALSE to take the ELSE branch
      redeemScript,
    ];
  }

  /**
   * Track HTLC state.
   */
  registerHTLC(txid: string, vout: number, params: HTLCParams): void {
    const key = `${txid}:${vout}`;
    this.htlcStates.set(key, {
      txid,
      vout,
      params,
      locked: true,
      claimed: false,
      refunded: false,
    });
    log.info({ key }, 'HTLC registered');
  }

  getHTLCState(txid: string, vout: number): HTLCState | undefined {
    return this.htlcStates.get(`${txid}:${vout}`);
  }

  markClaimed(txid: string, vout: number): void {
    const state = this.htlcStates.get(`${txid}:${vout}`);
    if (state) {
      state.claimed = true;
      state.locked = false;
    }
  }

  markRefunded(txid: string, vout: number): void {
    const state = this.htlcStates.get(`${txid}:${vout}`);
    if (state) {
      state.refunded = true;
      state.locked = false;
    }
  }
}

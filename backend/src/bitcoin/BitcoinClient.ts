/**
 * High-level Bitcoin client that orchestrates Taproot operations
 * and mempool interactions for channel funding and closing.
 *
 * Uses bitcoinjs-lib for real PSBT construction and mempool.space
 * for broadcasting and fee estimation.
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { TaprootUtils } from './TaprootUtils';
import { MempoolClient, UTXO, FeeEstimates, Transaction } from './MempoolClient';
import { Channel } from '../channels/ChannelState';
import { RuneBuilder } from '../rune/RuneBuilder';
import { DOG_RUNE_ID } from '../rune/RuneConstants';

bitcoin.initEccLib(ecc);

/** Default confirmation polling interval (30 seconds) */
const POLL_INTERVAL_MS = 30_000;
/** Default max polling attempts (100 × 30s ≈ 50 minutes) */
const MAX_POLL_ATTEMPTS = 100;

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

export class BitcoinClient {
  private mempool: MempoolClient;

  constructor(mempoolClient?: MempoolClient) {
    this.mempool = mempoolClient || new MempoolClient();
  }

  /**
   * Create a funding PSBT for opening a channel.
   * The PSBT spends user UTXOs to a 2-of-2 Taproot multisig address.
   *
   * Returns a real BIP-174 PSBT (base64) and the channel multisig address.
   */
  createFundingPsbt(
    userPubkey: string,
    amount: bigint,
    utxos: UTXO[],
    runeId: string = DOG_RUNE_ID
  ): { psbt: string; channelAddress: string } {
    console.log(
      `[BitcoinClient] Creating funding PSBT: user=${userPubkey.slice(0, 16)}..., amount=${amount}`
    );

    const network = getNetwork();

    // Generate hub key for this channel
    const hubKey = TaprootUtils.generateKeyPair();

    // Create 2-of-2 multisig address
    const multisig = TaprootUtils.createMultisigAddress(userPubkey, hubKey.publicKey);

    // Select UTXOs to cover amount + estimated fees
    // For rune transfers, the BTC output is dust (546 sats) — runes are tracked by Runestone
    const dustAmount = 546;
    const estimatedVbytes = 150 + utxos.length * 68; // ~68 vB per Taproot input
    const estimatedFee = estimatedVbytes * 10; // default 10 sat/vB, caller should use getFeeEstimate
    const requiredSats = dustAmount + estimatedFee;

    let totalInput = 0;
    const selectedUtxos: UTXO[] = [];
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      totalInput += utxo.value;
      if (totalInput >= requiredSats) break;
    }

    if (totalInput < requiredSats) {
      throw new Error(
        `Insufficient UTXOs: have ${totalInput} sats, need ${requiredSats} sats`
      );
    }

    // Build real PSBT using bitcoinjs-lib
    const psbt = new bitcoin.Psbt({ network });

    // Add inputs
    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(multisig.script, 'hex'), // placeholder — caller provides real scriptPubkey
          value: BigInt(utxo.value),
        },
      });
    }

    // Output 1: Dust output to channel multisig (this holds the runes)
    psbt.addOutput({
      address: multisig.address,
      value: BigInt(dustAmount),
    });

    // Output 2: OP_RETURN Runestone for rune transfer
    // destinationIndex=0 directs the runes to the multisig output (output 0)
    const runestoneScript = RuneBuilder.buildRunestoneOutput(runeId, amount, 0);
    psbt.addOutput({
      script: runestoneScript,
      value: 0n,
    });

    // Output 3: Change back to user (if any)
    const changeValue = totalInput - dustAmount - estimatedFee;
    if (changeValue > 546) {
      // Create a P2TR change output for the user
      const userPubkeyBuf = Buffer.from(userPubkey, 'hex');
      const p2trChange = bitcoin.payments.p2tr({
        internalPubkey: userPubkeyBuf,
        network,
      });
      if (p2trChange.address) {
        psbt.addOutput({
          address: p2trChange.address,
          value: BigInt(changeValue),
        });
      }
    }

    const psbtBase64 = psbt.toBase64();

    console.log(`[BitcoinClient] Funding PSBT created for address ${multisig.address.slice(0, 20)}...`);

    return {
      psbt: psbtBase64,
      channelAddress: multisig.address,
    };
  }

  /**
   * Finalize a signed PSBT and broadcast the resulting transaction
   * via the mempool.space API.
   *
   * Expects a fully-signed PSBT (base64). Finalizes all inputs,
   * extracts the raw transaction hex, and broadcasts it.
   *
   * Returns the txid from the network.
   */
  async signAndBroadcastFundingTx(
    psbtBase64: string,
    _userSignature: string
  ): Promise<string> {
    console.log('[BitcoinClient] Finalizing and broadcasting funding transaction');

    const network = getNetwork();
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });

    // Finalize all inputs (assumes all required signatures are present)
    psbt.finalizeAllInputs();

    // Extract the raw transaction hex
    const txHex = psbt.extractTransaction().toHex();

    console.log(`[BitcoinClient] Broadcasting tx (${txHex.length / 2} bytes)`);

    // Broadcast via mempool.space
    const txid = await this.mempool.broadcastTx(txHex);

    console.log(`[BitcoinClient] Funding tx broadcast: ${txid}`);
    return txid;
  }

  /**
   * Create a closing PSBT that distributes the channel funds
   * according to the final balance state.
   *
   * Returns a real BIP-174 PSBT (base64).
   */
  createClosingPsbt(
    channel: Channel,
    userBalance: bigint,
    hubBalance: bigint
  ): string {
    console.log(
      `[BitcoinClient] Creating closing PSBT for channel ${channel.id}: ` +
        `user=${userBalance}, hub=${hubBalance}`
    );

    if (!channel.fundingTxid || channel.fundingVout === null) {
      throw new Error('Channel has no funding transaction');
    }

    const network = getNetwork();
    const psbt = new bitcoin.Psbt({ network });

    // Input: spend the funding output
    const multisig = TaprootUtils.createMultisigAddress(
      channel.userPubkey,
      channel.runeboltPubkey
    );
    psbt.addInput({
      hash: channel.fundingTxid,
      index: channel.fundingVout,
      witnessUtxo: {
        script: Buffer.from(multisig.script, 'hex'),
        value: 546n, // dust amount held by the funding output
      },
    });

    // Output 0: OP_RETURN Runestone encoding the balance distribution
    // Uses commitment Runestone with two edicts: user (output 1) and hub (output 2)
    const runestoneScript = RuneBuilder.buildCommitmentRunestone(
      channel.id,
      userBalance,
      hubBalance
    );
    psbt.addOutput({
      script: runestoneScript,
      value: 0n,
    });

    // Output 2: User's share (if any)
    if (userBalance > 0n) {
      const userP2tr = bitcoin.payments.p2tr({
        internalPubkey: Buffer.from(channel.userPubkey, 'hex'),
        network,
      });
      if (userP2tr.address) {
        psbt.addOutput({
          address: userP2tr.address,
          value: 546n,
        });
      }
    }

    // Output 3: Hub's share (if any)
    if (hubBalance > 0n) {
      const hubP2tr = bitcoin.payments.p2tr({
        internalPubkey: Buffer.from(channel.runeboltPubkey, 'hex'),
        network,
      });
      if (hubP2tr.address) {
        psbt.addOutput({
          address: hubP2tr.address,
          value: 546n,
        });
      }
    }

    const psbtBase64 = psbt.toBase64();
    console.log(`[BitcoinClient] Closing PSBT built (${psbtBase64.length} chars base64)`);
    return psbtBase64;
  }

  /**
   * Get current fee estimates from mempool.space (sat/vB).
   */
  async getFeeEstimate(): Promise<FeeEstimates> {
    return this.mempool.getFeeEstimates();
  }

  /**
   * Get a transaction by txid from mempool.space.
   */
  async getTransaction(txid: string): Promise<Transaction> {
    return this.mempool.getTx(txid);
  }

  /**
   * Poll mempool.space until a transaction is confirmed.
   * Throws if max attempts are exhausted.
   */
  async waitForConfirmation(
    txid: string,
    intervalMs: number = POLL_INTERVAL_MS,
    maxAttempts: number = MAX_POLL_ATTEMPTS
  ): Promise<Transaction> {
    console.log(`[BitcoinClient] Waiting for confirmation of ${txid}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const tx = await this.mempool.getTx(txid);
      if (tx.status.confirmed) {
        console.log(
          `[BitcoinClient] Transaction ${txid} confirmed at block ${tx.status.block_height}`
        );
        return tx;
      }

      console.log(
        `[BitcoinClient] Attempt ${attempt}/${maxAttempts}: ${txid} unconfirmed, waiting ${intervalMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Transaction ${txid} not confirmed after ${maxAttempts} attempts`
    );
  }

  /**
   * Get the mempool client for direct API access.
   */
  getMempoolClient(): MempoolClient {
    return this.mempool;
  }
}

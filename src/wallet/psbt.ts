/**
 * PSBT Builder — HTLC Transaction Construction
 * Builds lock, claim, and refund transactions for RuneBolt
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

const ECPair = ECPairFactory(tinysecp);

// Network configuration
export function getNetwork(network: 'mainnet' | 'testnet' | 'regtest' = 'mainnet'): bitcoin.Network {
  switch (network) {
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'regtest':
      return bitcoin.networks.regtest;
    default:
      return bitcoin.networks.bitcoin;
  }
}

// HTLC Script Types
export interface HTLCParams {
  senderPubkey: Buffer;        // 33-byte compressed pubkey
  recipientPubkey: Buffer;     // 33-byte compressed pubkey
  paymentHash: Buffer;         // 32-byte SHA256 hash
  timeoutBlockHeight: number;  // CLTV timeout
  assetId: string;            // Asset identifier for binding
  network: 'mainnet' | 'testnet' | 'regtest';
}

export interface HTLCScript {
  redeemScript: Buffer;
  p2shAddress: string;
  p2shOutput: Buffer;
  witnessScript?: Buffer;
}

export interface PSBTResult {
  psbt: bitcoin.Psbt;
  psbtBase64: string;
  hex?: string;
}

/**
 * Create HTLC redeem script
 * 
 * Script structure:
 * OP_IF
 *   OP_SHA256 <payment_hash> OP_EQUALVERIFY
 *   <recipient_pubkey> OP_CHECKSIG
 * OP_ELSE
 *   <timeout_blockheight> OP_CHECKLOCKTIMEVERIFY OP_DROP
 *   <sender_pubkey> OP_CHECKSIG
 * OP_ENDIF
 */
export function createHTLCScript(params: HTLCParams): HTLCScript {
  const { senderPubkey, recipientPubkey, paymentHash, timeoutBlockHeight, network } = params;

  // Ensure pubkeys are compressed 33-byte format
  if (senderPubkey.length !== 33) {
    throw new Error('Sender pubkey must be 33 bytes (compressed)');
  }
  if (recipientPubkey.length !== 33) {
    throw new Error('Recipient pubkey must be 33 bytes (compressed)');
  }
  if (paymentHash.length !== 32) {
    throw new Error('Payment hash must be 32 bytes');
  }

  const btcNetwork = getNetwork(network);

  // Build the redeem script
  const redeemScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      paymentHash,
      bitcoin.opcodes.OP_EQUALVERIFY,
      recipientPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(timeoutBlockHeight),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      senderPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ENDIF,
  ]);

  // Create P2SH address
  const p2sh = bitcoin.payments.p2sh({
    redeem: { output: redeemScript, network: btcNetwork },
    network: btcNetwork,
  });

  return {
    redeemScript,
    p2shAddress: p2sh.address!,
    p2shOutput: p2sh.output!,
  };
}

/**
 * Create Taproot HTLC script (more efficient for modern wallets)
 * Uses P2TR with a script-path spend
 */
export function createTaprootHTLC(params: HTLCParams): HTLCScript {
  const { senderPubkey, recipientPubkey, paymentHash, timeoutBlockHeight, network } = params;

  // Convert to x-only pubkeys for Taproot
  const senderXOnly = senderPubkey.slice(1, 33); // Remove parity byte
  const recipientXOnly = recipientPubkey.slice(1, 33);

  const btcNetwork = getNetwork(network);

  // Claim path script (preimage revealed)
  const claimScript = bitcoin.script.compile([
    recipientXOnly,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_SHA256,
    paymentHash,
    bitcoin.opcodes.OP_EQUAL,
  ]);

  // Refund path script (after timeout)
  const refundScript = bitcoin.script.compile([
    senderXOnly,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.script.number.encode(timeoutBlockHeight),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
  ]);

  // Build Taproot with script paths
  // Note: This is simplified - full implementation would use proper Taproot tree
  const redeemScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_IF,
      claimScript,
    bitcoin.opcodes.OP_ELSE,
      refundScript,
    bitcoin.opcodes.OP_ENDIF,
  ]);

  // For now, use P2SH-like approach with witness
  // Full Taproot would require @bitcoinerlab/secp256k1 or similar
  return createHTLCScript(params);
}

// UTXO Input type
export interface UTXOInput {
  txid: string;
  vout: number;
  value: number; // in satoshis
  scriptPubKey?: string;
}

// Asset output type
export interface AssetOutput {
  address: string;
  value: number; // in satoshis (dust limit + fees)
}

/**
 * Build HTLC lock transaction (PSBT)
 * Sender creates this to lock their asset
 */
export function buildLockTransaction(
  params: {
    senderAddress: string;
    htlcAddress: string;
    assetAmount: number; // satoshis to lock
    fundingUTXOs: UTXOInput[];
    changeAddress: string;
    feeRate: number; // sats/vbyte
    network: 'mainnet' | 'testnet' | 'regtest';
    assetData?: Buffer; // For Runestone or inscription data
  }
): PSBTResult {
  const { senderAddress, htlcAddress, assetAmount, fundingUTXOs, changeAddress, feeRate, network, assetData } = params;
  const btcNetwork = getNetwork(network);

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  // Calculate total input
  const totalInput = fundingUTXOs.reduce((sum, utxo) => sum + utxo.value, 0);

  // Estimate fee (typical HTLC lock tx: ~200 vbytes)
  const estimatedVBytes = 200 + (fundingUTXOs.length * 70);
  const fee = Math.ceil(estimatedVBytes * feeRate);

  // Dust limit for output
  const dustLimit = 546; // Minimum non-dust output
  const lockAmount = Math.max(assetAmount, dustLimit);

  // Calculate change
  const change = totalInput - lockAmount - fee;
  if (change < 0) {
    throw new Error(`Insufficient funds. Need: ${lockAmount + fee}, Have: ${totalInput}`);
  }

  // Add inputs
  for (const utxo of fundingUTXOs) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey || '', 'hex'),
        value: utxo.value,
      },
    });
  }

  // Add HTLC output (the locked asset)
  psbt.addOutput({
    address: htlcAddress,
    value: lockAmount,
  });

  // Add asset data if provided (Runestone, etc.)
  if (assetData) {
    psbt.addOutput({
      script: assetData,
      value: 0,
    });
  }

  // Add change output
  if (change > dustLimit) {
    psbt.addOutput({
      address: changeAddress,
      value: change,
    });
  }

  return {
    psbt,
    psbtBase64: psbt.toBase64(),
  };
}

/**
 * Build claim transaction (recipient claims with preimage)
 */
export function buildClaimTransaction(
  params: {
    htlcUTXO: UTXOInput;
    redeemScript: Buffer;
    preimage: Buffer;
    recipientAddress: string;
    recipientPrivkey: Buffer;
    feeRate: number;
    network: 'mainnet' | 'testnet' | 'regtest';
  }
): PSBTResult {
  const { htlcUTXO, redeemScript, preimage, recipientAddress, recipientPrivkey, feeRate, network } = params;
  const btcNetwork = getNetwork(network);

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  // Estimate fee (P2SH claim: ~180 vbytes)
  const estimatedVBytes = 180;
  const fee = Math.ceil(estimatedVBytes * feeRate);

  const outputValue = htlcUTXO.value - fee;
  if (outputValue < 546) {
    throw new Error('HTLC value too small to claim after fees');
  }

  // Add HTLC input
  psbt.addInput({
    hash: htlcUTXO.txid,
    index: htlcUTXO.vout,
    witnessUtxo: {
      script: bitcoin.payments.p2sh({ redeem: { output: redeemScript, network: btcNetwork }, network: btcNetwork }).output!,
      value: htlcUTXO.value,
    },
    redeemScript: redeemScript,
    witnessScript: redeemScript, // For P2WSH
  });

  // Add output to recipient
  psbt.addOutput({
    address: recipientAddress,
    value: outputValue,
  });

  // Sign the input (will be finalized with preimage)
  const keyPair = ECPair.fromPrivateKey(recipientPrivkey);
  psbt.signInput(0, keyPair);

  return {
    psbt,
    psbtBase64: psbt.toBase64(),
  };
}

/**
 * Build refund transaction (sender reclaims after timeout)
 */
export function buildRefundTransaction(
  params: {
    htlcUTXO: UTXOInput;
    redeemScript: Buffer;
    senderAddress: string;
    senderPrivkey: Buffer;
    timeoutBlockHeight: number;
    feeRate: number;
    network: 'mainnet' | 'testnet' | 'regtest';
  }
): PSBTResult {
  const { htlcUTXO, redeemScript, senderAddress, senderPrivkey, timeoutBlockHeight, feeRate, network } = params;
  const btcNetwork = getNetwork(network);

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  // Set locktime for CLTV
  psbt.setLocktime(timeoutBlockHeight);

  // Estimate fee
  const estimatedVBytes = 180;
  const fee = Math.ceil(estimatedVBytes * feeRate);

  const outputValue = htlcUTXO.value - fee;
  if (outputValue < 546) {
    throw new Error('HTLC value too small to refund after fees');
  }

  // Add HTLC input with sequence for CLTV
  psbt.addInput({
    hash: htlcUTXO.txid,
    index: htlcUTXO.vout,
    sequence: 0xfffffffe, // Enable CLTV
    witnessUtxo: {
      script: bitcoin.payments.p2sh({ redeem: { output: redeemScript, network: btcNetwork }, network: btcNetwork }).output!,
      value: htlcUTXO.value,
    },
    redeemScript: redeemScript,
    witnessScript: redeemScript,
  });

  // Add output to sender
  psbt.addOutput({
    address: senderAddress,
    value: outputValue,
  });

  // Sign the input
  const keyPair = ECPair.fromPrivateKey(senderPrivkey);
  psbt.signInput(0, keyPair);

  return {
    psbt,
    psbtBase64: psbt.toBase64(),
  };
}

/**
 * Finalize a claim transaction with preimage witness
 */
export function finalizeClaimWitness(
  psbt: bitcoin.Psbt,
  inputIndex: number,
  preimage: Buffer,
  redeemScript: Buffer,
  signature: Buffer,
  pubkey: Buffer
): bitcoin.Psbt {
  // Build witness stack for claim path
  // <signature> <preimage> <1> <redeemScript>
  const witnessStack = [
    signature,
    preimage,
    bitcoin.script.number.encode(1), // OP_TRUE - take IF branch
    redeemScript,
  ];

  psbt.finalizeInput(inputIndex, () => ({
    finalScriptWitness: bitcoin.script.compile(witnessStack),
    finalScriptSig: Buffer.alloc(0), // SegWit - no scriptSig
  }));

  return psbt;
}

/**
 * Finalize a refund transaction with timeout witness
 */
export function finalizeRefundWitness(
  psbt: bitcoin.Psbt,
  inputIndex: number,
  redeemScript: Buffer,
  signature: Buffer,
  pubkey: Buffer
): bitcoin.Psbt {
  // Build witness stack for refund path
  // <signature> <0> <redeemScript>
  const witnessStack = [
    signature,
    bitcoin.script.number.encode(0), // OP_FALSE - take ELSE branch
    redeemScript,
  ];

  psbt.finalizeInput(inputIndex, () => ({
    finalScriptWitness: bitcoin.script.compile(witnessStack),
    finalScriptSig: Buffer.alloc(0),
  }));

  return psbt;
}

/**
 * Generate a random preimage and its hash
 */
export function generatePreimage(): { preimage: Buffer; paymentHash: Buffer } {
  const preimage = crypto.randomBytes(32);
  const paymentHash = crypto.createHash('sha256').update(preimage).digest();
  return { preimage, paymentHash };
}

/**
 * Verify a preimage matches a payment hash
 */
export function verifyPreimage(preimage: Buffer, paymentHash: Buffer): boolean {
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.equals(paymentHash);
}

/**
 * Calculate transaction hash from finalized PSBT
 */
export function getTransactionHash(psbt: bitcoin.Psbt): string {
  const tx = psbt.extractTransaction();
  return tx.getId();
}

/**
 * Serialize finalized transaction to hex
 */
export function getTransactionHex(psbt: bitcoin.Psbt): string {
  const tx = psbt.extractTransaction();
  return tx.toHex();
}

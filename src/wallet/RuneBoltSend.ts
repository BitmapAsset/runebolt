/**
 * RuneBoltSend — Main send orchestrator for the "paste address → send asset → done" flow.
 *
 * Fully automated: generate preimage, create deed-lock, broadcast, notify recipient.
 * The receiver's AutoClaimer + DeedWatcher handles the rest.
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import { initEccLib } from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { createDeedLock, createDeedLockTransaction, DeedLockUTXO } from '../ldp/DeedLock';
import { BitcoinRPC } from './BitcoinRPC';
import { extractInternalKey, isValidTaprootAddress } from './TaprootUtils';
import {
  createNotificationTx,
  broadcastNotification,
  deliverViaLightning,
  FundingUTXO,
} from './DeedNotifier';

initEccLib(ecc);

/** UTXO available for spending */
export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey: Buffer;
}

/** Lightning client interface (optional) */
export interface LightningClient {
  payInvoice(paymentRequest: string, amountSats: number): Promise<Buffer>;
  createHoldInvoice(paymentHash: Buffer, amountSats: number, memo: string): Promise<string>;
  onInvoiceSettled(paymentHash: Buffer, handler: (preimage: Buffer) => void): void;
}

/** Parameters for sending an asset */
export interface SendParams {
  /** Recipient's Taproot address (bc1p...) */
  recipientTaprootAddress: string;
  /** Asset to send */
  asset: {
    type: 'rune' | 'ordinal' | 'bitmap' | 'brc20';
    /** Rune ID, inscription ID, block height, or BRC-20 tick */
    id: string;
    /** Amount to send (for fungible assets) */
    amount: bigint;
  };
  /** Sender's wallet info */
  senderWallet: {
    /** Private key for signing transactions */
    privateKey: Buffer;
    /** Available UTXOs (must include the asset UTXO + fee funding UTXO) */
    utxos: UTXO[];
    /** Sender's address (for change outputs) */
    address: string;
  };
  /** Optional Lightning client for Lightning-based notification */
  lightningNode?: LightningClient;
  /** Fee rate in sat/vB (defaults to mempool estimate) */
  feeRate?: number;
  /** Trust 0-conf for amounts < 100k sats (default: false) */
  zeroConf?: boolean;
}

/** Result of a send operation */
export interface SendResult {
  /** Deed-lock transaction ID */
  txid: string;
  /** Notification transaction ID */
  notificationTxid: string;
  /** The secret preimage P */
  preimage: Buffer;
  /** Payment hash H = SHA256(P) */
  paymentHash: Buffer;
  /** Estimated seconds until receiver can claim */
  estimatedClaimTime: number;
  /** Current status */
  status: 'pending' | 'confirmed';
}

/**
 * Sends an asset to a Taproot address using the Lightning Deed Protocol.
 *
 * Fully automated flow:
 * 1. Generate preimage P + hash H
 * 2. Extract recipient pubkey from their Taproot address
 * 3. Create deed-lock PSBT
 * 4. Sign + broadcast deed-lock tx
 * 5. Build notification tx (dust output + OP_RETURN with P)
 * 6. Broadcast notification tx
 * 7. Return SendResult
 *
 * @param params - Send parameters
 * @param rpc - Bitcoin RPC client (defaults to mempool.space)
 * @returns Send result with txids and status
 */
export async function sendAsset(
  params: SendParams,
  rpc?: BitcoinRPC
): Promise<SendResult> {
  const client = rpc || BitcoinRPC.mempool();

  // Validate recipient address
  if (!isValidTaprootAddress(params.recipientTaprootAddress)) {
    throw new Error(`Invalid Taproot address: ${params.recipientTaprootAddress}`);
  }

  // Determine network from address prefix
  const network = params.recipientTaprootAddress.startsWith('tb1p')
    ? bitcoin.networks.testnet
    : params.recipientTaprootAddress.startsWith('bcrt1p')
      ? bitcoin.networks.regtest
      : bitcoin.networks.bitcoin;

  // Step 1: Generate preimage P and hash H
  const preimage = crypto.randomBytes(32);
  const paymentHash = crypto.createHash('sha256').update(preimage).digest();

  // Step 2: Extract recipient pubkey from Taproot address
  const recipientPubkey = extractInternalKey(params.recipientTaprootAddress);

  // Step 3: Find the asset UTXO and create deed-lock
  const assetUtxo = params.senderWallet.utxos[0]; // First UTXO is the asset
  if (!assetUtxo) throw new Error('No UTXOs available for deed-lock');

  const senderPrivkey = params.senderWallet.privateKey;
  const senderPubkeyFull = Buffer.from(ecc.pointFromScalar(senderPrivkey)!);
  const senderXOnlyPubkey = senderPubkeyFull.subarray(1, 33); // x-only (drop prefix byte)

  const deedLockUtxo: DeedLockUTXO = {
    txid: assetUtxo.txid,
    vout: assetUtxo.vout,
    value: assetUtxo.value,
    scriptPubKey: assetUtxo.scriptPubKey,
    ownerPubkey: senderXOnlyPubkey,
    runeId: params.asset.type === 'rune' ? params.asset.id : undefined,
    runeAmount: params.asset.type === 'rune' ? params.asset.amount : undefined,
  };

  const timeoutBlocks = 144; // ~1 day recovery timeout
  const deedLock = createDeedLock(
    deedLockUtxo,
    recipientPubkey,
    timeoutBlocks,
    preimage,
    network
  );

  // Get fee rate
  const feeRate = params.feeRate || (await client.estimateFee(6));

  // Step 4: Build deed-lock transaction PSBT
  const deedLockPsbt = createDeedLockTransaction(deedLockUtxo, deedLock, feeRate, network);

  // Sign the deed-lock PSBT
  const keypair = {
    publicKey: senderPubkeyFull,
    privateKey: senderPrivkey,
  };
  deedLockPsbt.signInput(0, {
    publicKey: keypair.publicKey,
    sign: (hash: Buffer) => Buffer.from(ecc.sign(hash, keypair.privateKey)!),
  });
  deedLockPsbt.finalizeAllInputs();

  // Broadcast deed-lock tx
  const deedLockTx = deedLockPsbt.extractTransaction();
  const deedLockTxid = await client.broadcastTx(deedLockTx.toHex());

  // Step 5: Build notification tx
  // Must use a separate UTXO from the asset to avoid double-spending
  if (params.senderWallet.utxos.length < 2) {
    throw new Error('At least 2 UTXOs required: one for the asset deed-lock and one for the notification transaction');
  }
  const fundingUtxo = params.senderWallet.utxos[1];

  const notificationFunding: FundingUTXO = {
    txid: fundingUtxo.txid,
    vout: fundingUtxo.vout,
    value: fundingUtxo.value,
    scriptPubKey: fundingUtxo.scriptPubKey,
  };

  const notificationPsbt = createNotificationTx(
    params.recipientTaprootAddress,
    preimage,
    deedLockTxid,
    notificationFunding,
    params.senderWallet.address,
    feeRate,
    network
  );

  // Sign notification tx
  notificationPsbt.signInput(0, {
    publicKey: keypair.publicKey,
    sign: (hash: Buffer) => Buffer.from(ecc.sign(hash, keypair.privateKey)!),
  });
  notificationPsbt.finalizeAllInputs();

  // Step 6: Broadcast notification tx
  const notificationTx = notificationPsbt.extractTransaction();
  const notificationTxid = await client.broadcastTx(notificationTx.toHex());

  // Step 7: Return result
  return {
    txid: deedLockTxid,
    notificationTxid,
    preimage,
    paymentHash,
    estimatedClaimTime: params.zeroConf ? 15 : 600, // 15s for 0-conf, ~10min for 1-conf
    status: 'pending',
  };
}

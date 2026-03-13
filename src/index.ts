import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';

// Types
export type AssetType = 'rune' | 'ordinal' | 'bitmap';

export interface Asset {
  type: AssetType;
  id: string;
  amount: number;
  ticker?: string;
}

export interface DeedParams {
  asset: Asset;
  senderPubkey: string;
  recipientPubkey: string;
  paymentHash: string;
  timeoutBlocks: number;
}

export interface DeedLock {
  script: Buffer;
  address: string;
  redeemScript: Buffer;
}

/**
 * Create a deed lock for asset transfer
 */
export function createDeedLock(params: DeedParams): DeedLock {
  const { asset, senderPubkey, recipientPubkey, paymentHash, timeoutBlocks } = params;
  
  // Create asset ID hash
  const assetId = `${asset.type}:${asset.id}:${asset.amount}`;
  const assetHash = bitcoin.crypto.hash160(Buffer.from(assetId));
  
  // Create redeem script
  const redeemScript = bitcoin.script.compile([
    bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_HASH160,
      assetHash,
      bitcoin.opcodes.OP_EQUALVERIFY,
      bitcoin.opcodes.OP_HASH160,
      Buffer.from(paymentHash, 'hex'),
      bitcoin.opcodes.OP_EQUALVERIFY,
      Buffer.from(recipientPubkey, 'hex'),
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(timeoutBlocks),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      Buffer.from(senderPubkey, 'hex'),
      bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_ENDIF
  ]);
  
  // Create P2SH address
  const p2sh = bitcoin.payments.p2sh({
    redeem: { output: redeemScript, network: bitcoin.networks.bitcoin },
    network: bitcoin.networks.bitcoin
  });
  
  return {
    script: p2sh.output!,
    address: p2sh.address!,
    redeemScript
  };
}
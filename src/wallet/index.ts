export { KeyManager } from './KeyManager';
export { UTXOManager } from './UTXOManager';
export { SigningEngine } from './SigningEngine';
export type { TxInput, TxOutput } from './SigningEngine';
export { WalletEncryption } from './WalletEncryption';

// ── Phase 2: Wallet Automation ──

export { sendAsset } from './RuneBoltSend';
export type { SendParams, SendResult, UTXO, LightningClient } from './RuneBoltSend';

export {
  encodeNotification,
  decodeNotification,
  createNotificationTx,
  broadcastNotification,
  deliverViaLightning,
} from './DeedNotifier';
export type { DecodedNotification, FundingUTXO } from './DeedNotifier';

export { DeedWatcher } from './DeedWatcher';
export type { IncomingDeed } from './DeedWatcher';

export { AutoClaimer } from './AutoClaimer';
export type { WalletConfig, AutoClaimerConfig, ClaimResult } from './AutoClaimer';

export { BitcoinRPC } from './BitcoinRPC';
export type { RawTransaction, BlockData, FeeEstimation, RPCBackend } from './BitcoinRPC';

export {
  extractInternalKey,
  taprootAddressToXOnlyPubkey,
  isValidTaprootAddress,
  pubkeyToTaprootAddress,
} from './TaprootUtils';

// ── Convenience ──

import { sendAsset, SendParams, SendResult, UTXO } from './RuneBoltSend';
import { BitcoinRPC } from './BitcoinRPC';

/**
 * One-liner convenience for sending any asset to a Taproot address.
 *
 * @param recipientAddress - bc1p... Taproot address
 * @param assetId - Rune ID, inscription ID, or block height
 * @param amount - Amount to send
 * @param senderPrivkey - Sender's private key
 * @param senderUtxos - Available UTXOs
 * @param senderAddress - Sender's address for change
 * @returns SendResult with txids and status
 */
export async function quickSend(
  recipientAddress: string,
  assetId: string,
  amount: bigint,
  senderPrivkey: Buffer,
  senderUtxos: UTXO[],
  senderAddress: string
): Promise<SendResult> {
  return sendAsset({
    recipientTaprootAddress: recipientAddress,
    asset: {
      type: 'rune',
      id: assetId,
      amount,
    },
    senderWallet: {
      privateKey: senderPrivkey,
      utxos: senderUtxos,
      address: senderAddress,
    },
  });
}

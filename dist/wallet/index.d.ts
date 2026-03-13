export { KeyManager } from './KeyManager';
export { UTXOManager } from './UTXOManager';
export { SigningEngine } from './SigningEngine';
export type { TxInput, TxOutput } from './SigningEngine';
export { WalletEncryption } from './WalletEncryption';
export { sendAsset } from './RuneBoltSend';
export type { SendParams, SendResult, UTXO, LightningClient } from './RuneBoltSend';
export { encodeNotification, decodeNotification, createNotificationTx, broadcastNotification, deliverViaLightning, } from './DeedNotifier';
export type { DecodedNotification, FundingUTXO } from './DeedNotifier';
export { DeedWatcher } from './DeedWatcher';
export type { IncomingDeed } from './DeedWatcher';
export { AutoClaimer } from './AutoClaimer';
export type { WalletConfig, AutoClaimerConfig, ClaimResult } from './AutoClaimer';
export { BitcoinRPC } from './BitcoinRPC';
export type { RawTransaction, BlockData, FeeEstimation, RPCBackend } from './BitcoinRPC';
export { extractInternalKey, taprootAddressToXOnlyPubkey, isValidTaprootAddress, pubkeyToTaprootAddress, } from './TaprootUtils';
import { SendResult, UTXO } from './RuneBoltSend';
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
export declare function quickSend(recipientAddress: string, assetId: string, amount: bigint, senderPrivkey: Buffer, senderUtxos: UTXO[], senderAddress: string): Promise<SendResult>;
//# sourceMappingURL=index.d.ts.map
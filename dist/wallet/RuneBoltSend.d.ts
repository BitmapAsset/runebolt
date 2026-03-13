/**
 * RuneBoltSend — Main send orchestrator for the "paste address → send asset → done" flow.
 *
 * Fully automated: generate preimage, create deed-lock, broadcast, notify recipient.
 * The receiver's AutoClaimer + DeedWatcher handles the rest.
 */
import { BitcoinRPC } from './BitcoinRPC';
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
export declare function sendAsset(params: SendParams, rpc?: BitcoinRPC): Promise<SendResult>;
//# sourceMappingURL=RuneBoltSend.d.ts.map
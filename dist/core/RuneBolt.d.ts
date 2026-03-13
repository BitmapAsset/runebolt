import { RuneBoltConfig, WalletUpdate, WrapRequest, UnwrapRequest, WalletInfo, TaprootAsset, AssetChannel, AssetInvoice, AssetPayment, InscriptionInfo } from '../types';
import { KeyManager, UTXOManager, SigningEngine } from '../wallet';
import { TaprootAssetManager, RuneWrapper, AssetChannelManager, ProofVerifier } from '../taproot';
import { ChannelManager, InvoiceManager, PeerDiscovery, RoutingEngine } from '../lightning';
import { BitmapDetector, InscriptionTransfer } from '../bitmap';
import { AuditLog } from '../security';
type UpdateListener = (update: WalletUpdate) => void;
/**
 * RuneBolt - Self-sovereign Runes-over-Lightning wallet.
 *
 * This is WALLET SOFTWARE, not a service. Users control their own keys.
 * No custodial moments. No telemetry. Everything runs locally.
 */
export declare class RuneBolt {
    readonly keyManager: KeyManager;
    readonly utxoManager: UTXOManager;
    readonly signingEngine: SigningEngine;
    readonly tapd: TaprootAssetManager;
    readonly runeWrapper: RuneWrapper;
    readonly assetChannels: AssetChannelManager;
    readonly proofVerifier: ProofVerifier;
    readonly channelManager: ChannelManager;
    readonly invoiceManager: InvoiceManager;
    readonly peerDiscovery: PeerDiscovery;
    readonly routingEngine: RoutingEngine;
    readonly bitmapDetector: BitmapDetector;
    readonly inscriptionTransfer: InscriptionTransfer;
    readonly auditLog: AuditLog;
    private readonly config;
    private readonly rateLimiter;
    private readonly listeners;
    private lockTimeout;
    constructor(config: RuneBoltConfig);
    /**
     * Initialize a new wallet from a freshly generated mnemonic.
     * Returns the mnemonic ONCE - user must back it up.
     */
    initWallet(password: string): Promise<{
        mnemonic: string;
        fingerprint: string;
    }>;
    /**
     * Import a wallet from an existing mnemonic.
     */
    importWallet(mnemonic: string, password: string): Promise<{
        fingerprint: string;
    }>;
    /**
     * Unlock the wallet with password.
     */
    unlock(password: string): Promise<WalletInfo>;
    /**
     * Lock the wallet - zero keys from memory.
     */
    lock(): void;
    /**
     * Get wallet info (addresses, fingerprint, etc).
     */
    getWalletInfo(): WalletInfo;
    /**
     * Connect to LND and tapd daemons.
     */
    connect(): Promise<void>;
    /**
     * Disconnect from daemons.
     */
    disconnect(): Promise<void>;
    /**
     * Wrap Runes into Taproot Assets for Lightning transport.
     */
    wrap(request: WrapRequest): Promise<{
        operationId: string;
        assetId: string | null;
    }>;
    /**
     * Unwrap Taproot Assets back to native Runes.
     */
    unwrap(request: UnwrapRequest): Promise<{
        operationId: string;
    }>;
    /**
     * Send a Taproot Asset payment over Lightning.
     */
    sendAssetPayment(assetId: string, invoice: string): Promise<AssetPayment>;
    /**
     * Create an invoice to receive a Taproot Asset payment.
     */
    createInvoice(assetId: string, amount: bigint, memo?: string): Promise<AssetInvoice>;
    /**
     * Open a Taproot Asset channel.
     */
    openChannel(peerPubkey: string, assetId: string, localAmount: bigint): Promise<AssetChannel>;
    /**
     * Close a Taproot Asset channel.
     */
    closeChannel(channelId: string): Promise<void>;
    /**
     * Get all balances: BTC, Runes, Taproot Assets.
     */
    getBalances(): Promise<{
        btcSats: number;
        runes: Map<string, {
            runeId: {
                block: number;
                tx: number;
            };
            total: bigint;
        }>;
        taprootAssets: TaprootAsset[];
        channels: AssetChannel[];
    }>;
    /**
     * Scan wallet UTXOs for bitmap inscriptions.
     */
    scanBitmaps(): Promise<InscriptionInfo[]>;
    onUpdate(listener: UpdateListener): void;
    private emit;
    private ensureUnlocked;
    private resetLockTimer;
}
export {};
//# sourceMappingURL=RuneBolt.d.ts.map
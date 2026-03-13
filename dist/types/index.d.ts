import { z } from 'zod';
export type BitcoinNetwork = 'mainnet' | 'testnet' | 'regtest';
export interface RuneId {
    block: number;
    tx: number;
}
export interface RuneBalance {
    runeId: RuneId;
    runeName: string;
    amount: bigint;
    address: string;
    utxo: UtxoRef;
}
export interface UtxoRef {
    txid: string;
    vout: number;
    value: number;
}
export interface RuneTransfer {
    runeId: RuneId;
    amount: bigint;
    from: string;
    to: string;
}
export interface Utxo extends UtxoRef {
    scriptPubKey: string;
    confirmations: number;
    runeBalance?: RuneBalance;
}
export interface TaprootAsset {
    assetId: string;
    name: string;
    amount: bigint;
    scriptKey: Buffer;
    groupKey?: Buffer;
    anchorTxid: string;
    anchorVout: number;
    proofData: Buffer;
}
export interface AssetProof {
    assetId: string;
    proofFile: Buffer;
    anchorTx: string;
    merkleRoot: Buffer;
    verified: boolean;
}
export interface WrapRequest {
    runeId: RuneId;
    runeName: string;
    amount: bigint;
    sourceUtxo: UtxoRef;
    destinationPubkey: Buffer;
}
export interface UnwrapRequest {
    assetId: string;
    amount: bigint;
    destinationAddress: string;
    proof: AssetProof;
}
export declare enum WrapState {
    PENDING = "pending",
    RUNE_LOCKED = "rune_locked",
    ASSET_MINTED = "asset_minted",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface WrapOperation {
    id: string;
    state: WrapState;
    runeId: RuneId;
    runeName: string;
    runeAmount: bigint;
    assetId: string | null;
    lockTxid: string | null;
    mintTxid: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface AssetChannel {
    channelId: string;
    peerPubkey: string;
    assetId: string;
    localBalance: bigint;
    remoteBalance: bigint;
    capacity: bigint;
    active: boolean;
}
export interface AssetInvoice {
    paymentRequest: string;
    paymentHash: string;
    assetId: string;
    assetAmount: bigint;
    expiry: number;
    createdAt: Date;
}
export interface AssetPayment {
    paymentHash: string;
    preimage: string;
    assetId: string;
    assetAmount: bigint;
    feeSat: number;
    status: 'succeeded' | 'failed' | 'in_flight';
}
export interface LightningPeer {
    pubkey: string;
    address: string;
    alias: string;
    supportsTaprootAssets: boolean;
    assetChannels: string[];
}
export interface RouteHop {
    pubkey: string;
    channelId: string;
    assetId: string;
    fee: bigint;
}
export interface PaymentRoute {
    hops: RouteHop[];
    totalFee: bigint;
    estimatedTime: number;
}
export interface WalletInfo {
    fingerprint: string;
    createdAt: Date;
    network: BitcoinNetwork;
    addresses: WalletAddress[];
}
export interface WalletAddress {
    path: string;
    address: string;
    type: 'p2tr' | 'p2wpkh';
    index: number;
}
export interface EncryptedWallet {
    version: number;
    salt: Buffer;
    iv: Buffer;
    ciphertext: Buffer;
    tag: Buffer;
    argon2Params: {
        timeCost: number;
        memoryCost: number;
        parallelism: number;
    };
}
export interface InscriptionInfo {
    inscriptionId: string;
    contentType: string;
    contentLength: number;
    genesisHeight: number;
    genesisFee: number;
    address: string;
    utxo: UtxoRef;
    isBitmap: boolean;
    bitmapNumber?: number;
}
export interface AuditEntry {
    id: string;
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
    previousHash: string;
    hash: string;
}
export interface RuneBoltConfig {
    network: BitcoinNetwork;
    bitcoin: {
        rpcUrl: string;
        rpcUser: string;
        rpcPass: string;
    };
    lnd: {
        host: string;
        port: number;
        tlsCertPath: string;
        macaroonPath: string;
    };
    tapd: {
        host: string;
        port: number;
        tlsCertPath: string;
        macaroonPath: string;
    };
    indexer: {
        ordApiUrl: string;
    };
    wallet: {
        dataDir: string;
        walletFile: string;
        auditLogFile: string;
        unlockTimeoutMs: number;
        maxUnlockAttempts: number;
        lockoutDurationMs: number;
    };
    server: {
        port: number;
        host: string;
        corsOrigins: string[];
    };
}
export declare const WrapRequestSchema: z.ZodObject<{
    runeName: z.ZodString;
    runeAmount: z.ZodString;
}, z.core.$strip>;
export declare const UnwrapRequestSchema: z.ZodObject<{
    assetId: z.ZodString;
    amount: z.ZodString;
    destinationAddress: z.ZodString;
}, z.core.$strip>;
export declare const SendAssetSchema: z.ZodObject<{
    assetId: z.ZodString;
    amount: z.ZodString;
    invoice: z.ZodString;
}, z.core.$strip>;
export declare const OpenChannelSchema: z.ZodObject<{
    peerPubkey: z.ZodString;
    assetId: z.ZodString;
    localAmount: z.ZodString;
}, z.core.$strip>;
export declare enum WalletEvent {
    WRAP_STARTED = "wrap:started",
    WRAP_RUNE_LOCKED = "wrap:rune_locked",
    WRAP_ASSET_MINTED = "wrap:asset_minted",
    WRAP_COMPLETED = "wrap:completed",
    UNWRAP_STARTED = "unwrap:started",
    UNWRAP_COMPLETED = "unwrap:completed",
    CHANNEL_OPENED = "channel:opened",
    CHANNEL_CLOSED = "channel:closed",
    PAYMENT_SENT = "payment:sent",
    PAYMENT_RECEIVED = "payment:received",
    BALANCE_UPDATED = "balance:updated"
}
export interface WalletUpdate {
    event: WalletEvent;
    data: Record<string, unknown>;
    timestamp: Date;
}
export interface FeeEstimate {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    minimumFee: number;
}
//# sourceMappingURL=index.d.ts.map
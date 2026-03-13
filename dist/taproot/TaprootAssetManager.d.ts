import { TaprootAsset, AssetProof, RuneBoltConfig } from '../types';
export declare class TaprootAssetManager {
    private client;
    private universeClient;
    private readonly config;
    constructor(config: RuneBoltConfig);
    connect(): Promise<void>;
    private promisify;
    /**
     * Mint a new Taproot Asset representing wrapped Runes.
     */
    mintAsset(name: string, amount: bigint, metaData: Buffer): Promise<{
        assetId: string;
        batchTxid: string;
    }>;
    /**
     * Finalize a mint batch (broadcast the anchor transaction).
     */
    finalizeBatch(): Promise<{
        batchTxid: string;
    }>;
    /**
     * List all assets owned by this wallet.
     */
    listAssets(): Promise<TaprootAsset[]>;
    /**
     * Get asset balance.
     */
    getAssetBalance(assetId: string): Promise<bigint>;
    /**
     * Send a Taproot Asset on-chain (for unwrapping).
     */
    sendAsset(assetId: string, amount: bigint, scriptKey: Buffer): Promise<{
        txid: string;
    }>;
    /**
     * Create a new Taproot Asset address for receiving.
     */
    newAddress(assetId: string, amount: bigint): Promise<string>;
    /**
     * Export a proof for a specific asset.
     */
    exportProof(assetId: string, scriptKey: Buffer): Promise<AssetProof>;
    /**
     * Verify a received proof.
     */
    verifyProof(proofFile: Buffer): Promise<{
        valid: boolean;
        assetId: string;
    }>;
    close(): Promise<void>;
}
//# sourceMappingURL=TaprootAssetManager.d.ts.map
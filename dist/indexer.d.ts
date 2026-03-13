/**
 * Runes Indexer — Unisat Open API Integration
 * Fetches real Runes, Ordinals, and Bitmap balances for any address
 */
export interface RuneBalance {
    runeid: string;
    rune: string;
    symbol: string;
    balance: string;
    divisibility: number;
}
export interface OrdinalItem {
    inscriptionId: string;
    inscriptionNumber: number;
    contentType: string;
    contentLength: number;
}
export interface BitmapItem {
    blockNumber: number;
    inscriptionId: string;
}
export interface AssetBalance {
    address: string;
    runes: Array<{
        id: string;
        name: string;
        symbol: string;
        amount: number;
        decimals: number;
    }>;
    ordinals: Array<{
        id: string;
        inscriptionNumber: number;
        contentType: string;
    }>;
    bitmaps: Array<{
        blockNumber: number;
        inscriptionId: string;
    }>;
}
/**
 * Fetch Runes balances for an address
 */
export declare function fetchRunesBalances(address: string, network?: 'mainnet' | 'testnet'): Promise<RuneBalance[]>;
/**
 * Fetch Ordinals inscriptions for an address
 */
export declare function fetchOrdinals(address: string, network?: 'mainnet' | 'testnet'): Promise<OrdinalItem[]>;
/**
 * Fetch Bitmap assets (inscriptions with block number format)
 */
export declare function fetchBitmaps(address: string, network?: 'mainnet' | 'testnet'): Promise<BitmapItem[]>;
/**
 * Get complete asset balance for an address
 */
export declare function getAssetBalance(address: string, network?: 'mainnet' | 'testnet'): Promise<AssetBalance>;
/**
 * Validate if an address owns a specific asset
 */
export declare function verifyAssetOwnership(address: string, assetType: 'rune' | 'ordinal' | 'bitmap', assetId: string, minAmount?: number, network?: 'mainnet' | 'testnet'): Promise<boolean>;
/**
 * Clear cache for an address (useful after transactions)
 */
export declare function clearAddressCache(address: string): void;
//# sourceMappingURL=indexer.d.ts.map
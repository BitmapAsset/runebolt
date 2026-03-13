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
export declare function createDeedLock(params: DeedParams): DeedLock;
//# sourceMappingURL=index.d.ts.map
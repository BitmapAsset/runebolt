import { PaymentRoute, AssetChannel } from '../types';
export declare class RoutingEngine {
    private readonly getChannels;
    constructor(getChannels: () => AssetChannel[]);
    /**
     * Find a route for a Taproot Asset payment.
     * Routes through channels that support the specific asset.
     */
    findRoute(assetId: string, amount: bigint, destinationPubkey: string): PaymentRoute | null;
    /**
     * Find multiple routes for redundancy.
     */
    findRoutes(assetId: string, amount: bigint, destinationPubkey: string, maxRoutes?: number): PaymentRoute[];
    /**
     * Estimate fee for a payment amount.
     */
    estimateFee(assetId: string, amount: bigint, destinationPubkey: string): bigint;
}
//# sourceMappingURL=RoutingEngine.d.ts.map
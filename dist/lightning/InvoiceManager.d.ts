import { AssetInvoice, AssetPayment } from '../types';
import { ChannelManager } from './ChannelManager';
export declare class InvoiceManager {
    private readonly channelManager;
    private readonly invoices;
    private readonly payments;
    constructor(channelManager: ChannelManager);
    /**
     * Create a Lightning invoice for receiving a Taproot Asset payment.
     * Uses tapd's invoice extension for asset-aware invoices.
     */
    createAssetInvoice(assetId: string, assetAmount: bigint, memo?: string, expiry?: number): Promise<AssetInvoice>;
    /**
     * Pay a Lightning invoice with Taproot Assets.
     */
    payAssetInvoice(paymentRequest: string, assetId: string, maxFee?: bigint): Promise<AssetPayment>;
    /**
     * Look up an invoice by payment hash.
     */
    lookupInvoice(paymentHash: string): AssetInvoice | undefined;
    /**
     * Look up a payment by payment hash.
     */
    lookupPayment(paymentHash: string): AssetPayment | undefined;
    /**
     * List all invoices.
     */
    listInvoices(): AssetInvoice[];
    /**
     * List all payments.
     */
    listPayments(): AssetPayment[];
}
//# sourceMappingURL=InvoiceManager.d.ts.map
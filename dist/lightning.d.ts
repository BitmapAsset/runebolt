export interface LightningInvoice {
    paymentRequest: string;
    paymentHash: string;
    amount: number;
    expiry: number;
}
export interface PaymentResult {
    success: boolean;
    preimage?: string;
    error?: string;
}
export interface NodeInfo {
    pubkey: string;
    alias: string;
    version: string;
    chains: any[];
}
export interface ChannelBalance {
    localBalance: number;
    remoteBalance: number;
}
export declare class LightningBridge {
    private nodeUrl;
    private macaroon;
    constructor(nodeUrl: string, macaroon: string);
    getNodeInfo(): Promise<NodeInfo>;
    getBalance(): Promise<ChannelBalance>;
    createInvoice(amountSats: number, expirySeconds?: number): Promise<LightningInvoice>;
    sendPayment(paymentRequest: string): Promise<PaymentResult>;
    checkPayment(paymentHash: string): Promise<PaymentResult>;
}
//# sourceMappingURL=lightning.d.ts.map
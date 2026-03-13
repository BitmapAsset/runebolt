export interface WalletConnector {
    name: string;
    connect(): Promise<string>;
    signPsbt(psbt: string): Promise<string>;
    getPublicKey(): Promise<string>;
}
export declare class UnisatConnector implements WalletConnector {
    name: string;
    connect(): Promise<string>;
    signPsbt(psbt: string): Promise<string>;
    getPublicKey(): Promise<string>;
}
export declare function createWalletConnector(name: 'unisat' | 'xverse'): WalletConnector;
//# sourceMappingURL=wallets.d.ts.map
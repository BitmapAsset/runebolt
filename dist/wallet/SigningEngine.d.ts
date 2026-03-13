import { Utxo, BitcoinNetwork } from '../types';
import { KeyManager } from './KeyManager';
export interface TxInput {
    utxo: Utxo;
    derivationPath: string;
}
export interface TxOutput {
    address: string;
    value: number;
}
export declare class SigningEngine {
    private readonly keyManager;
    private readonly network;
    constructor(keyManager: KeyManager, network: BitcoinNetwork);
    /**
     * Build and sign a Taproot transaction. All signing happens locally.
     * Private keys are zeroed from memory after signing.
     */
    signTaprootTx(inputs: TxInput[], outputs: TxOutput[]): Promise<string>;
    /**
     * Sign a segwit (P2WPKH) transaction.
     */
    signSegwitTx(inputs: TxInput[], outputs: TxOutput[]): Promise<string>;
    /**
     * Estimate transaction fee.
     */
    estimateFee(inputCount: number, outputCount: number, feeRate: number, taproot?: boolean): number;
    private createTweakedSigner;
}
//# sourceMappingURL=SigningEngine.d.ts.map
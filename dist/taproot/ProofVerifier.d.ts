import { TaprootAssetManager } from './TaprootAssetManager';
export declare class ProofVerifier {
    private readonly tapd;
    constructor(tapd: TaprootAssetManager);
    /**
     * Verify a Taproot Asset proof file using tapd.
     */
    verifyProof(proofFile: Buffer): Promise<{
        valid: boolean;
        assetId: string;
        amount: bigint;
        error?: string;
    }>;
    /**
     * Verify that a proof chain is valid from genesis to current state.
     */
    verifyProofChain(proofFiles: Buffer[]): Promise<boolean>;
    /**
     * Verify that a Taproot Asset matches the expected wrapped Rune metadata.
     */
    verifyWrappedRuneMetadata(metadata: Buffer, expectedRuneId: string, expectedRuneName: string): boolean;
    /**
     * Compute the asset ID from genesis parameters (for local verification).
     */
    computeAssetId(name: string, metadata: Buffer, genesisTxid: string, genesisVout: number): string;
}
//# sourceMappingURL=ProofVerifier.d.ts.map
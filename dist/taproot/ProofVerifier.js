"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofVerifier = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('ProofVerifier');
class ProofVerifier {
    tapd;
    constructor(tapd) {
        this.tapd = tapd;
    }
    /**
     * Verify a Taproot Asset proof file using tapd.
     */
    async verifyProof(proofFile) {
        try {
            if (proofFile.length === 0) {
                return { valid: false, assetId: '', amount: 0n, error: 'Empty proof file' };
            }
            const result = await this.tapd.verifyProof(proofFile);
            log.info({ assetId: result.assetId, valid: result.valid }, 'Proof verification result');
            return {
                valid: result.valid,
                assetId: result.assetId,
                amount: 0n, // Would be extracted from the decoded proof
            };
        }
        catch (err) {
            log.error({ err }, 'Proof verification failed');
            return {
                valid: false,
                assetId: '',
                amount: 0n,
                error: err.message,
            };
        }
    }
    /**
     * Verify that a proof chain is valid from genesis to current state.
     */
    async verifyProofChain(proofFiles) {
        for (const proof of proofFiles) {
            const result = await this.verifyProof(proof);
            if (!result.valid) {
                log.warn({ assetId: result.assetId }, 'Proof chain broken');
                return false;
            }
        }
        return true;
    }
    /**
     * Verify that a Taproot Asset matches the expected wrapped Rune metadata.
     */
    verifyWrappedRuneMetadata(metadata, expectedRuneId, expectedRuneName) {
        try {
            const parsed = JSON.parse(metadata.toString('utf-8'));
            if (parsed.type !== 'wrapped_rune')
                return false;
            if (parsed.runeId !== expectedRuneId)
                return false;
            if (parsed.runeName !== expectedRuneName)
                return false;
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Compute the asset ID from genesis parameters (for local verification).
     */
    computeAssetId(name, metadata, genesisTxid, genesisVout) {
        const preimage = Buffer.concat([
            Buffer.from(name, 'utf-8'),
            metadata,
            Buffer.from(genesisTxid, 'hex'),
            Buffer.from([genesisVout]),
        ]);
        return crypto_1.default.createHash('sha256').update(preimage).digest('hex');
    }
}
exports.ProofVerifier = ProofVerifier;
//# sourceMappingURL=ProofVerifier.js.map
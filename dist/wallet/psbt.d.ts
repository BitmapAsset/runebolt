/**
 * PSBT Builder — HTLC Transaction Construction
 * Builds lock, claim, and refund transactions for RuneBolt
 */
import * as bitcoin from 'bitcoinjs-lib';
export declare function getNetwork(network?: 'mainnet' | 'testnet' | 'regtest'): bitcoin.Network;
export interface HTLCParams {
    senderPubkey: Buffer;
    recipientPubkey: Buffer;
    paymentHash: Buffer;
    timeoutBlockHeight: number;
    assetId: string;
    network: 'mainnet' | 'testnet' | 'regtest';
}
export interface HTLCScript {
    redeemScript: Buffer;
    p2shAddress: string;
    p2shOutput: Buffer;
    witnessScript?: Buffer;
}
export interface PSBTResult {
    psbt: bitcoin.Psbt;
    psbtBase64: string;
    hex?: string;
}
/**
 * Create HTLC redeem script
 *
 * Script structure:
 * OP_IF
 *   OP_SHA256 <payment_hash> OP_EQUALVERIFY
 *   <recipient_pubkey> OP_CHECKSIG
 * OP_ELSE
 *   <timeout_blockheight> OP_CHECKLOCKTIMEVERIFY OP_DROP
 *   <sender_pubkey> OP_CHECKSIG
 * OP_ENDIF
 */
export declare function createHTLCScript(params: HTLCParams): HTLCScript;
/**
 * Create Taproot HTLC script (more efficient for modern wallets)
 * Uses P2TR with a script-path spend
 */
export declare function createTaprootHTLC(params: HTLCParams): HTLCScript;
export interface UTXOInput {
    txid: string;
    vout: number;
    value: number;
    scriptPubKey?: string;
}
export interface AssetOutput {
    address: string;
    value: number;
}
/**
 * Build HTLC lock transaction (PSBT)
 * Sender creates this to lock their asset
 */
export declare function buildLockTransaction(params: {
    senderAddress: string;
    htlcAddress: string;
    assetAmount: number;
    fundingUTXOs: UTXOInput[];
    changeAddress: string;
    feeRate: number;
    network: 'mainnet' | 'testnet' | 'regtest';
    assetData?: Buffer;
}): PSBTResult;
/**
 * Build claim transaction (recipient claims with preimage)
 */
export declare function buildClaimTransaction(params: {
    htlcUTXO: UTXOInput;
    redeemScript: Buffer;
    preimage: Buffer;
    recipientAddress: string;
    recipientPrivkey: Buffer;
    feeRate: number;
    network: 'mainnet' | 'testnet' | 'regtest';
}): PSBTResult;
/**
 * Build refund transaction (sender reclaims after timeout)
 */
export declare function buildRefundTransaction(params: {
    htlcUTXO: UTXOInput;
    redeemScript: Buffer;
    senderAddress: string;
    senderPrivkey: Buffer;
    timeoutBlockHeight: number;
    feeRate: number;
    network: 'mainnet' | 'testnet' | 'regtest';
}): PSBTResult;
/**
 * Finalize a claim transaction with preimage witness
 */
export declare function finalizeClaimWitness(psbt: bitcoin.Psbt, inputIndex: number, preimage: Buffer, redeemScript: Buffer, signature: Buffer, pubkey: Buffer): bitcoin.Psbt;
/**
 * Finalize a refund transaction with timeout witness
 */
export declare function finalizeRefundWitness(psbt: bitcoin.Psbt, inputIndex: number, redeemScript: Buffer, signature: Buffer, pubkey: Buffer): bitcoin.Psbt;
/**
 * Generate a random preimage and its hash
 */
export declare function generatePreimage(): {
    preimage: Buffer;
    paymentHash: Buffer;
};
/**
 * Verify a preimage matches a payment hash
 */
export declare function verifyPreimage(preimage: Buffer, paymentHash: Buffer): boolean;
/**
 * Calculate transaction hash from finalized PSBT
 */
export declare function getTransactionHash(psbt: bitcoin.Psbt): string;
/**
 * Serialize finalized transaction to hex
 */
export declare function getTransactionHex(psbt: bitcoin.Psbt): string;
//# sourceMappingURL=psbt.d.ts.map
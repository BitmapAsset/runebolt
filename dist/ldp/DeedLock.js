"use strict";
/**
 * DeedLock — Creates Tapscript hash-lock spending conditions for Rune UTXOs.
 *
 * The deed-lock adds a new Taproot spending path to a Rune UTXO:
 *   Path 1 (claim):    OP_SHA256 <paymentHash> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
 *   Path 2 (recovery): <timeoutBlocks> OP_CHECKSEQUENCEVERIFY OP_DROP <ownerPubkey> OP_CHECKSIG
 *
 * These form a P2TR Taproot tree. The recipient claims by revealing the Lightning
 * payment preimage. The owner can recover after the timeout.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildClaimScript = buildClaimScript;
exports.buildRecoveryScript = buildRecoveryScript;
exports.buildDeedLockScript = buildDeedLockScript;
exports.createDeedLock = createDeedLock;
exports.createDeedLockTransaction = createDeedLockTransaction;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto = __importStar(require("crypto"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
(0, bitcoinjs_lib_1.initEccLib)(ecc);
const { script, payments, Psbt } = bitcoin;
/**
 * Builds the claim script (hash-lock + recipient signature).
 *
 *   OP_SHA256 <paymentHash> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
 */
function buildClaimScript(paymentHash, recipientPubkey) {
    return script.compile([
        bitcoin.opcodes.OP_SHA256,
        paymentHash,
        bitcoin.opcodes.OP_EQUALVERIFY,
        recipientPubkey,
        bitcoin.opcodes.OP_CHECKSIG,
    ]);
}
/**
 * Builds the recovery script (timelock + owner signature).
 *
 *   <timeoutBlocks> OP_CHECKSEQUENCEVERIFY OP_DROP <ownerPubkey> OP_CHECKSIG
 */
function buildRecoveryScript(ownerPubkey, timeoutBlocks) {
    return script.compile([
        script.number.encode(timeoutBlocks),
        bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
        bitcoin.opcodes.OP_DROP,
        ownerPubkey,
        bitcoin.opcodes.OP_CHECKSIG,
    ]);
}
/**
 * Builds the full deed-lock Taproot script tree.
 *
 * @returns Both leaf scripts and the Taptree structure.
 */
function buildDeedLockScript(paymentHash, recipientPubkey, ownerPubkey, timeoutBlocks) {
    if (paymentHash.length !== 32)
        throw new Error('paymentHash must be 32 bytes');
    if (recipientPubkey.length !== 32)
        throw new Error('recipientPubkey must be 32 bytes (x-only)');
    if (ownerPubkey.length !== 32)
        throw new Error('ownerPubkey must be 32 bytes (x-only)');
    if (timeoutBlocks < 1 || timeoutBlocks > 65535)
        throw new Error('timeoutBlocks must be 1-65535');
    const claimScript = buildClaimScript(paymentHash, recipientPubkey);
    const recoveryScript = buildRecoveryScript(ownerPubkey, timeoutBlocks);
    const taprootTree = [
        { output: claimScript },
        { output: recoveryScript },
    ];
    return { claimScript, recoveryScript, taprootTree };
}
/**
 * Creates a deed-lock for a Rune UTXO.
 *
 * Generates a fresh payment hash (for Lightning HTLC binding), constructs the
 * Tapscript tree, and returns everything needed to build the locking transaction.
 *
 * @param utxo - The Rune UTXO to deed-lock
 * @param recipientPubkey - 32-byte x-only pubkey of the recipient
 * @param timeoutBlocks - Blocks before owner can recover (CSV timelock)
 * @param preimage - Optional preimage; if omitted, one is generated
 * @param network - Bitcoin network (default: mainnet)
 */
function createDeedLock(utxo, recipientPubkey, timeoutBlocks, preimage, network = bitcoin.networks.bitcoin) {
    const secret = preimage ?? crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(secret).digest();
    const { claimScript, recoveryScript, taprootTree } = buildDeedLockScript(paymentHash, recipientPubkey, utxo.ownerPubkey, timeoutBlocks);
    // Use an unspendable internal key (NUMS point) so only script-path spends work
    const NUMS_POINT = Buffer.from('0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0', 'hex').subarray(1); // x-only
    const p2tr = payments.p2tr({
        internalPubkey: NUMS_POINT,
        scriptTree: taprootTree,
        network,
    });
    return {
        outputScript: p2tr.output,
        address: p2tr.address,
        paymentHash,
        claimScript,
        recoveryScript,
        taprootTree,
        internalPubkey: NUMS_POINT,
        preimage: secret,
    };
}
/**
 * Creates an unsigned PSBT that sends the Rune UTXO to the deed-lock address.
 *
 * The PSBT moves the UTXO to the new P2TR output with the hash-lock tree.
 * Caller must sign with the owner's key.
 *
 * @param utxo - Source UTXO containing the Rune
 * @param deedLock - Result from createDeedLock
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
function createDeedLockTransaction(utxo, deedLock, feeRate = 2, network = bitcoin.networks.bitcoin) {
    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
            script: utxo.scriptPubKey,
            value: utxo.value,
        },
    });
    // Estimate tx size: ~150 vbytes for 1-in 1-out Taproot
    const estimatedFee = Math.ceil(150 * feeRate);
    const outputValue = utxo.value - estimatedFee;
    if (outputValue < 546) {
        throw new Error(`Output value ${outputValue} below dust limit after fee ${estimatedFee}`);
    }
    psbt.addOutput({
        script: deedLock.outputScript,
        value: outputValue,
    });
    return psbt;
}
//# sourceMappingURL=DeedLock.js.map
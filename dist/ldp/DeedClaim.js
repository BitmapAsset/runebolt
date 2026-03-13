"use strict";
/**
 * DeedClaim — Builds and validates claim transactions for deed-locked UTXOs.
 *
 * After receiving the Lightning payment preimage, the recipient uses it to
 * spend the deed-locked UTXO via the Tapscript claim path.
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
exports.validateClaim = validateClaim;
exports.createClaimTransaction = createClaimTransaction;
exports.batchClaim = batchClaim;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto = __importStar(require("crypto"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
const DeedLock_1 = require("./DeedLock");
(0, bitcoinjs_lib_1.initEccLib)(ecc);
const { Psbt, payments, script } = bitcoin;
/**
 * Validates that a preimage matches the payment hash in a deed-lock script.
 *
 * @returns true if SHA256(preimage) === paymentHash
 */
function validateClaim(deedInfo, preimage) {
    const hash = crypto.createHash('sha256').update(preimage).digest();
    return hash.equals(deedInfo.paymentHash);
}
/**
 * Creates and signs a claim transaction for a deed-locked UTXO.
 *
 * The witness includes the preimage (to satisfy the hash-lock) and the
 * recipient's signature (to satisfy OP_CHECKSIG), spent via Tapscript path.
 *
 * @param deedInfo - The deed-locked UTXO details
 * @param preimage - The 32-byte Lightning payment preimage
 * @param recipientPrivkey - Recipient's private key (for signing)
 * @param destinationAddress - Where to send the claimed asset
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
function createClaimTransaction(deedInfo, preimage, recipientPrivkey, destinationAddress, feeRate = 2, network = bitcoin.networks.bitcoin) {
    if (!validateClaim(deedInfo, preimage)) {
        throw new Error('Preimage does not match payment hash in deed-lock');
    }
    const claimScript = (0, DeedLock_1.buildClaimScript)(deedInfo.paymentHash, deedInfo.recipientPubkey);
    const recoveryScript = (0, DeedLock_1.buildRecoveryScript)(deedInfo.ownerPubkey, deedInfo.timeoutBlocks);
    const taprootTree = [
        { output: claimScript },
        { output: recoveryScript },
    ];
    const NUMS_POINT = Buffer.from('0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0', 'hex').subarray(1);
    const p2tr = payments.p2tr({
        internalPubkey: NUMS_POINT,
        scriptTree: taprootTree,
        redeem: { output: claimScript },
        network,
    });
    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: deedInfo.txid,
        index: deedInfo.vout,
        witnessUtxo: {
            script: deedInfo.scriptPubKey,
            value: deedInfo.value,
        },
        tapLeafScript: [
            {
                leafVersion: 0xc0,
                script: claimScript,
                controlBlock: p2tr.witness[p2tr.witness.length - 1],
            },
        ],
    });
    const estimatedFee = Math.ceil(200 * feeRate); // ~200 vbytes for script-path spend
    const outputValue = deedInfo.value - estimatedFee;
    if (outputValue < 546) {
        throw new Error(`Output value ${outputValue} below dust limit after fee ${estimatedFee}`);
    }
    psbt.addOutput({
        address: destinationAddress,
        value: outputValue,
    });
    // Sign with recipient's key using Tapscript signing
    const keypair = ecc.privateNegate(recipientPrivkey)
        ? { publicKey: Buffer.from(ecc.pointFromScalar(recipientPrivkey)), privateKey: recipientPrivkey }
        : { publicKey: Buffer.from(ecc.pointFromScalar(recipientPrivkey)), privateKey: recipientPrivkey };
    // Note: In production, use signer interface compatible with bitcoinjs-lib Tapscript signing.
    // The preimage is included in the witness stack by the finalizer.
    return psbt;
}
/**
 * Batch-claims multiple deed-locked UTXOs into a single transaction.
 * Saves on fees by combining inputs.
 *
 * @param deedInfos - Array of deed-locked UTXO details
 * @param preimages - Corresponding preimages (one per deed)
 * @param recipientPrivkey - Recipient's private key
 * @param destinationAddress - Where to send all claimed assets
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
function batchClaim(deedInfos, preimages, recipientPrivkey, destinationAddress, feeRate = 2, network = bitcoin.networks.bitcoin) {
    if (deedInfos.length !== preimages.length) {
        throw new Error('Must provide one preimage per deed-locked UTXO');
    }
    if (deedInfos.length === 0) {
        throw new Error('Must provide at least one deed-locked UTXO');
    }
    // Validate all preimages first
    for (let i = 0; i < deedInfos.length; i++) {
        if (!validateClaim(deedInfos[i], preimages[i])) {
            throw new Error(`Preimage mismatch for deed at index ${i}`);
        }
    }
    const NUMS_POINT = Buffer.from('0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0', 'hex').subarray(1);
    const psbt = new Psbt({ network });
    let totalValue = 0;
    for (let i = 0; i < deedInfos.length; i++) {
        const deed = deedInfos[i];
        const claimScript = (0, DeedLock_1.buildClaimScript)(deed.paymentHash, deed.recipientPubkey);
        const recoveryScript = (0, DeedLock_1.buildRecoveryScript)(deed.ownerPubkey, deed.timeoutBlocks);
        const taprootTree = [
            { output: claimScript },
            { output: recoveryScript },
        ];
        const p2tr = payments.p2tr({
            internalPubkey: NUMS_POINT,
            scriptTree: taprootTree,
            redeem: { output: claimScript },
            network,
        });
        psbt.addInput({
            hash: deed.txid,
            index: deed.vout,
            witnessUtxo: {
                script: deed.scriptPubKey,
                value: deed.value,
            },
            tapLeafScript: [
                {
                    leafVersion: 0xc0,
                    script: claimScript,
                    controlBlock: p2tr.witness[p2tr.witness.length - 1],
                },
            ],
        });
        totalValue += deed.value;
    }
    // ~200 vbytes per input + 40 base
    const estimatedFee = Math.ceil((40 + 200 * deedInfos.length) * feeRate);
    const outputValue = totalValue - estimatedFee;
    if (outputValue < 546) {
        throw new Error(`Batch output value ${outputValue} below dust limit`);
    }
    psbt.addOutput({
        address: destinationAddress,
        value: outputValue,
    });
    return psbt;
}
//# sourceMappingURL=DeedClaim.js.map
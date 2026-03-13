"use strict";
/**
 * BitmapDeed — Deed-lock and claim for Bitmap inscriptions (Ordinals UTXOs).
 *
 * Bitmap inscriptions are just UTXOs containing ordinal sats. The same Tapscript
 * hash-lock mechanism works: we add a claim path gated by the Lightning preimage
 * and a recovery path with a CSV timelock.
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
exports.createBitmapDeed = createBitmapDeed;
exports.createBitmapDeedTransaction = createBitmapDeedTransaction;
exports.claimBitmapDeed = claimBitmapDeed;
exports.validateBitmapClaim = validateBitmapClaim;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto = __importStar(require("crypto"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
const DeedLock_1 = require("./DeedLock");
const DeedClaim_1 = require("./DeedClaim");
(0, bitcoinjs_lib_1.initEccLib)(ecc);
const { payments } = bitcoin;
/**
 * Creates a deed-lock for a Bitmap inscription UTXO.
 *
 * @param inscriptionUtxo - The UTXO containing the Bitmap inscription
 * @param recipientPubkey - 32-byte x-only pubkey of the recipient
 * @param timeoutBlocks - CSV timelock for owner recovery
 * @param preimage - Optional preimage; if omitted, one is generated
 * @param network - Bitcoin network
 */
function createBitmapDeed(inscriptionUtxo, recipientPubkey, timeoutBlocks, preimage, network = bitcoin.networks.bitcoin) {
    const secret = preimage ?? crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(secret).digest();
    const { claimScript, recoveryScript, taprootTree } = (0, DeedLock_1.buildDeedLockScript)(paymentHash, recipientPubkey, inscriptionUtxo.ownerPubkey, timeoutBlocks);
    const NUMS_POINT = Buffer.from('0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0', 'hex').subarray(1);
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
        blockHeight: inscriptionUtxo.blockHeight,
        preimage: secret,
    };
}
/**
 * Creates the deed-lock transaction for a Bitmap inscription.
 *
 * Important: Bitmap UTXOs must preserve ordinal position. The inscription sat
 * must remain at the first output position to avoid accidental burns.
 *
 * @param inscriptionUtxo - Source UTXO with the Bitmap
 * @param deedResult - Result from createBitmapDeed
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
function createBitmapDeedTransaction(inscriptionUtxo, deedResult, feeRate = 2, network = bitcoin.networks.bitcoin) {
    // Delegate to the generic deed-lock transaction builder.
    // The Rune/Bitmap UTXO is the first output, preserving ordinal sat position.
    return (0, DeedLock_1.createDeedLockTransaction)(inscriptionUtxo, deedResult, feeRate, network);
}
/**
 * Claims a deed-locked Bitmap inscription using the Lightning preimage.
 *
 * @param deedUtxo - The deed-locked UTXO info
 * @param preimage - 32-byte Lightning payment preimage
 * @param recipientPrivkey - Recipient's private key
 * @param destinationAddress - Where to send the Bitmap inscription
 * @param feeRate - Fee rate in sat/vbyte
 * @param network - Bitcoin network
 */
function claimBitmapDeed(deedUtxo, preimage, recipientPrivkey, destinationAddress, feeRate = 2, network = bitcoin.networks.bitcoin) {
    return (0, DeedClaim_1.createClaimTransaction)(deedUtxo, preimage, recipientPrivkey, destinationAddress, feeRate, network);
}
/**
 * Validates that a Bitmap deed can be claimed with the given preimage.
 */
function validateBitmapClaim(deedUtxo, preimage) {
    return (0, DeedClaim_1.validateClaim)(deedUtxo, preimage);
}
//# sourceMappingURL=BitmapDeed.js.map
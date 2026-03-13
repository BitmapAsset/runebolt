"use strict";
/**
 * DeedNotifier — Delivers the preimage P to the recipient.
 *
 * Primary: OP_RETURN on Bitcoin (no Lightning required).
 * Secondary: Lightning payment (if receiver has a Lightning node).
 *
 * The notification tx contains a dust output to the recipient (so they see
 * an incoming tx in their wallet) plus an OP_RETURN with the preimage.
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
exports.encodeNotification = encodeNotification;
exports.decodeNotification = decodeNotification;
exports.createNotificationTx = createNotificationTx;
exports.broadcastNotification = broadcastNotification;
exports.deliverViaLightning = deliverViaLightning;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto = __importStar(require("crypto"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
(0, bitcoinjs_lib_1.initEccLib)(ecc);
const { Psbt, script, payments } = bitcoin;
/** Protocol magic bytes for OP_RETURN identification */
const RUNEBOLT_MAGIC = Buffer.from('RUNEBOLT');
/** Maximum OP_RETURN data size (80 bytes standard relay policy) */
const MAX_OP_RETURN_SIZE = 80;
/**
 * Encodes notification data as OP_RETURN payload.
 *
 * Format (80 bytes max):
 *   [RUNEBOLT (8)] [preimage (32)] [paymentHash (32)] [deedLockTxid (8 bytes truncated)]
 *   Total: 8 + 32 + 32 + 8 = 80 bytes
 *
 * @param preimage - 32-byte preimage P
 * @param paymentHash - 32-byte hash H = SHA256(P)
 * @param deedLockTxid - Deed-lock transaction ID (hex string, truncated to 8 bytes)
 */
function encodeNotification(preimage, paymentHash, deedLockTxid) {
    if (preimage.length !== 32)
        throw new Error('Preimage must be 32 bytes');
    if (paymentHash.length !== 32)
        throw new Error('Payment hash must be 32 bytes');
    // Verify preimage matches hash
    const computedHash = crypto.createHash('sha256').update(preimage).digest();
    if (!computedHash.equals(paymentHash)) {
        throw new Error('Preimage does not match payment hash');
    }
    // Truncate txid to 8 bytes (first 16 hex chars)
    const txidBytes = Buffer.from(deedLockTxid, 'hex').subarray(0, 8);
    const data = Buffer.concat([RUNEBOLT_MAGIC, preimage, paymentHash, txidBytes]);
    if (data.length > MAX_OP_RETURN_SIZE) {
        throw new Error(`OP_RETURN data exceeds ${MAX_OP_RETURN_SIZE} bytes: ${data.length}`);
    }
    return data;
}
/**
 * Decodes notification data from an OP_RETURN payload.
 *
 * @param opReturnData - Raw OP_RETURN data bytes
 * @returns Decoded notification or null if not a RuneBolt notification
 */
function decodeNotification(opReturnData) {
    // Check magic prefix
    if (opReturnData.length < RUNEBOLT_MAGIC.length + 64)
        return null;
    if (!opReturnData.subarray(0, RUNEBOLT_MAGIC.length).equals(RUNEBOLT_MAGIC))
        return null;
    let offset = RUNEBOLT_MAGIC.length;
    const preimage = opReturnData.subarray(offset, offset + 32);
    offset += 32;
    const paymentHash = opReturnData.subarray(offset, offset + 32);
    offset += 32;
    // Verify preimage matches hash
    const computedHash = crypto.createHash('sha256').update(preimage).digest();
    if (!computedHash.equals(paymentHash))
        return null;
    // Extract truncated deed-lock txid
    const txidBytes = opReturnData.subarray(offset, offset + 8);
    const deedLockTxid = txidBytes.toString('hex');
    return {
        preimage: Buffer.from(preimage),
        paymentHash: Buffer.from(paymentHash),
        deedLockTxid,
    };
}
/**
 * Creates a notification transaction with dust output + OP_RETURN.
 *
 * The tx sends a dust output (546 sats) to the recipient so they detect
 * an incoming transaction, plus an OP_RETURN carrying the preimage P.
 *
 * @param recipientAddress - Recipient's Bitcoin address (any type)
 * @param preimage - 32-byte preimage P
 * @param deedLockTxid - The deed-lock transaction ID
 * @param fundingUtxo - UTXO to fund the notification tx
 * @param changeAddress - Address for change output
 * @param feeRate - Fee rate in sat/vB
 * @param network - Bitcoin network
 * @returns Unsigned PSBT for the notification transaction
 */
function createNotificationTx(recipientAddress, preimage, deedLockTxid, fundingUtxo, changeAddress, feeRate = 2, network = bitcoin.networks.bitcoin) {
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    const opReturnData = encodeNotification(preimage, paymentHash, deedLockTxid);
    const opReturnScript = script.compile([
        bitcoin.opcodes.OP_RETURN,
        opReturnData,
    ]);
    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: fundingUtxo.txid,
        index: fundingUtxo.vout,
        witnessUtxo: {
            script: fundingUtxo.scriptPubKey,
            value: fundingUtxo.value,
        },
    });
    // Dust output to recipient (546 sats minimum)
    const DUST_AMOUNT = 546;
    psbt.addOutput({
        address: recipientAddress,
        value: DUST_AMOUNT,
    });
    // OP_RETURN output (0 value)
    psbt.addOutput({
        script: opReturnScript,
        value: 0,
    });
    // Estimate fee: ~150 vbytes for 1-in, 3-out (dust + OP_RETURN + change)
    const estimatedFee = Math.ceil(180 * feeRate);
    const changeValue = fundingUtxo.value - DUST_AMOUNT - estimatedFee;
    if (changeValue >= 546) {
        psbt.addOutput({
            address: changeAddress,
            value: changeValue,
        });
    }
    else if (changeValue < 0) {
        throw new Error(`Insufficient funds for notification tx: need ${DUST_AMOUNT + estimatedFee}, have ${fundingUtxo.value}`);
    }
    // If changeValue is between 0 and 545, it's dust — donate to fee
    return psbt;
}
/**
 * Broadcasts a signed notification transaction.
 *
 * @param signedTxHex - Signed transaction hex
 * @param rpc - BitcoinRPC client
 * @returns Transaction ID
 */
async function broadcastNotification(signedTxHex, rpc) {
    return rpc.broadcastTx(signedTxHex);
}
/**
 * Delivers preimage via Lightning payment (secondary method).
 *
 * If the receiver has a Lightning node, pay their invoice to reveal the preimage.
 * The preimage is embedded in the Lightning HTLC settlement.
 *
 * @param lightningClient - Lightning client with payInvoice capability
 * @param invoice - BOLT11 invoice to pay
 * @param preimage - Expected preimage (for verification after payment)
 * @returns The revealed preimage from the Lightning payment
 */
async function deliverViaLightning(lightningClient, invoice, preimage) {
    // Pay the invoice — the preimage will be revealed during HTLC settlement
    const revealedPreimage = await lightningClient.payInvoice(invoice, 1);
    // Verify the revealed preimage matches what we expect
    if (!revealedPreimage.equals(preimage)) {
        throw new Error('Lightning payment revealed unexpected preimage');
    }
    return revealedPreimage;
}
//# sourceMappingURL=DeedNotifier.js.map
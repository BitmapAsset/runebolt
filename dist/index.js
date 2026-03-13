"use strict";
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
exports.createDeedLock = createDeedLock;
const bitcoin = __importStar(require("bitcoinjs-lib"));
/**
 * Create a deed lock for asset transfer
 */
function createDeedLock(params) {
    const { asset, senderPubkey, recipientPubkey, paymentHash, timeoutBlocks } = params;
    // Create asset ID hash
    const assetId = `${asset.type}:${asset.id}:${asset.amount}`;
    const assetHash = bitcoin.crypto.hash160(Buffer.from(assetId));
    // Create redeem script
    const redeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_IF,
        bitcoin.opcodes.OP_HASH160,
        assetHash,
        bitcoin.opcodes.OP_EQUALVERIFY,
        bitcoin.opcodes.OP_HASH160,
        Buffer.from(paymentHash, 'hex'),
        bitcoin.opcodes.OP_EQUALVERIFY,
        Buffer.from(recipientPubkey, 'hex'),
        bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ELSE,
        bitcoin.script.number.encode(timeoutBlocks),
        bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
        bitcoin.opcodes.OP_DROP,
        Buffer.from(senderPubkey, 'hex'),
        bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_ENDIF
    ]);
    // Create P2SH address
    const p2sh = bitcoin.payments.p2sh({
        redeem: { output: redeemScript, network: bitcoin.networks.bitcoin },
        network: bitcoin.networks.bitcoin
    });
    return {
        script: p2sh.output,
        address: p2sh.address,
        redeemScript
    };
}
//# sourceMappingURL=index.js.map
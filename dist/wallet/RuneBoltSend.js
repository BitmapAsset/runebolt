"use strict";
/**
 * RuneBoltSend — Main send orchestrator for the "paste address → send asset → done" flow.
 *
 * Fully automated: generate preimage, create deed-lock, broadcast, notify recipient.
 * The receiver's AutoClaimer + DeedWatcher handles the rest.
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
exports.sendAsset = sendAsset;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const crypto = __importStar(require("crypto"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
const DeedLock_1 = require("../ldp/DeedLock");
const BitcoinRPC_1 = require("./BitcoinRPC");
const TaprootUtils_1 = require("./TaprootUtils");
const DeedNotifier_1 = require("./DeedNotifier");
(0, bitcoinjs_lib_1.initEccLib)(ecc);
/**
 * Sends an asset to a Taproot address using the Lightning Deed Protocol.
 *
 * Fully automated flow:
 * 1. Generate preimage P + hash H
 * 2. Extract recipient pubkey from their Taproot address
 * 3. Create deed-lock PSBT
 * 4. Sign + broadcast deed-lock tx
 * 5. Build notification tx (dust output + OP_RETURN with P)
 * 6. Broadcast notification tx
 * 7. Return SendResult
 *
 * @param params - Send parameters
 * @param rpc - Bitcoin RPC client (defaults to mempool.space)
 * @returns Send result with txids and status
 */
async function sendAsset(params, rpc) {
    const client = rpc || BitcoinRPC_1.BitcoinRPC.mempool();
    // Validate recipient address
    if (!(0, TaprootUtils_1.isValidTaprootAddress)(params.recipientTaprootAddress)) {
        throw new Error(`Invalid Taproot address: ${params.recipientTaprootAddress}`);
    }
    // Determine network from address prefix
    const network = params.recipientTaprootAddress.startsWith('tb1p')
        ? bitcoin.networks.testnet
        : params.recipientTaprootAddress.startsWith('bcrt1p')
            ? bitcoin.networks.regtest
            : bitcoin.networks.bitcoin;
    // Step 1: Generate preimage P and hash H
    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    // Step 2: Extract recipient pubkey from Taproot address
    const recipientPubkey = (0, TaprootUtils_1.extractInternalKey)(params.recipientTaprootAddress);
    // Step 3: Find the asset UTXO and create deed-lock
    const assetUtxo = params.senderWallet.utxos[0]; // First UTXO is the asset
    if (!assetUtxo)
        throw new Error('No UTXOs available for deed-lock');
    const senderPrivkey = params.senderWallet.privateKey;
    const senderPubkeyFull = Buffer.from(ecc.pointFromScalar(senderPrivkey));
    const senderXOnlyPubkey = senderPubkeyFull.subarray(1, 33); // x-only (drop prefix byte)
    const deedLockUtxo = {
        txid: assetUtxo.txid,
        vout: assetUtxo.vout,
        value: assetUtxo.value,
        scriptPubKey: assetUtxo.scriptPubKey,
        ownerPubkey: senderXOnlyPubkey,
        runeId: params.asset.type === 'rune' ? params.asset.id : undefined,
        runeAmount: params.asset.type === 'rune' ? params.asset.amount : undefined,
    };
    const timeoutBlocks = 144; // ~1 day recovery timeout
    const deedLock = (0, DeedLock_1.createDeedLock)(deedLockUtxo, recipientPubkey, timeoutBlocks, preimage, network);
    // Get fee rate
    const feeRate = params.feeRate || (await client.estimateFee(6));
    // Step 4: Build deed-lock transaction PSBT
    const deedLockPsbt = (0, DeedLock_1.createDeedLockTransaction)(deedLockUtxo, deedLock, feeRate, network);
    // Sign the deed-lock PSBT
    const keypair = {
        publicKey: senderPubkeyFull,
        privateKey: senderPrivkey,
    };
    deedLockPsbt.signInput(0, {
        publicKey: keypair.publicKey,
        sign: (hash) => Buffer.from(ecc.sign(hash, keypair.privateKey)),
    });
    deedLockPsbt.finalizeAllInputs();
    // Broadcast deed-lock tx
    const deedLockTx = deedLockPsbt.extractTransaction();
    const deedLockTxid = await client.broadcastTx(deedLockTx.toHex());
    // Step 5: Build notification tx
    // Find a fee-funding UTXO (separate from the asset UTXO)
    const fundingUtxo = params.senderWallet.utxos.length > 1
        ? params.senderWallet.utxos[1]
        : params.senderWallet.utxos[0];
    const notificationFunding = {
        txid: fundingUtxo.txid,
        vout: fundingUtxo.vout,
        value: fundingUtxo.value,
        scriptPubKey: fundingUtxo.scriptPubKey,
    };
    const notificationPsbt = (0, DeedNotifier_1.createNotificationTx)(params.recipientTaprootAddress, preimage, deedLockTxid, notificationFunding, params.senderWallet.address, feeRate, network);
    // Sign notification tx
    notificationPsbt.signInput(0, {
        publicKey: keypair.publicKey,
        sign: (hash) => Buffer.from(ecc.sign(hash, keypair.privateKey)),
    });
    notificationPsbt.finalizeAllInputs();
    // Step 6: Broadcast notification tx
    const notificationTx = notificationPsbt.extractTransaction();
    const notificationTxid = await client.broadcastTx(notificationTx.toHex());
    // Step 7: Return result
    return {
        txid: deedLockTxid,
        notificationTxid,
        preimage,
        paymentHash,
        estimatedClaimTime: params.zeroConf ? 15 : 600, // 15s for 0-conf, ~10min for 1-conf
        status: 'pending',
    };
}
//# sourceMappingURL=RuneBoltSend.js.map
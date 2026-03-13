"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pubkeyToTaprootAddress = exports.isValidTaprootAddress = exports.taprootAddressToXOnlyPubkey = exports.extractInternalKey = exports.BitcoinRPC = exports.AutoClaimer = exports.DeedWatcher = exports.deliverViaLightning = exports.broadcastNotification = exports.createNotificationTx = exports.decodeNotification = exports.encodeNotification = exports.sendAsset = exports.WalletEncryption = exports.SigningEngine = exports.UTXOManager = exports.KeyManager = void 0;
exports.quickSend = quickSend;
var KeyManager_1 = require("./KeyManager");
Object.defineProperty(exports, "KeyManager", { enumerable: true, get: function () { return KeyManager_1.KeyManager; } });
var UTXOManager_1 = require("./UTXOManager");
Object.defineProperty(exports, "UTXOManager", { enumerable: true, get: function () { return UTXOManager_1.UTXOManager; } });
var SigningEngine_1 = require("./SigningEngine");
Object.defineProperty(exports, "SigningEngine", { enumerable: true, get: function () { return SigningEngine_1.SigningEngine; } });
var WalletEncryption_1 = require("./WalletEncryption");
Object.defineProperty(exports, "WalletEncryption", { enumerable: true, get: function () { return WalletEncryption_1.WalletEncryption; } });
// ── Phase 2: Wallet Automation ──
var RuneBoltSend_1 = require("./RuneBoltSend");
Object.defineProperty(exports, "sendAsset", { enumerable: true, get: function () { return RuneBoltSend_1.sendAsset; } });
var DeedNotifier_1 = require("./DeedNotifier");
Object.defineProperty(exports, "encodeNotification", { enumerable: true, get: function () { return DeedNotifier_1.encodeNotification; } });
Object.defineProperty(exports, "decodeNotification", { enumerable: true, get: function () { return DeedNotifier_1.decodeNotification; } });
Object.defineProperty(exports, "createNotificationTx", { enumerable: true, get: function () { return DeedNotifier_1.createNotificationTx; } });
Object.defineProperty(exports, "broadcastNotification", { enumerable: true, get: function () { return DeedNotifier_1.broadcastNotification; } });
Object.defineProperty(exports, "deliverViaLightning", { enumerable: true, get: function () { return DeedNotifier_1.deliverViaLightning; } });
var DeedWatcher_1 = require("./DeedWatcher");
Object.defineProperty(exports, "DeedWatcher", { enumerable: true, get: function () { return DeedWatcher_1.DeedWatcher; } });
var AutoClaimer_1 = require("./AutoClaimer");
Object.defineProperty(exports, "AutoClaimer", { enumerable: true, get: function () { return AutoClaimer_1.AutoClaimer; } });
var BitcoinRPC_1 = require("./BitcoinRPC");
Object.defineProperty(exports, "BitcoinRPC", { enumerable: true, get: function () { return BitcoinRPC_1.BitcoinRPC; } });
var TaprootUtils_1 = require("./TaprootUtils");
Object.defineProperty(exports, "extractInternalKey", { enumerable: true, get: function () { return TaprootUtils_1.extractInternalKey; } });
Object.defineProperty(exports, "taprootAddressToXOnlyPubkey", { enumerable: true, get: function () { return TaprootUtils_1.taprootAddressToXOnlyPubkey; } });
Object.defineProperty(exports, "isValidTaprootAddress", { enumerable: true, get: function () { return TaprootUtils_1.isValidTaprootAddress; } });
Object.defineProperty(exports, "pubkeyToTaprootAddress", { enumerable: true, get: function () { return TaprootUtils_1.pubkeyToTaprootAddress; } });
// ── Convenience ──
const RuneBoltSend_2 = require("./RuneBoltSend");
/**
 * One-liner convenience for sending any asset to a Taproot address.
 *
 * @param recipientAddress - bc1p... Taproot address
 * @param assetId - Rune ID, inscription ID, or block height
 * @param amount - Amount to send
 * @param senderPrivkey - Sender's private key
 * @param senderUtxos - Available UTXOs
 * @param senderAddress - Sender's address for change
 * @returns SendResult with txids and status
 */
async function quickSend(recipientAddress, assetId, amount, senderPrivkey, senderUtxos, senderAddress) {
    return (0, RuneBoltSend_2.sendAsset)({
        recipientTaprootAddress: recipientAddress,
        asset: {
            type: 'rune',
            id: assetId,
            amount,
        },
        senderWallet: {
            privateKey: senderPrivkey,
            utxos: senderUtxos,
            address: senderAddress,
        },
    });
}
//# sourceMappingURL=index.js.map
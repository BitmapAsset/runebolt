"use strict";
/**
 * Lightning Deed Protocol (LDP) — Instant, non-custodial Rune & Bitmap transfers over Lightning.
 *
 * Transfer the cryptographic RIGHT to claim an asset, not the asset itself.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LDPClient = exports.validateTimeoutSafety = exports.calculateSafeTimeouts = exports.verifyAtomicity = exports.createCorrespondingHTLC = exports.validateBitmapClaim = exports.claimBitmapDeed = exports.createBitmapDeedTransaction = exports.createBitmapDeed = exports.decodeLDPInvoice = exports.encodeLDPInvoice = exports.createLDPInvoice = exports.batchClaim = exports.validateClaim = exports.createClaimTransaction = exports.createDeedLockTransaction = exports.buildRecoveryScript = exports.buildClaimScript = exports.buildDeedLockScript = exports.createDeedLock = exports.LDP_VERSION = void 0;
exports.LDP_VERSION = '0.1.0';
var DeedLock_1 = require("./DeedLock");
Object.defineProperty(exports, "createDeedLock", { enumerable: true, get: function () { return DeedLock_1.createDeedLock; } });
Object.defineProperty(exports, "buildDeedLockScript", { enumerable: true, get: function () { return DeedLock_1.buildDeedLockScript; } });
Object.defineProperty(exports, "buildClaimScript", { enumerable: true, get: function () { return DeedLock_1.buildClaimScript; } });
Object.defineProperty(exports, "buildRecoveryScript", { enumerable: true, get: function () { return DeedLock_1.buildRecoveryScript; } });
Object.defineProperty(exports, "createDeedLockTransaction", { enumerable: true, get: function () { return DeedLock_1.createDeedLockTransaction; } });
var DeedClaim_1 = require("./DeedClaim");
Object.defineProperty(exports, "createClaimTransaction", { enumerable: true, get: function () { return DeedClaim_1.createClaimTransaction; } });
Object.defineProperty(exports, "validateClaim", { enumerable: true, get: function () { return DeedClaim_1.validateClaim; } });
Object.defineProperty(exports, "batchClaim", { enumerable: true, get: function () { return DeedClaim_1.batchClaim; } });
var LDPInvoice_1 = require("./LDPInvoice");
Object.defineProperty(exports, "createLDPInvoice", { enumerable: true, get: function () { return LDPInvoice_1.createLDPInvoice; } });
Object.defineProperty(exports, "encodeLDPInvoice", { enumerable: true, get: function () { return LDPInvoice_1.encodeLDPInvoice; } });
Object.defineProperty(exports, "decodeLDPInvoice", { enumerable: true, get: function () { return LDPInvoice_1.decodeLDPInvoice; } });
var BitmapDeed_1 = require("./BitmapDeed");
Object.defineProperty(exports, "createBitmapDeed", { enumerable: true, get: function () { return BitmapDeed_1.createBitmapDeed; } });
Object.defineProperty(exports, "createBitmapDeedTransaction", { enumerable: true, get: function () { return BitmapDeed_1.createBitmapDeedTransaction; } });
Object.defineProperty(exports, "claimBitmapDeed", { enumerable: true, get: function () { return BitmapDeed_1.claimBitmapDeed; } });
Object.defineProperty(exports, "validateBitmapClaim", { enumerable: true, get: function () { return BitmapDeed_1.validateBitmapClaim; } });
var HTLCBridge_1 = require("./HTLCBridge");
Object.defineProperty(exports, "createCorrespondingHTLC", { enumerable: true, get: function () { return HTLCBridge_1.createCorrespondingHTLC; } });
Object.defineProperty(exports, "verifyAtomicity", { enumerable: true, get: function () { return HTLCBridge_1.verifyAtomicity; } });
Object.defineProperty(exports, "calculateSafeTimeouts", { enumerable: true, get: function () { return HTLCBridge_1.calculateSafeTimeouts; } });
Object.defineProperty(exports, "validateTimeoutSafety", { enumerable: true, get: function () { return HTLCBridge_1.validateTimeoutSafety; } });
var LDPClient_1 = require("./LDPClient");
Object.defineProperty(exports, "LDPClient", { enumerable: true, get: function () { return LDPClient_1.LDPClient; } });
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletEvent = exports.OpenChannelSchema = exports.SendAssetSchema = exports.UnwrapRequestSchema = exports.WrapRequestSchema = exports.WrapState = void 0;
const zod_1 = require("zod");
var WrapState;
(function (WrapState) {
    WrapState["PENDING"] = "pending";
    WrapState["RUNE_LOCKED"] = "rune_locked";
    WrapState["ASSET_MINTED"] = "asset_minted";
    WrapState["COMPLETED"] = "completed";
    WrapState["FAILED"] = "failed";
})(WrapState || (exports.WrapState = WrapState = {}));
// ── API Schema Validation ──
exports.WrapRequestSchema = zod_1.z.object({
    runeName: zod_1.z.string().min(1).max(100).regex(/^[A-Z0-9.]+$/, 'Invalid rune name'),
    runeAmount: zod_1.z.string().regex(/^\d+$/, 'Must be a positive integer').max(30),
});
exports.UnwrapRequestSchema = zod_1.z.object({
    assetId: zod_1.z.string().regex(/^[a-f0-9]{64}$/, 'Invalid asset ID'),
    amount: zod_1.z.string().regex(/^\d+$/, 'Must be a positive integer').max(30),
    destinationAddress: zod_1.z.string().min(1).max(200),
});
exports.SendAssetSchema = zod_1.z.object({
    assetId: zod_1.z.string().regex(/^[a-f0-9]{64}$/, 'Invalid asset ID'),
    amount: zod_1.z.string().regex(/^\d+$/, 'Must be a positive integer').max(30),
    invoice: zod_1.z.string().startsWith('ln').max(1500),
});
exports.OpenChannelSchema = zod_1.z.object({
    peerPubkey: zod_1.z.string().regex(/^[a-f0-9]{66}$/, 'Invalid pubkey'),
    assetId: zod_1.z.string().regex(/^[a-f0-9]{64}$/, 'Invalid asset ID'),
    localAmount: zod_1.z.string().regex(/^\d+$/).max(30),
});
// ── Event Types ──
var WalletEvent;
(function (WalletEvent) {
    WalletEvent["WRAP_STARTED"] = "wrap:started";
    WalletEvent["WRAP_RUNE_LOCKED"] = "wrap:rune_locked";
    WalletEvent["WRAP_ASSET_MINTED"] = "wrap:asset_minted";
    WalletEvent["WRAP_COMPLETED"] = "wrap:completed";
    WalletEvent["UNWRAP_STARTED"] = "unwrap:started";
    WalletEvent["UNWRAP_COMPLETED"] = "unwrap:completed";
    WalletEvent["CHANNEL_OPENED"] = "channel:opened";
    WalletEvent["CHANNEL_CLOSED"] = "channel:closed";
    WalletEvent["PAYMENT_SENT"] = "payment:sent";
    WalletEvent["PAYMENT_RECEIVED"] = "payment:received";
    WalletEvent["BALANCE_UPDATED"] = "balance:updated";
})(WalletEvent || (exports.WalletEvent = WalletEvent = {}));
//# sourceMappingURL=index.js.map
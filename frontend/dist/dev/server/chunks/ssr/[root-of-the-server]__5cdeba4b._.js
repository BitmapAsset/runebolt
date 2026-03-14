module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "copyToClipboard",
    ()=>copyToClipboard,
    "formatDate",
    ()=>formatDate,
    "formatSats",
    ()=>formatSats,
    "sleep",
    ()=>sleep,
    "truncateAddress",
    ()=>truncateAddress
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
function formatSats(sats) {
    if (sats >= 100000000) {
        return `${(sats / 100000000).toFixed(8)} BTC`;
    } else if (sats >= 1000) {
        return `${sats.toLocaleString()} sats`;
    }
    return `${sats} sats`;
}
function truncateAddress(address, start = 6, end = 4) {
    if (!address) return "";
    if (address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}
function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}
function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}
function sleep(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildClaimTransaction",
    ()=>buildClaimTransaction,
    "buildLockTransaction",
    ()=>buildLockTransaction,
    "buildRefundTransaction",
    ()=>buildRefundTransaction,
    "calculateFee",
    ()=>calculateFee,
    "checkInvoiceStatus",
    ()=>checkInvoiceStatus,
    "checkTransfer",
    ()=>checkTransfer,
    "clearAddressCache",
    ()=>clearAddressCache,
    "createHTLC",
    ()=>createHTLC,
    "createInvoice",
    ()=>createInvoice,
    "decodeInvoice",
    ()=>decodeInvoice,
    "getAssetBalances",
    ()=>getAssetBalances,
    "getHealth",
    ()=>getHealth,
    "getInventory",
    ()=>getInventory,
    "getNodeInfo",
    ()=>getNodeInfo,
    "getStatus",
    ()=>getStatus,
    "getSwapStatus",
    ()=>getSwapStatus,
    "initiateTransfer",
    ()=>initiateTransfer,
    "listAssets",
    ()=>listAssets,
    "listTransfers",
    ()=>listTransfers,
    "payInvoice",
    ()=>payInvoice,
    "pollInvoiceStatus",
    ()=>pollInvoiceStatus,
    "pollSwapStatus",
    ()=>pollSwapStatus,
    "updateSwapStatus",
    ()=>updateSwapStatus,
    "verifyAssetOwnership",
    ()=>verifyAssetOwnership,
    "withRetry",
    ()=>withRetry
]);
/**
 * RuneBolt API Client
 * Frontend API integration for RuneBolt backend
 */ const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3141") || 'http://64.23.226.113:3141';
// Error handling
class APIError extends Error {
    status;
    constructor(status, message){
        super(message), this.status = status;
        this.name = 'APIError';
    }
}
async function fetchAPI(endpoint, options) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                error: 'Unknown error'
            }));
        throw new APIError(response.status, error.error || `HTTP ${response.status}`);
    }
    return response.json();
}
async function getHealth() {
    return fetchAPI('/api/health');
}
async function getStatus() {
    return fetchAPI('/api/status');
}
async function getNodeInfo() {
    return fetchAPI('/api/lightning/info');
}
async function getAssetBalances(address, network = 'testnet') {
    return fetchAPI(`/api/runes/${address}/balances?network=${network}`);
}
async function verifyAssetOwnership(address, assetType, assetId, amount = 1, network = 'testnet') {
    return fetchAPI(`/api/runes/${address}/verify?assetType=${assetType}&assetId=${assetId}&amount=${amount}&network=${network}`);
}
async function clearAddressCache(address) {
    return fetchAPI(`/api/runes/${address}/clear-cache`, {
        method: 'POST'
    });
}
async function createInvoice(amount, memo, expiry) {
    return fetchAPI('/api/lightning/invoice', {
        method: 'POST',
        body: JSON.stringify({
            amount,
            memo,
            expiry
        })
    });
}
async function payInvoice(paymentRequest, feeLimit) {
    return fetchAPI('/api/lightning/pay', {
        method: 'POST',
        body: JSON.stringify({
            paymentRequest,
            feeLimit
        })
    });
}
async function decodeInvoice(paymentRequest) {
    return fetchAPI(`/api/lightning/decode/${encodeURIComponent(paymentRequest)}`);
}
async function checkInvoiceStatus(paymentHash) {
    return fetchAPI(`/api/lightning/invoice/${paymentHash}`);
}
async function createHTLC(params) {
    return fetchAPI('/api/bridge/htlc/create', {
        method: 'POST',
        body: JSON.stringify(params)
    });
}
async function buildLockTransaction(params) {
    return fetchAPI('/api/bridge/build-lock-tx', {
        method: 'POST',
        body: JSON.stringify(params)
    });
}
async function buildClaimTransaction(params) {
    return fetchAPI('/api/bridge/build-claim-tx', {
        method: 'POST',
        body: JSON.stringify(params)
    });
}
async function buildRefundTransaction(params) {
    return fetchAPI('/api/bridge/build-refund-tx', {
        method: 'POST',
        body: JSON.stringify(params)
    });
}
async function getSwapStatus(swapId) {
    return fetchAPI(`/api/bridge/swap/${swapId}`);
}
async function updateSwapStatus(swapId, status, txid) {
    return fetchAPI(`/api/bridge/swap/${swapId}/status`, {
        method: 'POST',
        body: JSON.stringify({
            status,
            txid
        })
    });
}
async function initiateTransfer(params) {
    return fetchAPI('/api/bridge/transfer', {
        method: 'POST',
        body: JSON.stringify(params)
    });
}
async function checkTransfer(transferId) {
    return fetchAPI(`/api/bridge/transfer/${transferId}`);
}
async function calculateFee(assetId, amount) {
    return fetchAPI('/api/bridge/fee', {
        method: 'POST',
        body: JSON.stringify({
            assetId,
            amount
        })
    });
}
async function listAssets(type) {
    const query = type ? `?type=${type}` : '';
    return fetchAPI(`/api/bridge/assets${query}`);
}
async function listTransfers(status) {
    const query = status ? `?status=${status}` : '';
    return fetchAPI(`/api/bridge/transfers${query}`);
}
async function getInventory() {
    return fetchAPI('/api/bridge/inventory');
}
async function pollInvoiceStatus(paymentHash, onSettled, onError, intervalMs = 5000, timeoutMs = 300000 // 5 minutes
) {
    const startTime = Date.now();
    let isActive = true;
    const check = async ()=>{
        if (!isActive) return;
        try {
            const status = await checkInvoiceStatus(paymentHash);
            if (status.settled) {
                onSettled(status);
                return;
            }
            if (Date.now() - startTime > timeoutMs) {
                onError?.(new Error('Invoice polling timeout'));
                return;
            }
            setTimeout(check, intervalMs);
        } catch (error) {
            onError?.(error);
        }
    };
    check();
    // Return cleanup function
    return ()=>{
        isActive = false;
    };
}
async function pollSwapStatus(swapId, targetStatus, onReached, onError, intervalMs = 5000, timeoutMs = 600000 // 10 minutes
) {
    const startTime = Date.now();
    let isActive = true;
    const check = async ()=>{
        if (!isActive) return;
        try {
            const status = await getSwapStatus(swapId);
            if (targetStatus.includes(status.status)) {
                onReached(status);
                return;
            }
            if (Date.now() - startTime > timeoutMs) {
                onError?.(new Error('Swap polling timeout'));
                return;
            }
            setTimeout(check, intervalMs);
        } catch (error) {
            onError?.(error);
        }
    };
    check();
    return ()=>{
        isActive = false;
    };
}
async function withRetry(fn, retries = 3, delayMs = 1000) {
    let lastError;
    for(let i = 0; i < retries; i++){
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < retries - 1) {
                await new Promise((resolve)=>setTimeout(resolve, delayMs * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssetCard",
    ()=>AssetCard,
    "AssetDashboard",
    ()=>AssetDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/wallet.js [app-ssr] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/copy.js [app-ssr] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/zap.js [app-ssr] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-ssr] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const ASSET_EMOJIS = {
    DOG: "🐕",
    "DOG•GO•TO•THE•MOON": "🐕",
    UNCOMMON: "💎",
    "UNCOMMON•GOODS": "💎",
    PIZZA: "🍕",
    MEME: "🐸",
    BITCOIN: "₿",
    BTC: "₿"
};
function getAssetEmoji(name, symbol) {
    if (symbol && ASSET_EMOJIS[symbol]) return ASSET_EMOJIS[symbol];
    if (ASSET_EMOJIS[name]) return ASSET_EMOJIS[name];
    return "💰";
}
function AssetCard({ asset, onSelect, selected }) {
    const typeColors = {
        rune: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        ordinal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        bitmap: "bg-green-500/20 text-green-400 border-green-500/30",
        brc20: "bg-orange-500/20 text-orange-400 border-orange-500/30"
    };
    const image = asset.image || getAssetEmoji(asset.name, asset.symbol);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
        whileHover: {
            scale: 1.02,
            y: -2
        },
        whileTap: {
            scale: 0.98
        },
        onClick: onSelect,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-300", "bg-gradient-to-br from-white/5 to-transparent", selected ? "border-[#F7931A] shadow-[0_0_30px_rgba(247,147,26,0.3)]" : "border-white/10 hover:border-white/20"),
        children: [
            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                layoutId: "selectedIndicator",
                className: "absolute -top-2 -right-2 w-6 h-6 bg-[#F7931A] rounded-full flex items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                    className: "w-4 h-4 text-black"
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 70,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 69,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-4xl",
                        children: image
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 74,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("text-xs px-2 py-0.5 rounded-full border capitalize", typeColors[asset.type]),
                                children: asset.type
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                className: "font-semibold truncate mt-2",
                                children: asset.name
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this),
                            asset.symbol && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-500",
                                children: asset.symbol
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 80,
                                columnNumber: 28
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xl font-bold mt-2 bitcoin-gradient",
                                children: asset.type === "bitmap" || asset.type === "ordinal" ? `${asset.amount} item${asset.amount > 1 ? 's' : ''}` : asset.decimals ? `${asset.amount.toFixed(asset.decimals)}` : (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatSats"])(Math.floor(asset.amount * 100000000))
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 73,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
        lineNumber: 58,
        columnNumber: 5
    }, this);
}
function LoadingState() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card text-center py-16",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "w-10 h-10 text-[#F7931A] mx-auto mb-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 95,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-400",
                children: "Loading your assets..."
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
        lineNumber: 94,
        columnNumber: 5
    }, this);
}
function ErrorState({ message, onRetry }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card text-center py-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                className: "w-10 h-10 text-red-400 mx-auto mb-4"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-red-400 mb-2",
                children: "Failed to load assets"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-500 text-sm mb-4",
                children: message
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: onRetry,
                className: "btn-secondary flex items-center gap-2 mx-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                        className: "w-4 h-4"
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this),
                    "Try Again"
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
        lineNumber: 103,
        columnNumber: 5
    }, this);
}
function EmptyState() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "card text-center py-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-4xl mb-4",
                children: "💼"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-400",
                children: "No assets found in this wallet"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-gray-600 text-sm mt-2",
                children: "Assets you own (Runes, Ordinals, Bitmap) will appear here"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 120,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
        lineNumber: 117,
        columnNumber: 5
    }, this);
}
function AssetDashboard({ connected, address, onConnect, network = 'testnet' }) {
    const [selectedAsset, setSelectedAsset] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("assets");
    const [assets, setAssets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [lastUpdated, setLastUpdated] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const fetchBalances = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!connected || !address) return;
        setLoading(true);
        setError(null);
        try {
            const balance = await (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAssetBalances"])(address, network);
            const convertedAssets = [
                ...balance.runes.map((rune)=>({
                        id: rune.id,
                        type: "rune",
                        name: rune.name,
                        symbol: rune.symbol,
                        amount: rune.amount,
                        image: getAssetEmoji(rune.name, rune.symbol),
                        decimals: rune.decimals
                    })),
                ...balance.ordinals.map((ord)=>({
                        id: ord.id,
                        type: "ordinal",
                        name: `Inscription #${ord.inscriptionNumber}`,
                        inscriptionId: ord.id,
                        amount: 1,
                        image: "🎨"
                    })),
                ...balance.bitmaps.map((bmp)=>({
                        id: bmp.inscriptionId,
                        type: "bitmap",
                        name: `Bitmap #${bmp.blockNumber}`,
                        blockNumber: bmp.blockNumber,
                        amount: 1,
                        image: "🏙️"
                    }))
            ];
            setAssets(convertedAssets);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message || 'Failed to load assets');
        } finally{
            setLoading(false);
        }
    }, [
        connected,
        address,
        network
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (connected && address) fetchBalances();
    }, [
        connected,
        address,
        fetchBalances
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!connected) return;
        const interval = setInterval(fetchBalances, 60000);
        return ()=>clearInterval(interval);
    }, [
        connected,
        fetchBalances
    ]);
    const handleRefresh = async ()=>{
        if (address) await (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearAddressCache"])(address);
        await fetchBalances();
    };
    if (!connected) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "card text-center py-16",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-20 h-20 rounded-full bg-[#F7931A]/10 flex items-center justify-center mx-auto mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                        className: "w-10 h-10 text-[#F7931A]"
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 181,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-2xl font-bold mb-2",
                    children: "Connect Your Wallet"
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 184,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-gray-400 mb-6 max-w-md mx-auto",
                    children: "Connect your Bitcoin wallet to view your Runes, Ordinals, and Bitmap assets"
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 185,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onConnect,
                    className: "btn-primary",
                    children: "Connect Wallet"
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 186,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
            lineNumber: 180,
            columnNumber: 7
        }, this);
    }
    if (loading && assets.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "card flex flex-col sm:flex-row items-center justify-between gap-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                    className: "w-6 h-6 text-[#F7931A]"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                    lineNumber: 197,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 196,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-400",
                                        children: "Connected Wallet"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 200,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-mono text-lg",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateAddress"])(address)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 201,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 199,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 195,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 194,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LoadingState, {}, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 205,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
            lineNumber: 193,
            columnNumber: 7
        }, this);
    }
    if (error && assets.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "card flex flex-col sm:flex-row items-center justify-between gap-4",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                    className: "w-6 h-6 text-[#F7931A]"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                    lineNumber: 216,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 215,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-400",
                                        children: "Connected Wallet"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 219,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-mono text-lg",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateAddress"])(address)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 220,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 218,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 214,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 213,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ErrorState, {
                    message: error,
                    onRetry: fetchBalances
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 224,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
            lineNumber: 212,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "card flex flex-col sm:flex-row items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                    className: "w-6 h-6 text-[#F7931A]"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                    lineNumber: 234,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-400",
                                        children: "Connected Wallet"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 237,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "font-mono text-lg",
                                        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateAddress"])(address)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 238,
                                        columnNumber: 13
                                    }, this),
                                    network === 'testnet' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                                        children: "Testnet"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                        lineNumber: 240,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 236,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 232,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>navigator.clipboard.writeText(address),
                                className: "btn-secondary",
                                title: "Copy address",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                    lineNumber: 246,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 245,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleRefresh,
                                disabled: loading,
                                className: "btn-secondary",
                                title: "Refresh balances",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-4 h-4", loading && "animate-spin")
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                    lineNumber: 249,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 244,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            lastUpdated && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-gray-500 text-right",
                children: [
                    "Last updated: ",
                    lastUpdated.toLocaleTimeString()
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 254,
                columnNumber: 23
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-2 p-1 rounded-xl bg-white/5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab("assets"),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex-1 py-2 px-4 rounded-lg font-medium transition-all", activeTab === "assets" ? "bg-[#F7931A] text-black" : "text-gray-400 hover:text-white"),
                        children: [
                            "My Assets (",
                            assets.length,
                            ")"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 257,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab("history"),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex-1 py-2 px-4 rounded-lg font-medium transition-all", activeTab === "history" ? "bg-[#F7931A] text-black" : "text-gray-400 hover:text-white"),
                        children: "History"
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 260,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 256,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                mode: "wait",
                children: activeTab === "assets" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        y: 10
                    },
                    animate: {
                        opacity: 1,
                        y: 0
                    },
                    exit: {
                        opacity: 0,
                        y: -10
                    },
                    className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
                    children: assets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(EmptyState, {}, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 268,
                        columnNumber: 36
                    }, this) : assets.map((asset)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AssetCard, {
                            asset: asset,
                            selected: selectedAsset?.id === asset.id,
                            onSelect: ()=>setSelectedAsset(asset)
                        }, asset.id, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                            lineNumber: 269,
                            columnNumber: 15
                        }, this))
                }, "assets", false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 267,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        y: 10
                    },
                    animate: {
                        opacity: 1,
                        y: 0
                    },
                    exit: {
                        opacity: 0,
                        y: -10
                    },
                    className: "space-y-3",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "card text-center py-12",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-gray-400",
                            children: "Transaction history coming soon"
                        }, void 0, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                            lineNumber: 275,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 274,
                        columnNumber: 13
                    }, this)
                }, "history", false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                    lineNumber: 273,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 265,
                columnNumber: 7
            }, this),
            selectedAsset && activeTab === "assets" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                initial: {
                    opacity: 0,
                    y: 20
                },
                animate: {
                    opacity: 1,
                    y: 0
                },
                className: "btn-primary w-full py-4 text-lg flex items-center justify-center gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                        className: "w-5 h-5"
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                        lineNumber: 283,
                        columnNumber: 11
                    }, this),
                    "Transfer ",
                    selectedAsset.name
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
                lineNumber: 282,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx",
        lineNumber: 230,
        columnNumber: 5
    }, this);
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/lib/wallets.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Wallet Connection Library — Unisat & Xverse Integration
 * Handles browser wallet detection, connection, and transaction signing
 */ // Type declarations for window object
__turbopack_context__.s([
    "WALLET_REGISTRY",
    ()=>WALLET_REGISTRY,
    "broadcastPsbt",
    ()=>broadcastPsbt,
    "connectWallet",
    ()=>connectWallet,
    "disconnectWallet",
    ()=>disconnectWallet,
    "getFirstInstalledWallet",
    ()=>getFirstInstalledWallet,
    "getWalletBalances",
    ()=>getWalletBalances,
    "getWalletOrdinals",
    ()=>getWalletOrdinals,
    "getWalletRunes",
    ()=>getWalletRunes,
    "getWallets",
    ()=>getWallets,
    "isWalletInstalled",
    ()=>isWalletInstalled,
    "onAccountsChanged",
    ()=>onAccountsChanged,
    "onNetworkChanged",
    ()=>onNetworkChanged,
    "sendBitcoin",
    ()=>sendBitcoin,
    "signPsbt",
    ()=>signPsbt
]);
const WALLET_REGISTRY = [
    {
        id: 'unisat',
        name: 'UniSat',
        icon: '🔶',
        description: 'Most popular Bitcoin wallet for Runes & Ordinals',
        installed: false,
        website: 'https://unisat.io'
    },
    {
        id: 'xverse',
        name: 'Xverse',
        icon: '🌐',
        description: 'Mobile & desktop Bitcoin wallet with Bitcoin L2 support',
        installed: false,
        website: 'https://xverse.app'
    },
    {
        id: 'leather',
        name: 'Leather',
        icon: '🦊',
        description: 'Stacks & Bitcoin wallet (formerly Hiro)',
        installed: false,
        website: 'https://leather.io'
    },
    {
        id: 'okx',
        name: 'OKX Wallet',
        icon: '🔵',
        description: 'Multi-chain exchange wallet with Bitcoin support',
        installed: false,
        website: 'https://www.okx.com/web3'
    }
];
function isWalletInstalled(type) {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
}
function getWallets() {
    return WALLET_REGISTRY.map((wallet)=>({
            ...wallet,
            installed: isWalletInstalled(wallet.id)
        }));
}
function getFirstInstalledWallet() {
    const wallets = getWallets();
    return wallets.find((w)=>w.installed) || null;
}
// Connect to UniSat wallet
async function connectUniSat() {
    if (!window.unisat) {
        throw new Error('UniSat wallet not installed');
    }
    try {
        // Request accounts
        const accounts = await window.unisat.requestAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in UniSat');
        }
        const address = accounts[0];
        const publicKey = await window.unisat.getPublicKey();
        const network = await window.unisat.getNetwork();
        // Convert network format
        const networkType = network === 'livenet' ? 'mainnet' : 'testnet';
        return {
            wallet: 'unisat',
            account: {
                address,
                publicKey,
                compressedPublicKey: publicKey
            },
            network: networkType
        };
    } catch (error) {
        throw new Error(`UniSat connection failed: ${error.message}`);
    }
}
// Connect to Xverse wallet
async function connectXverse() {
    if (!window.xverse) {
        throw new Error('Xverse wallet not installed');
    }
    try {
        const result = await window.xverse.connect();
        if (!result.addresses || result.addresses.length === 0) {
            throw new Error('No addresses found in Xverse');
        }
        // Get the first taproot or native segwit address
        const btcAddress = result.addresses.find((a)=>a.addressType === 'p2tr' || a.addressType === 'p2wpkh') || result.addresses[0];
        return {
            wallet: 'xverse',
            account: {
                address: btcAddress.address,
                publicKey: btcAddress.publicKey,
                compressedPublicKey: btcAddress.publicKey
            },
            network: 'mainnet'
        };
    } catch (error) {
        throw new Error(`Xverse connection failed: ${error.message}`);
    }
}
// Connect to Leather wallet
async function connectLeather() {
    if (!window.leather) {
        throw new Error('Leather wallet not installed');
    }
    try {
        const result = await window.leather.authenticate();
        // Leather returns different format, adapt as needed
        const address = result.addresses?.[0]?.address || '';
        const publicKey = result.addresses?.[0]?.publicKey || '';
        return {
            wallet: 'leather',
            account: {
                address,
                publicKey,
                compressedPublicKey: publicKey
            },
            network: 'mainnet'
        };
    } catch (error) {
        throw new Error(`Leather connection failed: ${error.message}`);
    }
}
// Connect to OKX wallet
async function connectOKX() {
    if (!window.okxwallet?.bitcoin) {
        throw new Error('OKX wallet not installed');
    }
    try {
        const result = await window.okxwallet.bitcoin.connect();
        return {
            wallet: 'okx',
            account: {
                address: result.address,
                publicKey: result.publicKey,
                compressedPublicKey: result.publicKey
            },
            network: 'mainnet'
        };
    } catch (error) {
        throw new Error(`OKX connection failed: ${error.message}`);
    }
}
async function connectWallet(type) {
    switch(type){
        case 'unisat':
            return connectUniSat();
        case 'xverse':
            return connectXverse();
        case 'leather':
            return connectLeather();
        case 'okx':
            return connectOKX();
        default:
            throw new Error(`Unknown wallet type: ${type}`);
    }
}
function disconnectWallet(type, callback) {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
async function signPsbt(walletType, psbtBase64, options) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                const result = await window.unisat.signPsbt(psbtBase64, {
                    autoFinalized: options?.autoFinalized ?? true
                });
                return result;
            }
        case 'xverse':
            {
                if (!window.xverse) throw new Error('Xverse not installed');
                const result = await window.xverse.signPsbt({
                    psbt: psbtBase64,
                    signInputs: [
                        0
                    ]
                });
                return result.psbt;
            }
        case 'okx':
            {
                if (!window.okxwallet?.bitcoin) throw new Error('OKX not installed');
                return await window.okxwallet.bitcoin.signPsbt(psbtBase64);
            }
        default:
            throw new Error(`PSBT signing not supported for ${walletType}`);
    }
}
async function broadcastPsbt(walletType, psbtHex) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                return await window.unisat.pushPsbt(psbtHex);
            }
        default:
            throw new Error(`Broadcast not supported for ${walletType}`);
    }
}
async function sendBitcoin(walletType, toAddress, amountSats, feeRate) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                return await window.unisat.sendBitcoin(toAddress, amountSats, {
                    feeRate
                });
            }
        case 'xverse':
            {
                if (!window.xverse) throw new Error('Xverse not installed');
                // Xverse requires connected address
                const connected = await connectXverse();
                return await window.xverse.sendBtc({
                    recipients: [
                        {
                            address: toAddress,
                            amount: amountSats
                        }
                    ],
                    senderAddress: connected.account.address
                });
            }
        case 'okx':
            {
                if (!window.okxwallet?.bitcoin) throw new Error('OKX not installed');
                return await window.okxwallet.bitcoin.sendBitcoin(toAddress, amountSats);
            }
        default:
            throw new Error(`Send not supported for ${walletType}`);
    }
}
async function getWalletBalances(walletType) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                return await window.unisat.getBalance();
            }
        default:
            throw new Error(`Balance check not supported for ${walletType}`);
    }
}
async function getWalletRunes(walletType) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                const result = await window.unisat.getRunes(0, 100);
                return result.detail || [];
            }
        default:
            return [];
    }
}
async function getWalletOrdinals(walletType) {
    switch(walletType){
        case 'unisat':
            {
                if (!window.unisat) throw new Error('UniSat not installed');
                const result = await window.unisat.getInscriptions(0, 100);
                return result.list || [];
            }
        default:
            return [];
    }
}
function onAccountsChanged(walletType, callback) {
    if ("TURBOPACK compile-time truthy", 1) return ()=>{};
    //TURBOPACK unreachable
    ;
}
function onNetworkChanged(walletType, callback) {
    if ("TURBOPACK compile-time truthy", 1) return ()=>{};
    //TURBOPACK unreachable
    ;
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConnectLightning",
    ()=>ConnectLightning,
    "LightningEffects",
    ()=>LightningEffects,
    "SoundWaveVisualizer",
    ()=>SoundWaveVisualizer,
    "SuccessLightning",
    ()=>SuccessLightning,
    "TransferLightning",
    ()=>TransferLightning
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const LIGHTNING_COLORS = {
    billy: "#8B5CF6",
    dog: "#DC2626",
    bitmap: "#F7931A",
    pepe: "#10B981",
    default: "#F7931A"
};
function LightningEffects({ trigger, color = "#F7931A", autoTrigger = false, intensity = "medium" }) {
    const [bolts, setBolts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [flash, setFlash] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const createLightning = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((x, y, specificColor)=>{
        const id = Math.random().toString(36).substr(2, 9);
        const bolt = {
            id,
            x: x ?? Math.random() * 100,
            y: y ?? Math.random() * 50,
            color: specificColor ?? color,
            scale: intensity === "high" ? 1.5 : intensity === "medium" ? 1 : 0.7,
            duration: 0.4 + Math.random() * 0.3
        };
        setBolts((prev)=>[
                ...prev,
                bolt
            ]);
        setFlash(true);
        setTimeout(()=>setFlash(false), 100);
        setTimeout(()=>{
            setBolts((prev)=>prev.filter((b)=>b.id !== id));
        }, bolt.duration * 1000 + 200);
    }, [
        color,
        intensity
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (trigger) {
            createLightning(50, 30, LIGHTNING_COLORS[trigger] || color);
        }
    }, [
        trigger,
        createLightning,
        color
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!autoTrigger) return;
        const interval = setInterval(()=>{
            if (Math.random() > 0.7) {
                createLightning();
            }
        }, 3000 + Math.random() * 4000);
        return ()=>clearInterval(interval);
    }, [
        autoTrigger,
        createLightning
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: flash && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0.3
                    },
                    animate: {
                        opacity: 0
                    },
                    exit: {
                        opacity: 0
                    },
                    transition: {
                        duration: 0.1
                    },
                    className: "fixed inset-0 pointer-events-none z-50",
                    style: {
                        backgroundColor: `${color}20`
                    }
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 82,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 pointer-events-none z-40 overflow-hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                    children: bolts.map((bolt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LightningSVG, {
                            bolt: bolt
                        }, bolt.id, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                            lineNumber: 97,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 95,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
function LightningSVG({ bolt }) {
    // Generate jagged lightning path
    const generatePath = ()=>{
        const segments = 8;
        let path = `M ${bolt.x} ${bolt.y}`;
        let currentY = bolt.y;
        const segmentHeight = 15;
        for(let i = 0; i < segments; i++){
            const offsetX = (Math.random() - 0.5) * 10;
            currentY += segmentHeight;
            path += ` L ${bolt.x + offsetX} ${currentY}`;
        }
        return path;
    };
    const path = generatePath();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].svg, {
        initial: {
            opacity: 0,
            scale: 0
        },
        animate: {
            opacity: [
                0,
                1,
                0.3,
                1,
                0
            ],
            scale: bolt.scale
        },
        exit: {
            opacity: 0
        },
        transition: {
            duration: bolt.duration,
            ease: "easeOut"
        },
        className: "absolute",
        style: {
            left: `${bolt.x}%`,
            top: `${bolt.y}%`,
            filter: `drop-shadow(0 0 20px ${bolt.color}) drop-shadow(0 0 40px ${bolt.color})`
        },
        width: "100",
        height: "400",
        viewBox: "0 0 100 400",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].path, {
                d: path,
                fill: "none",
                stroke: bolt.color,
                strokeWidth: "3",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                initial: {
                    pathLength: 0
                },
                animate: {
                    pathLength: 1
                },
                transition: {
                    duration: 0.1,
                    ease: "easeOut"
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 141,
                columnNumber: 7
            }, this),
            [
                ...Array(3)
            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].path, {
                    d: `M ${bolt.x} ${bolt.y + 30 + i * 40} L ${bolt.x + (Math.random() - 0.5) * 30} ${bolt.y + 50 + i * 40}`,
                    fill: "none",
                    stroke: bolt.color,
                    strokeWidth: "1.5",
                    strokeLinecap: "round",
                    initial: {
                        pathLength: 0,
                        opacity: 0
                    },
                    animate: {
                        pathLength: 1,
                        opacity: [
                            0,
                            0.8,
                            0
                        ]
                    },
                    transition: {
                        duration: 0.15,
                        delay: i * 0.05
                    }
                }, i, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 155,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].path, {
                d: path,
                fill: "none",
                stroke: bolt.color,
                strokeWidth: "8",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                opacity: "0.3",
                initial: {
                    pathLength: 0
                },
                animate: {
                    pathLength: 1
                },
                transition: {
                    duration: 0.1,
                    ease: "easeOut"
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
        lineNumber: 125,
        columnNumber: 5
    }, this);
}
function ConnectLightning({ active }) {
    if (!active) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 pointer-events-none z-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0
                },
                animate: {
                    opacity: [
                        0,
                        0.5,
                        0
                    ]
                },
                transition: {
                    duration: 0.3
                },
                className: "absolute inset-0 bg-[#F7931A]/20"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 191,
                columnNumber: 7
            }, this),
            [
                ...Array(5)
            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        scaleY: 0
                    },
                    animate: {
                        opacity: [
                            0,
                            1,
                            0.5,
                            1,
                            0
                        ],
                        scaleY: [
                            0,
                            1,
                            1,
                            1,
                            1
                        ],
                        x: [
                            0,
                            Math.random() * 20 - 10,
                            0
                        ]
                    },
                    transition: {
                        duration: 0.4,
                        delay: i * 0.05
                    },
                    className: "absolute top-0 w-1 bg-gradient-to-b from-[#F7931A] via-[#FFD700] to-transparent",
                    style: {
                        left: `${20 + i * 15}%`,
                        height: "60%",
                        filter: "drop-shadow(0 0 10px #F7931A) drop-shadow(0 0 20px #FFD700)",
                        clipPath: "polygon(40% 0%, 60% 0%, 55% 20%, 65% 40%, 45% 60%, 55% 80%, 50% 100%, 40% 100%, 45% 80%, 35% 60%, 55% 40%, 45% 20%)"
                    }
                }, i, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 198,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
        lineNumber: 190,
        columnNumber: 5
    }, this);
}
function TransferLightning({ active, asset = "bitmap" }) {
    if (!active) return null;
    const colors = {
        billy: "#8B5CF6",
        dog: "#DC2626",
        bitmap: "#F7931A",
        pepe: "#10B981"
    };
    const mainColor = colors[asset] || "#F7931A";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 pointer-events-none z-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    x: "-100%"
                },
                animate: {
                    x: "200%"
                },
                transition: {
                    duration: 0.8,
                    ease: "easeInOut"
                },
                className: "absolute inset-0",
                style: {
                    background: `linear-gradient(90deg, transparent, ${mainColor}40, ${mainColor}60, ${mainColor}40, transparent)`
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            [
                ...Array(7)
            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        scaleY: 0
                    },
                    animate: {
                        opacity: [
                            0,
                            1,
                            0.3,
                            0.8,
                            0
                        ],
                        scaleY: [
                            0,
                            1,
                            1,
                            1,
                            1
                        ]
                    },
                    transition: {
                        duration: 0.5,
                        delay: i * 0.08
                    },
                    className: "absolute top-0 w-0.5",
                    style: {
                        left: `${10 + i * 13}%`,
                        height: "100%",
                        background: `linear-gradient(180deg, transparent, ${mainColor}, ${mainColor}, transparent)`,
                        filter: `drop-shadow(0 0 15px ${mainColor}) drop-shadow(0 0 30px ${mainColor})`
                    }
                }, i, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 246,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
        lineNumber: 232,
        columnNumber: 5
    }, this);
}
function SuccessLightning({ active, asset = "bitmap" }) {
    if (!active) return null;
    const colors = {
        billy: "#8B5CF6",
        dog: "#DC2626",
        bitmap: "#F7931A",
        pepe: "#10B981"
    };
    const mainColor = colors[asset] || "#F7931A";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 pointer-events-none z-50 flex items-center justify-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    scale: 0,
                    opacity: 1
                },
                animate: {
                    scale: 3,
                    opacity: 0
                },
                transition: {
                    duration: 0.8
                },
                className: "absolute w-96 h-96 rounded-full",
                style: {
                    background: `radial-gradient(circle, ${mainColor}60 0%, transparent 70%)`
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 281,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    scale: 0.5,
                    opacity: 0
                },
                animate: {
                    scale: 2,
                    opacity: [
                        0,
                        1,
                        0
                    ]
                },
                transition: {
                    duration: 0.6
                },
                className: "absolute w-64 h-64 rounded-full border-4",
                style: {
                    borderColor: mainColor,
                    boxShadow: `0 0 60px ${mainColor}, inset 0 0 60px ${mainColor}40`
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 292,
                columnNumber: 7
            }, this),
            [
                ...Array(12)
            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        scaleY: 0,
                        opacity: 0
                    },
                    animate: {
                        scaleY: 1,
                        opacity: [
                            0,
                            1,
                            0
                        ]
                    },
                    transition: {
                        duration: 0.4,
                        delay: i * 0.03
                    },
                    className: "absolute w-1 origin-bottom",
                    style: {
                        height: "50vh",
                        background: `linear-gradient(to top, transparent, ${mainColor}, transparent)`,
                        transform: `rotate(${i * 30}deg)`,
                        filter: `drop-shadow(0 0 20px ${mainColor})`
                    }
                }, i, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                    lineNumber: 305,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
        lineNumber: 279,
        columnNumber: 5
    }, this);
}
function SoundWaveVisualizer({ active, color = "#F7931A" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-1 h-8",
        children: [
            ...Array(8)
        ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "w-1 rounded-full",
                style: {
                    backgroundColor: color
                },
                animate: active ? {
                    height: [
                        8,
                        24 + Math.random() * 16,
                        8
                    ],
                    opacity: [
                        0.5,
                        1,
                        0.5
                    ]
                } : {
                    height: 8,
                    opacity: 0.3
                },
                transition: {
                    duration: 0.4 + i * 0.05,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
                lineNumber: 328,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx",
        lineNumber: 326,
        columnNumber: 5
    }, this);
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConfettiExplosion",
    ()=>ConfettiExplosion,
    "EmberTrail",
    ()=>EmberTrail,
    "FloatingRunes",
    ()=>FloatingRunes,
    "ParticleSystem",
    ()=>ParticleSystem,
    "SparkBurst",
    ()=>SparkBurst
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$use$2d$in$2d$view$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/utils/use-in-view.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const ASSET_THEMES = {
    billy: {
        colors: [
            "#8B5CF6",
            "#06B6D4",
            "#A855F7",
            "#22D3EE"
        ]
    },
    dog: {
        colors: [
            "#DC2626",
            "#F9FAFB",
            "#EF4444",
            "#FFFFFF"
        ]
    },
    bitmap: {
        colors: [
            "#F7931A",
            "#FFD700",
            "#F59E0B",
            "#FBBF24"
        ]
    },
    pepe: {
        colors: [
            "#10B981",
            "#EC4899",
            "#34D399",
            "#F472B6"
        ]
    }
};
// Off-screen canvas for particle rendering - NO React state updates
function useParticleCanvas(canvasRef, trigger, asset, intensity) {
    const particlesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])([]);
    const rafRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])();
    const theme = ASSET_THEMES[asset];
    const emitParticles = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((count, startX, startY)=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = startX !== undefined ? startX / 100 * rect.width : rect.width / 2;
        const y = startY !== undefined ? startY / 100 * rect.height : rect.height / 2;
        for(let i = 0; i < count; i++){
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particlesRef.current.push({
                id: Date.now() + i,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                life: 1,
                maxLife: 60 + Math.random() * 30,
                size: intensity === "high" ? 6 + Math.random() * 4 : intensity === "medium" ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
                color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                type: Math.random() > 0.7 ? "confetti" : "spark"
            });
        }
    }, [
        canvasRef,
        theme,
        intensity
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (trigger) {
            const count = intensity === "high" ? 40 : intensity === "medium" ? 25 : 15;
            emitParticles(count, 50, 50);
        }
    }, [
        trigger,
        intensity,
        emitParticles
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const resize = ()=>{
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize, {
            passive: true
        });
        let frameCount = 0;
        const render = ()=>{
            frameCount++;
            // Render every 2nd frame for 30fps particle animation (performance optimization)
            if (frameCount % 2 === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particlesRef.current = particlesRef.current.filter((p)=>{
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.15; // gravity
                    p.vx *= 0.98; // friction
                    p.rotation += p.rotationSpeed;
                    p.life -= 1 / p.maxLife;
                    if (p.life <= 0) return false;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.globalAlpha = p.life;
                    if (p.type === "confetti") {
                        ctx.fillStyle = p.color;
                        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                    } else {
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = p.size * 2;
                        ctx.fill();
                    }
                    ctx.restore();
                    return true;
                });
            }
            rafRef.current = requestAnimationFrame(render);
        };
        render();
        return ()=>{
            window.removeEventListener("resize", resize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [
        canvasRef
    ]);
    return {
        emitParticles
    };
}
const ParticleSystem = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function ParticleSystem({ trigger, origin, type = "burst", asset = "bitmap", intensity = "medium" }) {
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const isInView = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$use$2d$in$2d$view$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useInView"])(containerRef, {
        once: false,
        amount: 0.1
    });
    const shouldReduceMotion = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    useParticleCanvas(canvasRef, isInView ? trigger : null, asset, intensity);
    if (shouldReduceMotion) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        className: "fixed inset-0 pointer-events-none z-30 overflow-hidden",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
            ref: canvasRef,
            className: "absolute inset-0",
            style: {
                opacity: isInView ? 1 : 0,
                transition: "opacity 0.3s"
            }
        }, void 0, false, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
            lineNumber: 178,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
        lineNumber: 177,
        columnNumber: 5
    }, this);
});
const ConfettiExplosion = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function ConfettiExplosion({ active, asset = "bitmap" }) {
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const shouldReduceMotion = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    if (!active || shouldReduceMotion) return null;
    const colors = ASSET_THEMES[asset]?.colors || ASSET_THEMES.bitmap.colors;
    const confettiCount = 30; // Reduced from 60 for performance
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        className: "fixed inset-0 pointer-events-none z-40 flex items-center justify-center",
        children: Array.from({
            length: confettiCount
        }).map((_, i)=>{
            const angle = i / confettiCount * Math.PI * 2;
            const distance = 100 + Math.random() * 150;
            const color = colors[i % colors.length];
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance + 100;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute w-2 h-2 will-change-transform",
                style: {
                    backgroundColor: color,
                    borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                    animation: `confetti-explode 1s ease-out forwards`,
                    animationDelay: `${i * 0.01}s`,
                    ["--tx"]: `${tx}px`,
                    ["--ty"]: `${ty}px`
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
                lineNumber: 213,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
        lineNumber: 204,
        columnNumber: 5
    }, this);
});
const FloatingRunes = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function FloatingRunes({ asset = "bitmap" }) {
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const isInView = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$use$2d$in$2d$view$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useInView"])(containerRef, {
        once: false,
        amount: 0.1
    });
    const shouldReduceMotion = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    const theme = ASSET_THEMES[asset] || ASSET_THEMES.bitmap;
    if (shouldReduceMotion) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: containerRef,
        className: "absolute inset-0 overflow-hidden pointer-events-none opacity-20",
        children: isInView && Array.from({
            length: 8
        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute font-bold text-3xl will-change-transform",
                style: {
                    left: `${10 + i * 11 % 80}%`,
                    top: `${10 + i * 13 % 70}%`,
                    color: theme.colors[i % theme.colors.length],
                    textShadow: `0 0 20px ${theme.colors[i % theme.colors.length]}`,
                    animation: `float-rune ${4 + i % 3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.6}s`
                },
                children: "ᚱ"
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
                lineNumber: 247,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
        lineNumber: 245,
        columnNumber: 5
    }, this);
});
const SparkBurst = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function SparkBurst({ x, y, color = "#F7931A", active }) {
    const shouldReduceMotion = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$utils$2f$reduced$2d$motion$2f$use$2d$reduced$2d$motion$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useReducedMotion"])();
    if (!active || shouldReduceMotion) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed pointer-events-none z-50",
        style: {
            left: x,
            top: y
        },
        children: Array.from({
            length: 8
        }).map((_, i)=>{
            const angle = i / 8 * Math.PI * 2;
            const tx = Math.cos(angle) * 40;
            const ty = Math.sin(angle) * 40;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute w-2 h-2 rounded-full will-change-transform",
                style: {
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}`,
                    ["--tx"]: `${tx}px`,
                    ["--ty"]: `${ty}px`,
                    animation: `spark-burst 0.4s ease-out forwards`,
                    animationDelay: `${i * 0.02}s`
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
                lineNumber: 293,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
        lineNumber: 283,
        columnNumber: 5
    }, this);
});
const EmberTrail = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function EmberTrail({ active, color = "#F7931A" }) {
    if (!active) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute inset-0 overflow-hidden pointer-events-none",
        children: Array.from({
            length: 5
        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-0 w-1 h-1 rounded-full will-change-transform",
                style: {
                    left: `${20 + i * 15}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
                    animation: `ember-rise 1.5s ease-out infinite`,
                    animationDelay: `${i * 0.2}s`
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
                lineNumber: 324,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx",
        lineNumber: 322,
        columnNumber: 5
    }, this);
});
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BillyText",
    ()=>BillyText,
    "BitmapText",
    ()=>BitmapText,
    "ConnectedText",
    ()=>ConnectedText,
    "DogText",
    ()=>DogText,
    "GlitchCounter",
    ()=>GlitchCounter,
    "GlitchText",
    ()=>GlitchText,
    "PepeText",
    ()=>PepeText,
    "SuccessText",
    ()=>SuccessText
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const VARIANTS = {
    glitch: {
        animation: "animate-glitch",
        textShadow: "none"
    },
    neon: {
        animation: "animate-neon-flicker",
        textShadow: "0 0 4px currentColor, 0 0 11px currentColor, 0 0 19px currentColor"
    },
    electric: {
        animation: "",
        textShadow: "0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor"
    },
    meow: {
        animation: "animate-feels-good",
        textShadow: "0 0 10px #8B5CF6, 0 0 20px #06B6D4"
    },
    wow: {
        animation: "animate-wow-bounce",
        textShadow: "0 0 10px #DC2626, 0 0 20px #F9FAFB"
    },
    rare: {
        animation: "animate-feels-good",
        textShadow: "0 0 10px #10B981, 0 0 20px #EC4899"
    }
};
const SIZE_CLASSES = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
    xl: "text-4xl",
    "2xl": "text-6xl"
};
function GlitchText({ text, className = "", glitchOnHover = true, autoGlitch = false, color, variant = "glitch", size = "lg", as: Component = "span", trigger = false }) {
    const [isGlitching, setIsGlitching] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(autoGlitch);
    const [displayText, setDisplayText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(text);
    const [key, setKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (trigger) {
            setIsGlitching(true);
            setKey((prev)=>prev + 1);
            // Glitch text effect
            let iterations = 0;
            const maxIterations = 10;
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
            const interval = setInterval(()=>{
                setDisplayText(text.split("").map((char, index)=>{
                    if (index < iterations) return text[index];
                    if (char === " ") return " ";
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join(""));
                iterations += 1 / 3;
                if (iterations >= text.length) {
                    clearInterval(interval);
                    setDisplayText(text);
                    setTimeout(()=>setIsGlitching(false), 500);
                }
            }, 30);
            return ()=>clearInterval(interval);
        }
    }, [
        trigger,
        text
    ]);
    const handleMouseEnter = ()=>{
        if (glitchOnHover) {
            setIsGlitching(true);
            // Brief scramble
            let iterations = 0;
            const interval = setInterval(()=>{
                setDisplayText(text.split("").map((char, index)=>{
                    if (char === " ") return " ";
                    if (Math.random() > 0.7) {
                        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
                        return chars[Math.floor(Math.random() * chars.length)];
                    }
                    return char;
                }).join(""));
                iterations++;
                if (iterations > 5) {
                    clearInterval(interval);
                    setDisplayText(text);
                    setIsGlitching(false);
                }
            }, 50);
        }
    };
    const variantStyle = VARIANTS[variant];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
        className: `relative inline-block ${SIZE_CLASSES[size]} ${className}`,
        style: {
            color: color || "inherit"
        },
        onMouseEnter: handleMouseEnter,
        "data-text": text,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Component, {
                className: `relative z-10 ${isGlitching ? variantStyle.animation : ""}`,
                style: {
                    textShadow: isGlitching ? variantStyle.textShadow : "none"
                },
                children: displayText
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                lineNumber: 143,
                columnNumber: 7
            }, this),
            isGlitching && variant === "glitch" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-0 text-red-500 opacity-70",
                        style: {
                            clipPath: "inset(40% 0 61% 0)",
                            transform: "translate(-2px, 2px)",
                            animation: "glitch-text 0.3s infinite linear alternate-reverse"
                        },
                        children: displayText
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                        lineNumber: 155,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-0 text-green-500 opacity-70",
                        style: {
                            clipPath: "inset(25% 0 58% 0)",
                            transform: "translate(2px, -2px)",
                            animation: "glitch-text-alt 0.3s infinite linear alternate-reverse"
                        },
                        children: displayText
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                        lineNumber: 165,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true),
            (variant === "electric" || variant === "neon") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                className: "absolute -bottom-1 left-0 h-0.5 bg-current",
                initial: {
                    width: "0%"
                },
                animate: {
                    width: isGlitching ? "100%" : "0%"
                },
                transition: {
                    duration: 0.3
                },
                style: {
                    boxShadow: `0 0 10px currentColor, 0 0 20px currentColor`
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                lineNumber: 180,
                columnNumber: 9
            }, this)
        ]
    }, key, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 136,
        columnNumber: 5
    }, this);
}
function BillyText({ text, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GlitchText, {
        text: text,
        variant: "meow",
        color: "#8B5CF6",
        ...props
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 197,
        columnNumber: 5
    }, this);
}
function DogText({ text, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GlitchText, {
        text: text,
        variant: "wow",
        color: "#DC2626",
        ...props
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 208,
        columnNumber: 5
    }, this);
}
function BitmapText({ text, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GlitchText, {
        text: text,
        variant: "electric",
        color: "#F7931A",
        ...props
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 219,
        columnNumber: 5
    }, this);
}
function PepeText({ text, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GlitchText, {
        text: text,
        variant: "rare",
        color: "#10B981",
        ...props
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 230,
        columnNumber: 5
    }, this);
}
function GlitchCounter({ value, prefix = "", suffix = "", className = "", color = "#F7931A" }) {
    const [displayValue, setDisplayValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isAnimating, setIsAnimating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setIsAnimating(true);
        const duration = 1000;
        const steps = 30;
        const increment = value / steps;
        let current = 0;
        const interval = setInterval(()=>{
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(interval);
                setTimeout(()=>setIsAnimating(false), 300);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, duration / steps);
        return ()=>clearInterval(interval);
    }, [
        value
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `relative inline-block font-bold ${className}`,
        style: {
            color
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: isAnimating ? "animate-glitch" : "",
                children: [
                    prefix,
                    displayValue.toLocaleString(),
                    suffix
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                lineNumber: 282,
                columnNumber: 7
            }, this),
            isAnimating && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute inset-0 text-white opacity-50",
                style: {
                    animation: "glitch-text 0.2s infinite"
                },
                children: [
                    prefix,
                    displayValue.toLocaleString(),
                    suffix
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                lineNumber: 286,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 278,
        columnNumber: 5
    }, this);
}
function SuccessText({ text, active }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: active && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                scale: 0.5,
                opacity: 0
            },
            animate: {
                scale: 1,
                opacity: 1
            },
            exit: {
                scale: 0.5,
                opacity: 0
            },
            className: "relative",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                    className: "text-4xl font-bold text-green-400",
                    animate: {
                        textShadow: [
                            "0 0 10px #22c55e, 0 0 20px #22c55e",
                            "0 0 20px #22c55e, 0 0 40px #22c55e",
                            "0 0 10px #22c55e, 0 0 20px #22c55e"
                        ]
                    },
                    transition: {
                        duration: 0.5,
                        repeat: Infinity
                    },
                    children: text
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                    lineNumber: 310,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        scale: 0
                    },
                    animate: {
                        scale: [
                            0,
                            1.5,
                            1
                        ]
                    },
                    transition: {
                        duration: 0.5,
                        delay: 0.2
                    },
                    className: "absolute -left-12 top-1/2 -translate-y-1/2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-4xl",
                        children: "⚡"
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                        lineNumber: 331,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                    lineNumber: 325,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
            lineNumber: 304,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 302,
        columnNumber: 5
    }, this);
}
function ConnectedText({ active }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: active && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
            initial: {
                opacity: 0,
                y: 10
            },
            animate: {
                opacity: 1,
                y: 0
            },
            exit: {
                opacity: 0,
                y: -10
            },
            className: "text-green-400 font-bold text-sm flex items-center gap-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                    animate: {
                        scale: [
                            1,
                            1.2,
                            1
                        ]
                    },
                    transition: {
                        duration: 1,
                        repeat: Infinity
                    },
                    className: "w-2 h-2 rounded-full bg-green-400",
                    style: {
                        boxShadow: "0 0 10px #22c55e"
                    }
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
                    lineNumber: 350,
                    columnNumber: 11
                }, this),
                "CONNECTED"
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
            lineNumber: 344,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx",
        lineNumber: 342,
        columnNumber: 5
    }, this);
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssetCard3D",
    ()=>AssetCard3D,
    "StatCard3D",
    ()=>StatCard3D
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$qrcode$2e$react$2f$lib$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/qrcode.react/lib/esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/copy.js [app-ssr] (ecmascript) <export default as Copy>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-ssr] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
const ASSET_CONFIGS = {
    billy: {
        colors: {
            primary: "#8B5CF6",
            secondary: "#06B6D4",
            accent: "#A855F7"
        },
        gradient: "from-purple-500/20 via-cyan-500/10 to-purple-500/20",
        border: "border-purple-500/30",
        glow: "shadow-purple-500/30",
        emoji: "🐱",
        particle: "paw"
    },
    dog: {
        colors: {
            primary: "#DC2626",
            secondary: "#F9FAFB",
            accent: "#EF4444"
        },
        gradient: "from-red-500/20 via-white/5 to-red-500/20",
        border: "border-red-500/30",
        glow: "shadow-red-500/30",
        emoji: "🐕",
        particle: "moon"
    },
    bitmap: {
        colors: {
            primary: "#F7931A",
            secondary: "#FFD700",
            accent: "#F59E0B"
        },
        gradient: "from-orange-500/20 via-yellow-500/10 to-orange-500/20",
        border: "border-orange-500/30",
        glow: "shadow-orange-500/30",
        emoji: "🏙️",
        particle: "block"
    },
    pepe: {
        colors: {
            primary: "#10B981",
            secondary: "#EC4899",
            accent: "#34D399"
        },
        gradient: "from-green-500/20 via-pink-500/10 to-green-500/20",
        border: "border-green-500/30",
        glow: "shadow-green-500/30",
        emoji: "🐸",
        particle: "frog"
    }
};
function detectAssetType(name) {
    const lower = name.toLowerCase();
    if (lower.includes("billy") || lower.includes("cat")) return "billy";
    if (lower.includes("dog") || lower.includes("doge")) return "dog";
    if (lower.includes("pepe") || lower.includes("frog")) return "pepe";
    if (lower.includes("bitmap")) return "bitmap";
    return "bitmap";
}
function AssetCard3D({ asset, selected, onClick, address }) {
    const [flipped, setFlipped] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [hovered, setHovered] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tilt, setTilt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        x: 0,
        y: 0
    });
    const [copied, setCopied] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const cardRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const assetKey = detectAssetType(asset.name);
    const config = ASSET_CONFIGS[assetKey];
    const displayImage = asset.image || config.emoji;
    const handleMouseMove = (e)=>{
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({
            x: y * -20,
            y: x * 20
        });
    };
    const handleMouseLeave = ()=>{
        setTilt({
            x: 0,
            y: 0
        });
        setHovered(false);
    };
    const handleClick = ()=>{
        if (onClick) onClick();
    };
    const handleFlip = (e)=>{
        e.stopPropagation();
        setFlipped(!flipped);
    };
    const copyAddress = (e)=>{
        e.stopPropagation();
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(()=>setCopied(false), 2000);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        style: {
            perspective: "1000px"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmberTrail"], {
                active: hovered,
                color: config.colors.primary
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                ref: cardRef,
                className: `relative cursor-pointer ${selected ? "z-10" : "z-0"}`,
                style: {
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                },
                animate: {
                    y: hovered ? -8 : 0,
                    scale: selected ? 1.02 : 1
                },
                transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                },
                onMouseMove: handleMouseMove,
                onMouseEnter: ()=>setHovered(true),
                onMouseLeave: handleMouseLeave,
                onClick: handleClick,
                whileTap: {
                    scale: 0.98
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: `relative rounded-2xl border-2 p-6 overflow-hidden backdrop-blur-sm
            ${flipped ? "opacity-0" : "opacity-100"}
            ${selected ? config.border : "border-white/10"}
            ${selected ? `shadow-[0_0_40px_rgba(0,0,0,0.3)]` : ""}
          `,
                        style: {
                            background: `linear-gradient(135deg, rgba(17,17,17,0.95), rgba(17,17,17,0.8))`,
                            backfaceVisibility: "hidden",
                            boxShadow: selected ? `0 0 40px ${config.colors.primary}40, 0 0 80px ${config.colors.primary}20, inset 0 0 40px ${config.colors.primary}10` : hovered ? `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${config.colors.primary}30` : "0 4px 20px rgba(0,0,0,0.2)"
                        },
                        animate: {
                            rotateY: flipped ? 180 : 0
                        },
                        transition: {
                            duration: 0.6
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 153,
                                columnNumber: 11
                            }, this),
                            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                className: "absolute inset-0 rounded-2xl",
                                animate: {
                                    boxShadow: [
                                        `inset 0 0 20px ${config.colors.primary}20`,
                                        `inset 0 0 40px ${config.colors.primary}40`,
                                        `inset 0 0 20px ${config.colors.primary}20`
                                    ]
                                },
                                transition: {
                                    duration: 2,
                                    repeat: Infinity
                                }
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 157,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative z-10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-start justify-between mb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "px-3 py-1 rounded-full text-xs font-semibold border",
                                                style: {
                                                    backgroundColor: `${config.colors.primary}20`,
                                                    borderColor: `${config.colors.primary}40`,
                                                    color: config.colors.primary
                                                },
                                                children: asset.type.toUpperCase()
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 174,
                                                columnNumber: 15
                                            }, this),
                                            selected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                                initial: {
                                                    scale: 0
                                                },
                                                animate: {
                                                    scale: 1
                                                },
                                                className: "w-6 h-6 rounded-full flex items-center justify-center",
                                                style: {
                                                    backgroundColor: config.colors.primary
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                    className: "w-4 h-4 text-black"
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                    lineNumber: 192,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 186,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 173,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "text-6xl mb-4",
                                        animate: hovered ? {
                                            y: [
                                                0,
                                                -5,
                                                0
                                            ],
                                            rotate: [
                                                0,
                                                -5,
                                                5,
                                                0
                                            ]
                                        } : {},
                                        transition: {
                                            duration: 0.5
                                        },
                                        children: displayImage
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 198,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-xl font-bold mb-1 truncate",
                                        style: {
                                            color: config.colors.primary
                                        },
                                        children: asset.name
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 210,
                                        columnNumber: 13
                                    }, this),
                                    asset.symbol && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-gray-500 mb-3",
                                        children: asset.symbol
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 215,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-baseline gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-3xl font-bold",
                                                style: {
                                                    background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.secondary})`,
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent"
                                                },
                                                children: asset.type === "bitmap" || asset.type === "ordinal" ? asset.amount : asset.amount.toLocaleString()
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 220,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-gray-500 text-sm",
                                                children: asset.type === "bitmap" || asset.type === "ordinal" ? asset.amount > 1 ? "items" : "item" : ""
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 229,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 219,
                                        columnNumber: 13
                                    }, this),
                                    address && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleFlip,
                                        className: "mt-4 text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                className: "w-3 h-3"
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 243,
                                                columnNumber: 17
                                            }, this),
                                            "Tap for QR"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 239,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 171,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 pointer-events-none",
                                style: {
                                    background: `linear-gradient(135deg, transparent 40%, ${config.colors.primary}10 50%, transparent 60%)`,
                                    transform: "translateX(-100%)",
                                    animation: hovered ? "shimmer 1.5s ease-in-out" : "none"
                                }
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 250,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: `absolute inset-0 rounded-2xl border-2 p-6 backdrop-blur-sm
            ${config.border}
          `,
                        style: {
                            background: "linear-gradient(135deg, rgba(17,17,17,0.95), rgba(17,17,17,0.8))",
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                            boxShadow: `0 0 40px ${config.colors.primary}30`
                        },
                        animate: {
                            rotateY: flipped ? 0 : -180
                        },
                        transition: {
                            duration: 0.6
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-30 rounded-2xl`
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 274,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative z-10 h-full flex flex-col items-center justify-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                        className: "text-sm font-semibold mb-4",
                                        style: {
                                            color: config.colors.primary
                                        },
                                        children: [
                                            "Receive ",
                                            asset.name
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 277,
                                        columnNumber: 13
                                    }, this),
                                    address && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-white p-3 rounded-xl mb-4",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$qrcode$2e$react$2f$lib$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["QRCodeSVG"], {
                                            value: `bitcoin:${address}`,
                                            size: 120,
                                            level: "M",
                                            bgColor: "transparent",
                                            fgColor: config.colors.primary
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                            lineNumber: 283,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 282,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: copyAddress,
                                        className: "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                                        style: {
                                            borderColor: `${config.colors.primary}40`,
                                            backgroundColor: `${config.colors.primary}10`,
                                            color: config.colors.primary
                                        },
                                        children: [
                                            copied ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 302,
                                                columnNumber: 25
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$copy$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Copy$3e$__["Copy"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                                lineNumber: 302,
                                                columnNumber: 57
                                            }, this),
                                            copied ? "Copied!" : "Copy Address"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 293,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleFlip,
                                        className: "mt-4 text-xs text-gray-500 hover:text-white transition-colors",
                                        children: "Tap to flip back"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                        lineNumber: 306,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                                lineNumber: 276,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                        lineNumber: 261,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this),
            hovered && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 pointer-events-none",
                children: [
                    ...Array(6)
                ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: "absolute w-2 h-2 rounded-full",
                        style: {
                            backgroundColor: config.colors.primary,
                            boxShadow: `0 0 10px ${config.colors.primary}`
                        },
                        initial: {
                            x: "50%",
                            y: "50%",
                            scale: 0,
                            opacity: 1
                        },
                        animate: {
                            x: `${50 + (Math.random() - 0.5) * 150}%`,
                            y: `${50 + (Math.random() - 0.5) * 150}%`,
                            scale: [
                                0,
                                1,
                                0
                            ],
                            opacity: [
                                1,
                                0.8,
                                0
                            ]
                        },
                        transition: {
                            duration: 1 + Math.random(),
                            delay: i * 0.1
                        }
                    }, i, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                        lineNumber: 320,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                lineNumber: 318,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
        lineNumber: 111,
        columnNumber: 5
    }, this);
}
function StatCard3D({ label, value, icon: Icon, color = "#F7931A", delay = 0 }) {
    const [hovered, setHovered] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [tilt, setTilt] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        x: 0,
        y: 0
    });
    const handleMouseMove = (e)=>{
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({
            x: y * -15,
            y: x * 15
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            y: 20
        },
        animate: {
            opacity: 1,
            y: 0
        },
        transition: {
            delay,
            duration: 0.5
        },
        className: "relative cursor-pointer",
        style: {
            perspective: "1000px"
        },
        onMouseMove: handleMouseMove,
        onMouseEnter: ()=>setHovered(true),
        onMouseLeave: ()=>{
            setHovered(false);
            setTilt({
                x: 0,
                y: 0
            });
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
            className: "card text-center relative overflow-hidden",
            animate: {
                y: hovered ? -5 : 0,
                rotateX: tilt.x,
                rotateY: tilt.y
            },
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 20
            },
            style: {
                transformStyle: "preserve-3d",
                boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${color}30` : "0 4px 20px rgba(0,0,0,0.1)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    className: "absolute inset-0 rounded-2xl pointer-events-none",
                    animate: {
                        boxShadow: hovered ? `inset 0 0 30px ${color}20` : "inset 0 0 0px transparent"
                    }
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                    lineNumber: 402,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    className: "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
                    style: {
                        backgroundColor: `${color}20`
                    },
                    animate: hovered ? {
                        scale: [
                            1,
                            1.1,
                            1
                        ],
                        rotate: [
                            0,
                            5,
                            -5,
                            0
                        ]
                    } : {},
                    transition: {
                        duration: 0.5
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        style: {
                            color
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                            className: "w-6 h-6"
                        }, void 0, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                            lineNumber: 418,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                        lineNumber: 417,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                    lineNumber: 411,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-2xl font-bold mb-1",
                    style: {
                        color
                    },
                    children: value
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                    lineNumber: 422,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm text-gray-500",
                    children: label
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
                    lineNumber: 425,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
            lineNumber: 386,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx",
        lineNumber: 373,
        columnNumber: 5
    }, this);
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AssetSectionBackground",
    ()=>AssetSectionBackground,
    "EnergyBackground",
    ()=>EnergyBackground,
    "HeroBackground",
    ()=>HeroBackground
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
const THEME_COLORS = {
    default: {
        primary: "#F7931A",
        secondary: "#FFD700",
        accent: "#D67F15"
    },
    billy: {
        primary: "#8B5CF6",
        secondary: "#06B6D4",
        accent: "#A855F7"
    },
    dog: {
        primary: "#DC2626",
        secondary: "#F9FAFB",
        accent: "#EF4444"
    },
    bitmap: {
        primary: "#F7931A",
        secondary: "#FFD700",
        accent: "#F59E0B"
    },
    pepe: {
        primary: "#10B981",
        secondary: "#EC4899",
        accent: "#34D399"
    }
};
function EnergyBackground({ variant = "default", intensity = "medium" }) {
    const colors = THEME_COLORS[variant];
    const opacity = intensity === "high" ? 0.6 : intensity === "medium" ? 0.4 : 0.2;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 overflow-hidden pointer-events-none z-0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0",
                style: {
                    background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}15 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${colors.secondary}10 0%, transparent 40%),
                       radial-gradient(ellipse at 20% 80%, ${colors.accent}10 0%, transparent 40%)`
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TronGrid, {
                color: colors.primary,
                opacity: opacity * 0.5
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FloatingParticles, {
                color: colors.primary,
                count: intensity === "high" ? 30 : intensity === "medium" ? 20 : 10
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 39,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(EnergyRivers, {
                colors: [
                    colors.primary,
                    colors.secondary
                ]
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BackgroundLightning, {
                color: colors.primary,
                intensity: intensity
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GradientOrbs, {
                colors: [
                    colors.primary,
                    colors.secondary,
                    colors.accent
                ]
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
function TronGrid({ color, opacity }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        className: "absolute inset-0",
        style: {
            backgroundImage: `
          linear-gradient(${color}10 1px, transparent 1px),
          linear-gradient(90deg, ${color}10 1px, transparent 1px)
        `,
            backgroundSize: "60px 60px",
            opacity
        },
        animate: {
            backgroundPosition: [
                "0px 0px",
                "60px 60px"
            ]
        },
        transition: {
            duration: 20,
            repeat: Infinity,
            ease: "linear"
        }
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
function FloatingParticles({ color, count }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            ...Array(count)
        ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute rounded-full",
                style: {
                    width: Math.random() * 4 + 2,
                    height: Math.random() * 4 + 2,
                    backgroundColor: color,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    boxShadow: `0 0 ${Math.random() * 10 + 5}px ${color}`,
                    opacity: Math.random() * 0.5 + 0.2
                },
                animate: {
                    y: [
                        0,
                        -100,
                        0
                    ],
                    x: [
                        0,
                        (Math.random() - 0.5) * 50,
                        0
                    ],
                    opacity: [
                        0.2,
                        0.6,
                        0.2
                    ],
                    scale: [
                        1,
                        1.5,
                        1
                    ]
                },
                transition: {
                    duration: 5 + Math.random() * 10,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: "easeInOut"
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 81,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
function EnergyRivers({ colors }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            ...Array(3)
        ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute h-px w-full",
                style: {
                    top: `${30 + i * 25}%`,
                    background: `linear-gradient(90deg, transparent, ${colors[i % colors.length]}40, ${colors[i % colors.length]}60, ${colors[i % colors.length]}40, transparent)`,
                    filter: "blur(1px)"
                },
                animate: {
                    x: [
                        "-100%",
                        "100%"
                    ],
                    opacity: [
                        0.3,
                        0.6,
                        0.3
                    ]
                },
                transition: {
                    duration: 8 + i * 2,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 2
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 115,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
function BackgroundLightning({ color, intensity }) {
    const [bolts, setBolts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const interval = setInterval(()=>{
            if (Math.random() > (intensity === "high" ? 0.5 : intensity === "medium" ? 0.7 : 0.85)) {
                const newBolt = {
                    id: Date.now(),
                    x: Math.random() * 100,
                    delay: Math.random() * 0.5
                };
                setBolts((prev)=>[
                        ...prev.slice(-3),
                        newBolt
                    ]);
                setTimeout(()=>{
                    setBolts((prev)=>prev.filter((b)=>b.id !== newBolt.id));
                }, 1000);
            }
        }, 2000);
        return ()=>clearInterval(interval);
    }, [
        intensity
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: bolts.map((bolt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute top-0 w-px h-1/3",
                style: {
                    left: `${bolt.x}%`,
                    background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
                    filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})`
                },
                initial: {
                    opacity: 0,
                    scaleY: 0
                },
                animate: {
                    opacity: [
                        0,
                        1,
                        0.5,
                        1,
                        0
                    ],
                    scaleY: [
                        0,
                        1,
                        1,
                        1,
                        1
                    ]
                },
                transition: {
                    duration: 0.4,
                    delay: bolt.delay
                }
            }, bolt.id, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 164,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
function GradientOrbs({ colors }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: colors.map((color, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute rounded-full blur-3xl",
                style: {
                    width: 400 + i * 100,
                    height: 400 + i * 100,
                    backgroundColor: color,
                    opacity: 0.1,
                    left: `${10 + i * 30}%`,
                    top: `${20 + i * 20}%`
                },
                animate: {
                    x: [
                        0,
                        50,
                        0,
                        -50,
                        0
                    ],
                    y: [
                        0,
                        -30,
                        0,
                        30,
                        0
                    ],
                    scale: [
                        1,
                        1.1,
                        1,
                        0.9,
                        1
                    ]
                },
                transition: {
                    duration: 15 + i * 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }, i, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 188,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
function HeroBackground() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute inset-0 overflow-hidden pointer-events-none",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px]",
                style: {
                    backgroundColor: "#F7931A"
                },
                animate: {
                    x: [
                        0,
                        50,
                        0
                    ],
                    y: [
                        0,
                        30,
                        0
                    ],
                    scale: [
                        1,
                        1.2,
                        1
                    ],
                    opacity: [
                        0.2,
                        0.3,
                        0.2
                    ]
                },
                transition: {
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 220,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px]",
                style: {
                    backgroundColor: "#FFD700"
                },
                animate: {
                    x: [
                        0,
                        -30,
                        0
                    ],
                    y: [
                        0,
                        -50,
                        0
                    ],
                    scale: [
                        1,
                        1.1,
                        1
                    ],
                    opacity: [
                        0.1,
                        0.2,
                        0.1
                    ]
                },
                transition: {
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HeroLightningStrikes, {}, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 244,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
        lineNumber: 218,
        columnNumber: 5
    }, this);
}
function HeroLightningStrikes() {
    const [strikes, setStrikes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const interval = setInterval(()=>{
            if (Math.random() > 0.7) {
                const strike = {
                    id: Date.now(),
                    x: 10 + Math.random() * 80
                };
                setStrikes((prev)=>[
                        ...prev,
                        strike
                    ]);
                setTimeout(()=>{
                    setStrikes((prev)=>prev.filter((s)=>s.id !== strike.id));
                }, 600);
            }
        }, 3000);
        return ()=>clearInterval(interval);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: strikes.map((strike)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute top-0 w-0.5",
                style: {
                    left: `${strike.x}%`,
                    height: "50%",
                    background: "linear-gradient(to bottom, #F7931A, #FFD700, transparent)",
                    filter: "drop-shadow(0 0 20px #F7931A) drop-shadow(0 0 40px #FFD700)",
                    clipPath: "polygon(40% 0%, 60% 0%, 55% 20%, 65% 40%, 45% 60%, 55% 80%, 50% 100%, 40% 100%, 45% 80%, 35% 60%, 55% 40%, 45% 20%)"
                },
                initial: {
                    opacity: 0,
                    scaleY: 0
                },
                animate: {
                    opacity: [
                        0,
                        1,
                        0.5,
                        1,
                        0
                    ],
                    scaleY: [
                        0,
                        1,
                        1,
                        1,
                        1
                    ]
                },
                transition: {
                    duration: 0.6
                }
            }, strike.id, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 269,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
function AssetSectionBackground({ asset }) {
    const colors = THEME_COLORS[asset];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute inset-0 overflow-hidden pointer-events-none",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute -top-1/2 -left-1/4 w-[150%] h-[150%] rounded-full blur-[150px]",
                style: {
                    backgroundColor: colors.primary
                },
                animate: {
                    x: [
                        0,
                        100,
                        0
                    ],
                    y: [
                        0,
                        50,
                        0
                    ],
                    opacity: [
                        0.1,
                        0.15,
                        0.1
                    ]
                },
                transition: {
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 297,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                className: "absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] rounded-full blur-[150px]",
                style: {
                    backgroundColor: colors.secondary
                },
                animate: {
                    x: [
                        0,
                        -80,
                        0
                    ],
                    y: [
                        0,
                        -60,
                        0
                    ],
                    opacity: [
                        0.08,
                        0.12,
                        0.08
                    ]
                },
                transition: {
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3
                }
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx",
        lineNumber: 296,
        columnNumber: 5
    }, this);
}
}),
"[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/zap.js [app-ssr] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/wallet.js [app-ssr] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRightLeft$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/arrow-right-left.js [app-ssr] (ecmascript) <export default as ArrowRightLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/shield.js [app-ssr] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/clock.js [app-ssr] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bitcoin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bitcoin$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/bitcoin.js [app-ssr] (ecmascript) <export default as Bitcoin>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-ssr] (ecmascript) <export default as ChevronRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/external-link.js [app-ssr] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$AssetDashboard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetDashboard.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$wallets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/lib/wallets.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/lib/api.ts [app-ssr] (ecmascript)");
// Import new visual effect components
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$LightningEffects$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/LightningEffects.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/ParticleSystem.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/GlitchText.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$AssetCard3D$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/AssetCard3D.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.openclaw/workspace/projects/runebolt/frontend/app/components/EnergyBackground.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
const fadeIn = {
    hidden: {
        opacity: 0,
        y: 20
    },
    visible: {
        opacity: 1,
        y: 0
    }
};
const staggerContainer = {
    hidden: {
        opacity: 0
    },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};
// Asset sections data
const ASSETS = [
    {
        id: "billy",
        name: "BILLY",
        fullName: "Billion Dollar Cat",
        description: "The purple lightning of feline finance. Every transaction leaves paw prints.",
        color: "#8B5CF6",
        emoji: "🐱",
        stats: {
            holders: "12.5K",
            volume: "$2.4M",
            price: "$0.0042"
        }
    },
    {
        id: "dog",
        name: "DOG",
        fullName: "Doggotothemoon",
        description: "Much wow. Very red. Such lightning. The original meme on Bitcoin.",
        color: "#DC2626",
        emoji: "🐕",
        stats: {
            holders: "45.2K",
            volume: "$8.1M",
            price: "$0.0088"
        }
    },
    {
        id: "bitmap",
        name: "BITMAP",
        fullName: "Bitmap Protocol",
        description: "Own your piece of Bitcoin history. Block by block, the metaverse unfolds.",
        color: "#F7931A",
        emoji: "🏙️",
        stats: {
            holders: "28.9K",
            volume: "$5.6M",
            price: "$0.015"
        }
    },
    {
        id: "pepe",
        name: "PEPE",
        fullName: "Rare Pepe",
        description: "Feels good man. The green lightning of meme magic on Bitcoin.",
        color: "#10B981",
        emoji: "🐸",
        stats: {
            holders: "33.7K",
            volume: "$6.9M",
            price: "$0.0012"
        }
    }
];
function Navbar({ connected, address, onConnect, network }) {
    const [scrolled, setScrolled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const handleScroll = ()=>setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return ()=>window.removeEventListener("scroll", handleScroll);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].nav, {
        initial: {
            y: -100
        },
        animate: {
            y: 0
        },
        className: `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-white/5" : ""}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between h-16",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: "flex items-center gap-2",
                        whileHover: {
                            scale: 1.05
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                className: "w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center",
                                animate: {
                                    boxShadow: [
                                        "0 0 10px rgba(247, 147, 26, 0.5)",
                                        "0 0 30px rgba(247, 147, 26, 0.8)",
                                        "0 0 10px rgba(247, 147, 26, 0.5)"
                                    ]
                                },
                                transition: {
                                    duration: 2,
                                    repeat: Infinity
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                    className: "w-5 h-5 text-black"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 113,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 102,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                text: "RuneBolt",
                                className: "text-xl font-bold bitcoin-gradient",
                                variant: "electric",
                                size: "lg"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 115,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 98,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hidden md:flex items-center gap-6",
                        children: [
                            "Features",
                            "How it Works",
                            "Assets",
                            "Transfer"
                        ].map((item, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].a, {
                                href: `#${item.toLowerCase().replace(/\s+/g, '-')}`,
                                className: "text-sm text-gray-400 hover:text-white transition-colors relative",
                                whileHover: {
                                    y: -2
                                },
                                children: [
                                    item,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                                        className: "absolute -bottom-1 left-0 h-px bg-[#F7931A]",
                                        initial: {
                                            width: 0
                                        },
                                        whileHover: {
                                            width: "100%"
                                        },
                                        transition: {
                                            duration: 0.2
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 127,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, item, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 120,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 118,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                children: connected && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConnectedText"], {
                                    active: connected
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 139,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 138,
                                columnNumber: 13
                            }, this),
                            network === 'testnet' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                                initial: {
                                    opacity: 0,
                                    scale: 0.8
                                },
                                animate: {
                                    opacity: 1,
                                    scale: 1
                                },
                                className: "text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                                children: "Testnet"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 143,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                                onClick: onConnect,
                                whileHover: {
                                    scale: 1.05
                                },
                                whileTap: {
                                    scale: 0.95
                                },
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all", connected ? "bg-green-500/20 text-green-400 border border-green-500/30" : "btn-primary"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 160,
                                        columnNumber: 15
                                    }, this),
                                    connected ? (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateAddress"])(address || "") : "Connect Wallet"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 151,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 137,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 97,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
            lineNumber: 96,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
function Hero({ onConnect }) {
    const [showConnectedText, setShowConnectedText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "relative min-h-screen flex items-center justify-center pt-16 overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HeroBackground"], {}, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 175,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FloatingRunes"], {
                asset: "bitmap"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 176,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: "hidden",
                animate: "visible",
                variants: staggerContainer,
                className: "relative z-10 max-w-5xl mx-auto px-4 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        variants: fadeIn,
                        className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/20 mb-8",
                        whileHover: {
                            scale: 1.05,
                            borderColor: "rgba(247, 147, 26, 0.5)"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                animate: {
                                    rotate: [
                                        0,
                                        360
                                    ]
                                },
                                transition: {
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                    className: "w-4 h-4 text-[#F7931A]"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 188,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 184,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                text: "Lightning Deed Protocol v0.1",
                                variant: "electric",
                                size: "sm"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 190,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 179,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].h1, {
                        variants: fadeIn,
                        className: "text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                text: "Instant",
                                variant: "electric",
                                size: "2xl",
                                className: "bitcoin-gradient"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 194,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block mt-2",
                                children: "Bitcoin"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 195,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block mt-2",
                                children: "Asset Transfers"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 196,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 193,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                        variants: fadeIn,
                        className: "text-xl text-gray-400 mb-8 max-w-2xl mx-auto",
                        children: "Transfer Runes, Ordinals, and Bitmap instantly over Lightning Network. No custodial risk. Pure Bitcoin script magic."
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 199,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        variants: fadeIn,
                        className: "flex flex-col sm:flex-row gap-4 justify-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                                onClick: onConnect,
                                className: "btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4",
                                whileHover: {
                                    scale: 1.05,
                                    boxShadow: "0 0 40px rgba(247, 147, 26, 0.6)"
                                },
                                whileTap: {
                                    scale: 0.95
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                                        className: "w-5 h-5"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 211,
                                        columnNumber: 13
                                    }, this),
                                    "Connect Wallet",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                        className: "w-5 h-5"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 213,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 205,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].a, {
                                href: "https://docs.runebolt.io",
                                target: "_blank",
                                rel: "noopener noreferrer",
                                className: "btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4",
                                whileHover: {
                                    scale: 1.05
                                },
                                whileTap: {
                                    scale: 0.95
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                        className: "w-5 h-5"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 223,
                                        columnNumber: 13
                                    }, this),
                                    "Read Docs"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 215,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 204,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        variants: fadeIn,
                        className: "grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto",
                        children: [
                            {
                                icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"],
                                label: "Transfer Time",
                                value: "< 1 second"
                            },
                            {
                                icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"],
                                label: "Security",
                                value: "Non-custodial"
                            },
                            {
                                icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bitcoin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Bitcoin$3e$__["Bitcoin"],
                                label: "Assets",
                                value: "Runes, Ordinals, Bitmap"
                            }
                        ].map((stat, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$AssetCard3D$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatCard3D"], {
                                label: stat.label,
                                value: stat.value,
                                icon: stat.icon,
                                delay: i * 0.1
                            }, stat.label, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 234,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 228,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 178,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 174,
        columnNumber: 5
    }, this);
}
function Features() {
    const features = [
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"],
            title: "Lightning Fast",
            description: "Transfer any Bitcoin asset in milliseconds. The deed travels at Lightning speed."
        },
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"],
            title: "Non-Custodial",
            description: "Your assets, your keys. RuneBolt never holds your Bitcoin. Smart contracts enforce everything."
        },
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2d$left$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRightLeft$3e$__["ArrowRightLeft"],
            title: "Universal Assets",
            description: "Runes, Ordinals, Bitmap, BRC-20 — if it's on Bitcoin, you can transfer it instantly."
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "features",
        className: "py-24 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EnergyBackground"], {
                variant: "bitmap",
                intensity: "low"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 257,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: "hidden",
                        whileInView: "visible",
                        viewport: {
                            once: true
                        },
                        variants: staggerContainer,
                        className: "text-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].h2, {
                                variants: fadeIn,
                                className: "text-3xl sm:text-4xl font-bold mb-4",
                                children: [
                                    "Why ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                        text: "RuneBolt",
                                        variant: "electric",
                                        size: "xl",
                                        className: "bitcoin-gradient"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 262,
                                        columnNumber: 17
                                    }, this),
                                    "?"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 261,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                                variants: fadeIn,
                                className: "text-gray-400 max-w-2xl mx-auto",
                                children: "The first protocol to enable instant, non-custodial transfers of any Bitcoin asset."
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 264,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 260,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: "hidden",
                        whileInView: "visible",
                        viewport: {
                            once: true
                        },
                        variants: staggerContainer,
                        className: "grid grid-cols-1 md:grid-cols-3 gap-8",
                        children: features.map((feature, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                variants: fadeIn,
                                className: "card group relative overflow-hidden",
                                whileHover: {
                                    y: -10,
                                    transition: {
                                        duration: 0.3
                                    }
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "w-12 h-12 rounded-xl bg-[#F7931A]/10 flex items-center justify-center mb-4",
                                        whileHover: {
                                            scale: 1.1,
                                            rotate: 5,
                                            backgroundColor: "rgba(247, 147, 26, 0.2)"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(feature.icon, {
                                            className: "w-6 h-6 text-[#F7931A]"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 285,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 277,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-xl font-semibold mb-2",
                                        children: feature.title
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 287,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-gray-400",
                                        children: feature.description
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 288,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "absolute inset-0 rounded-2xl pointer-events-none",
                                        initial: {
                                            opacity: 0
                                        },
                                        whileHover: {
                                            opacity: 1
                                        },
                                        style: {
                                            boxShadow: "inset 0 0 30px rgba(247, 147, 26, 0.1)"
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 291,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, feature.title, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 271,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 269,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 259,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 256,
        columnNumber: 5
    }, this);
}
function HowItWorks() {
    const steps = [
        {
            number: "01",
            title: "Deed Lock",
            description: "Lock your asset with a Tapscript hash-lock. Only the recipient with the preimage can claim it."
        },
        {
            number: "02",
            title: "Lightning Transfer",
            description: "Send a Lightning payment carrying the deed key. The preimage unlocks both the payment and the asset."
        },
        {
            number: "03",
            title: "Instant Claim",
            description: "Recipient reveals the preimage to claim the asset on Bitcoin. Settlement in milliseconds."
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "how-it-works",
        className: "py-24 bg-black/50 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EnergyBackground"], {
                variant: "bitmap",
                intensity: "low"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 316,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: "hidden",
                        whileInView: "visible",
                        viewport: {
                            once: true
                        },
                        variants: staggerContainer,
                        className: "text-center mb-16",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].h2, {
                                variants: fadeIn,
                                className: "text-3xl sm:text-4xl font-bold mb-4",
                                children: [
                                    "How ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                        text: "LDP",
                                        variant: "neon",
                                        size: "xl",
                                        className: "bitcoin-gradient"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 321,
                                        columnNumber: 17
                                    }, this),
                                    " Works"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 320,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                                variants: fadeIn,
                                className: "text-gray-400 max-w-2xl mx-auto",
                                children: "The Lightning Deed Protocol uses Bitcoin Script and Lightning HTLCs for atomic transfers."
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 323,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 319,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: "hidden",
                        whileInView: "visible",
                        viewport: {
                            once: true
                        },
                        variants: staggerContainer,
                        className: "grid grid-cols-1 md:grid-cols-3 gap-8",
                        children: steps.map((step, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                variants: fadeIn,
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "card h-full group",
                                        whileHover: {
                                            y: -5,
                                            boxShadow: "0 20px 40px rgba(247, 147, 26, 0.2)"
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                                className: "text-5xl font-bold mb-4",
                                                style: {
                                                    background: "linear-gradient(135deg, #F7931A, #FFD700)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent"
                                                },
                                                whileHover: {
                                                    scale: 1.1
                                                },
                                                children: step.number
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                lineNumber: 338,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xl font-semibold mb-2",
                                                children: step.title
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                lineNumber: 349,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-gray-400",
                                                children: step.description
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                lineNumber: 350,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 331,
                                        columnNumber: 15
                                    }, this),
                                    index < steps.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10",
                                        animate: {
                                            x: [
                                                0,
                                                5,
                                                0
                                            ]
                                        },
                                        transition: {
                                            duration: 1.5,
                                            repeat: Infinity
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRight$3e$__["ChevronRight"], {
                                            className: "w-8 h-8 text-[#F7931A]"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 358,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 353,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, step.number, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 330,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 328,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 318,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 315,
        columnNumber: 5
    }, this);
}
function AssetShowcase() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "assets",
        className: "py-24 relative",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: "hidden",
                    whileInView: "visible",
                    viewport: {
                        once: true
                    },
                    variants: staggerContainer,
                    className: "text-center mb-16",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].h2, {
                            variants: fadeIn,
                            className: "text-3xl sm:text-4xl font-bold mb-4",
                            children: [
                                "Supported ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                    text: "Assets",
                                    variant: "electric",
                                    size: "xl",
                                    className: "bitcoin-gradient"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 381,
                                    columnNumber: 23
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 380,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                            variants: fadeIn,
                            className: "text-gray-400 max-w-2xl mx-auto",
                            children: "Transfer any of these assets instantly via the Lightning Deed Protocol"
                        }, void 0, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 383,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                    lineNumber: 373,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-24",
                    children: ASSETS.map((asset, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AssetSection, {
                            asset: asset,
                            index: index
                        }, asset.id, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 390,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                    lineNumber: 388,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
            lineNumber: 372,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 371,
        columnNumber: 5
    }, this);
}
function AssetSection({ asset, index }) {
    const isEven = index % 2 === 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            x: isEven ? -50 : 50
        },
        whileInView: {
            opacity: 1,
            x: 0
        },
        viewport: {
            once: true
        },
        transition: {
            duration: 0.6
        },
        className: "relative py-12",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AssetSectionBackground"], {
                asset: asset.id
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 409,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `relative z-10 flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: "flex-1 relative",
                        whileHover: {
                            scale: 1.02
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            className: "w-64 h-64 mx-auto rounded-3xl flex items-center justify-center text-9xl relative",
                            style: {
                                background: `linear-gradient(135deg, ${asset.color}20, ${asset.color}10)`,
                                border: `2px solid ${asset.color}40`,
                                boxShadow: `0 0 60px ${asset.color}30, inset 0 0 60px ${asset.color}10`
                            },
                            animate: {
                                y: [
                                    0,
                                    -10,
                                    0
                                ],
                                rotate: [
                                    0,
                                    2,
                                    -2,
                                    0
                                ]
                            },
                            transition: {
                                duration: 4,
                                repeat: Infinity,
                                ease: "easeInOut"
                            },
                            children: [
                                asset.emoji,
                                [
                                    ...Array(3)
                                ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                        className: "absolute w-3 h-3 rounded-full",
                                        style: {
                                            backgroundColor: asset.color,
                                            boxShadow: `0 0 10px ${asset.color}`
                                        },
                                        animate: {
                                            rotate: 360
                                        },
                                        transition: {
                                            duration: 3 + i,
                                            repeat: Infinity,
                                            ease: "linear"
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                            style: {
                                                position: "absolute",
                                                left: 140 + i * 20,
                                                top: 0
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 450,
                                            columnNumber: 17
                                        }, this)
                                    }, i, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 434,
                                        columnNumber: 15
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 417,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 413,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 text-center lg:text-left",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0,
                                y: 20
                            },
                            whileInView: {
                                opacity: 1,
                                y: 0
                            },
                            viewport: {
                                once: true
                            },
                            transition: {
                                delay: 0.2
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-4xl font-bold mb-2",
                                    style: {
                                        color: asset.color
                                    },
                                    children: asset.name
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 470,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-400 mb-4",
                                    children: asset.fullName
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 476,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-300 mb-8 text-lg",
                                    children: asset.description
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 477,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-3 gap-4",
                                    children: Object.entries(asset.stats).map(([key, value])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                            className: "p-4 rounded-xl",
                                            style: {
                                                backgroundColor: `${asset.color}10`,
                                                border: `1px solid ${asset.color}20`
                                            },
                                            whileHover: {
                                                scale: 1.05,
                                                boxShadow: `0 0 20px ${asset.color}30`
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-2xl font-bold",
                                                    style: {
                                                        color: asset.color
                                                    },
                                                    children: value
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 494,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-xs text-gray-500 capitalize",
                                                    children: key
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 497,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, key, true, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 482,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 480,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 464,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 463,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 411,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 402,
        columnNumber: 5
    }, this);
}
function WalletModal({ isOpen, onClose, onConnect }) {
    const [wallets, setWallets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [connecting, setConnecting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isOpen) {
            setWallets((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$wallets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getWallets"])());
            setError(null);
        }
    }, [
        isOpen
    ]);
    const handleConnect = async (walletId)=>{
        setConnecting(walletId);
        setError(null);
        try {
            await onConnect(walletId);
            onClose();
        } catch (err) {
            setError(err.message || `Failed to connect to ${walletId}`);
        } finally{
            setConnecting(null);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
        children: isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0
            },
            animate: {
                opacity: 1
            },
            exit: {
                opacity: 0
            },
            className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
            onClick: onClose,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    scale: 0.95,
                    opacity: 0
                },
                animate: {
                    scale: 1,
                    opacity: 1
                },
                exit: {
                    scale: 0.95,
                    opacity: 0
                },
                className: "card w-full max-w-md relative overflow-hidden",
                onClick: (e)=>e.stopPropagation(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        className: "absolute inset-0 rounded-2xl pointer-events-none",
                        animate: {
                            boxShadow: [
                                "inset 0 0 20px rgba(247, 147, 26, 0.2)",
                                "inset 0 0 40px rgba(247, 147, 26, 0.4)",
                                "inset 0 0 20px rgba(247, 147, 26, 0.2)"
                            ]
                        },
                        transition: {
                            duration: 2,
                            repeat: Infinity
                        }
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 553,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-6 relative z-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl font-bold",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                    text: "Connect Wallet",
                                    variant: "electric"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 567,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 566,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: "text-gray-400 hover:text-white",
                                children: "✕"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 569,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 565,
                        columnNumber: 13
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0,
                            y: -10
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        className: "mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                className: "w-4 h-4"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 578,
                                columnNumber: 17
                            }, this),
                            error
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 573,
                        columnNumber: 15
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3 relative z-10",
                        children: wallets.map((wallet, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                                initial: {
                                    opacity: 0,
                                    x: -20
                                },
                                animate: {
                                    opacity: 1,
                                    x: 0
                                },
                                transition: {
                                    delay: i * 0.1
                                },
                                onClick: ()=>handleConnect(wallet.id),
                                disabled: connecting === wallet.id || !wallet.installed,
                                whileHover: wallet.installed ? {
                                    scale: 1.02,
                                    x: 5,
                                    boxShadow: "0 0 30px rgba(247, 147, 26, 0.3)"
                                } : {},
                                whileTap: wallet.installed ? {
                                    scale: 0.98
                                } : {},
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full flex items-center gap-4 p-4 rounded-xl border transition-all", wallet.installed ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#F7931A]/50" : "bg-white/5 opacity-50 cursor-not-allowed border-white/5"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl",
                                        children: wallet.icon
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 605,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 text-left",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "font-medium",
                                                children: wallet.name
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                lineNumber: 607,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm text-gray-500",
                                                children: wallet.description
                                            }, void 0, false, {
                                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                lineNumber: 608,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 606,
                                        columnNumber: 19
                                    }, this),
                                    connecting === wallet.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                                        className: "text-xs px-2 py-1 rounded-full bg-[#F7931A]/20 text-[#F7931A]",
                                        animate: {
                                            opacity: [
                                                1,
                                                0.5,
                                                1
                                            ]
                                        },
                                        transition: {
                                            duration: 1,
                                            repeat: Infinity
                                        },
                                        children: "Connecting..."
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 611,
                                        columnNumber: 21
                                    }, this) : wallet.installed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400",
                                        children: "Installed"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 619,
                                        columnNumber: 21
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: wallet.website,
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 hover:bg-gray-500/30",
                                        children: "Install"
                                    }, void 0, false, {
                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                        lineNumber: 621,
                                        columnNumber: 21
                                    }, this)
                                ]
                            }, wallet.id, true, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 585,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 583,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-4 text-xs text-gray-500 text-center relative z-10",
                        children: [
                            "New to Bitcoin? ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "https://unisat.io",
                                target: "_blank",
                                rel: "noopener noreferrer",
                                className: "text-[#F7931A] hover:underline",
                                children: "Get UniSat Wallet"
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 635,
                                columnNumber: 31
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                        lineNumber: 634,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 545,
                columnNumber: 11
            }, this)
        }, void 0, false, {
            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
            lineNumber: 538,
            columnNumber: 9
        }, this)
    }, void 0, false, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 536,
        columnNumber: 5
    }, this);
}
function Home() {
    const [connected, setConnected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [walletModalOpen, setWalletModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [connection, setConnection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [network, setNetwork] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('testnet');
    const [nodeStatus, setNodeStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Visual effect triggers
    const [connectLightning, setConnectLightning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [transferLightning, setTransferLightning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [successLightning, setSuccessLightning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [particleTrigger, setParticleTrigger] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [confettiActive, setConfettiActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [connectedTextActive, setConnectedTextActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Check for existing connection on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem('runebolt-connection');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConnection(parsed);
                setConnected(true);
                setNetwork(parsed.network === 'mainnet' ? 'mainnet' : 'testnet');
            } catch (e) {
                localStorage.removeItem('runebolt-connection');
            }
        }
        // Load node status
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getNodeInfo"])().then(setNodeStatus).catch(console.error);
    }, []);
    const handleConnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setWalletModalOpen(true);
    }, []);
    const handleWalletSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (walletType)=>{
        // Trigger connect effects
        setConnectLightning(true);
        setTimeout(()=>setConnectLightning(false), 800);
        const conn = await (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$wallets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectWallet"])(walletType);
        setConnection(conn);
        setConnected(true);
        setNetwork(conn.network === 'mainnet' ? 'mainnet' : 'testnet');
        localStorage.setItem('runebolt-connection', JSON.stringify(conn));
        // Trigger success effects
        setTimeout(()=>{
            setConnectedTextActive(true);
            setParticleTrigger("bitmap");
            setConfettiActive(true);
            setTimeout(()=>{
                setConfettiActive(false);
                setParticleTrigger(null);
            }, 2000);
        }, 800);
    }, []);
    const handleDisconnect = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (connection) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$lib$2f$wallets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["disconnectWallet"])(connection.wallet);
        }
        setConnected(false);
        setConnection(null);
        setConnectedTextActive(false);
        localStorage.removeItem('runebolt-connection');
    }, [
        connection
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "min-h-screen bg-black relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$EnergyBackground$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EnergyBackground"], {
                variant: "bitmap",
                intensity: "low"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 717,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$LightningEffects$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LightningEffects"], {
                autoTrigger: true,
                intensity: "low"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 720,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$LightningEffects$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConnectLightning"], {
                active: connectLightning
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 721,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$LightningEffects$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TransferLightning"], {
                active: transferLightning,
                asset: "bitmap"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 722,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$LightningEffects$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SuccessLightning"], {
                active: successLightning,
                asset: "bitmap"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 723,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ParticleSystem"], {
                trigger: particleTrigger,
                asset: "bitmap",
                intensity: "high"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 724,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$ParticleSystem$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ConfettiExplosion"], {
                active: confettiActive,
                asset: "bitmap"
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 725,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Navbar, {
                connected: connected,
                address: connection?.account.address,
                onConnect: handleConnect,
                network: network
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 727,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Hero, {
                onConnect: handleConnect
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 733,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Features, {}, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 734,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HowItWorks, {}, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 735,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AssetShowcase, {}, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 736,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                id: "transfer",
                className: "py-24 relative",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: "hidden",
                            whileInView: "visible",
                            viewport: {
                                once: true
                            },
                            variants: staggerContainer,
                            className: "text-center mb-12",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].h2, {
                                    variants: fadeIn,
                                    className: "text-3xl sm:text-4xl font-bold mb-4",
                                    children: [
                                        "Your ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                            text: "Assets",
                                            variant: "electric",
                                            size: "xl",
                                            className: "bitcoin-gradient"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 748,
                                            columnNumber: 20
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 747,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                                    variants: fadeIn,
                                    className: "text-gray-400 max-w-2xl mx-auto",
                                    children: "Manage and transfer your Bitcoin assets instantly via Lightning"
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 750,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 740,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: "hidden",
                            whileInView: "visible",
                            viewport: {
                                once: true
                            },
                            variants: fadeIn,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$AssetDashboard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AssetDashboard"], {
                                connected: connected,
                                address: connection?.account.address || "",
                                onConnect: handleConnect,
                                network: network
                            }, void 0, false, {
                                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                lineNumber: 761,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 755,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                    lineNumber: 739,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 738,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                className: "py-12 border-t border-white/5 relative z-10",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-1 md:grid-cols-4 gap-8 mb-8",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                    initial: {
                                        opacity: 0,
                                        y: 20
                                    },
                                    whileInView: {
                                        opacity: 1,
                                        y: 0
                                    },
                                    viewport: {
                                        once: true
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 mb-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                                        className: "w-5 h-5 text-black"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 781,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 780,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$app$2f$components$2f$GlitchText$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GlitchText"], {
                                                    text: "RuneBolt",
                                                    variant: "electric",
                                                    size: "lg",
                                                    className: "text-xl font-bold bitcoin-gradient"
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 783,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 779,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-500",
                                            children: "The first non-custodial, instant transfer protocol for all Bitcoin assets."
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 785,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 774,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                    initial: {
                                        opacity: 0,
                                        y: 20
                                    },
                                    whileInView: {
                                        opacity: 1,
                                        y: 0
                                    },
                                    viewport: {
                                        once: true
                                    },
                                    transition: {
                                        delay: 0.1
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "font-semibold mb-4",
                                            children: "Protocol"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 795,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                            className: "space-y-2 text-sm text-gray-500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "#",
                                                        className: "hover:text-white transition-colors",
                                                        children: "Documentation"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 797,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 797,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "#",
                                                        className: "hover:text-white transition-colors",
                                                        children: "GitHub"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 798,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 798,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 796,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 789,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                    initial: {
                                        opacity: 0,
                                        y: 20
                                    },
                                    whileInView: {
                                        opacity: 1,
                                        y: 0
                                    },
                                    viewport: {
                                        once: true
                                    },
                                    transition: {
                                        delay: 0.2
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "font-semibold mb-4",
                                            children: "Resources"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 807,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                            className: "space-y-2 text-sm text-gray-500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "#",
                                                        className: "hover:text-white transition-colors",
                                                        children: "Lightning Network"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 809,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 809,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "#",
                                                        className: "hover:text-white transition-colors",
                                                        children: "Bitcoin Runes"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 810,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 810,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: "#",
                                                        className: "hover:text-white transition-colors",
                                                        children: "Bitmap"
                                                    }, void 0, false, {
                                                        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                        lineNumber: 811,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 811,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 808,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 801,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                    initial: {
                                        opacity: 0,
                                        y: 20
                                    },
                                    whileInView: {
                                        opacity: 1,
                                        y: 0
                                    },
                                    viewport: {
                                        once: true
                                    },
                                    transition: {
                                        delay: 0.3
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                            className: "font-semibold mb-4",
                                            children: "Status"
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 820,
                                            columnNumber: 15
                                        }, this),
                                        nodeStatus ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-sm text-gray-500 space-y-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "flex items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].span, {
                                                            className: "w-2 h-2 rounded-full bg-green-500",
                                                            animate: {
                                                                scale: [
                                                                    1,
                                                                    1.2,
                                                                    1
                                                                ]
                                                            },
                                                            transition: {
                                                                duration: 2,
                                                                repeat: Infinity
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                            lineNumber: 824,
                                                            columnNumber: 21
                                                        }, this),
                                                        "Node: ",
                                                        nodeStatus.alias
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 823,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: [
                                                        "Channels: ",
                                                        nodeStatus.channels
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 831,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    children: [
                                                        "Block: ",
                                                        nodeStatus.blockHeight
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                                    lineNumber: 832,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 822,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-600",
                                            children: "Loading node status..."
                                        }, void 0, false, {
                                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                            lineNumber: 835,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 814,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 773,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "© 2026 RuneBolt. Built on Bitcoin."
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 840,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    children: "Non-custodial. Open source. MIT License."
                                }, void 0, false, {
                                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                                    lineNumber: 841,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                            lineNumber: 839,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                    lineNumber: 772,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 771,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$openclaw$2f$workspace$2f$projects$2f$runebolt$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(WalletModal, {
                isOpen: walletModalOpen,
                onClose: ()=>setWalletModalOpen(false),
                onConnect: handleWalletSelect
            }, void 0, false, {
                fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
                lineNumber: 846,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/.openclaw/workspace/projects/runebolt/frontend/app/page.tsx",
        lineNumber: 715,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5cdeba4b._.js.map
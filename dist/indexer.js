"use strict";
/**
 * Runes Indexer — Unisat Open API Integration
 * Fetches real Runes, Ordinals, and Bitmap balances for any address
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRunesBalances = fetchRunesBalances;
exports.fetchOrdinals = fetchOrdinals;
exports.fetchBitmaps = fetchBitmaps;
exports.getAssetBalance = getAssetBalance;
exports.verifyAssetOwnership = verifyAssetOwnership;
exports.clearAddressCache = clearAddressCache;
const axios_1 = __importDefault(require("axios"));
const UNISAT_API_BASE = 'https://open-api.unisat.io/v1';
const CACHE_TTL_MS = 30000; // 30 seconds
const cache = new Map();
function getCacheKey(address, type) {
    return `${type}:${address}`;
}
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}
/**
 * Fetch Runes balances for an address
 */
async function fetchRunesBalances(address, network = 'mainnet') {
    const cacheKey = getCacheKey(address, 'runes');
    const cached = getCached(cacheKey);
    if (cached)
        return cached;
    try {
        const baseUrl = network === 'testnet'
            ? 'https://open-api.unisat.io/v1'
            : UNISAT_API_BASE;
        const response = await axios_1.default.get(`${baseUrl}/indexer/address/${address}/runes/balance`, {
            headers: {
                'Accept': 'application/json',
            },
            timeout: 10000,
        });
        if (response.data?.code !== 0 || !response.data?.data?.detail) {
            return [];
        }
        const balances = response.data.data.detail;
        setCache(cacheKey, balances);
        return balances;
    }
    catch (error) {
        // 404 means no runes found or invalid endpoint - return empty
        if (error.response?.status === 404) {
            return [];
        }
        console.error('Failed to fetch Runes balances:', error.message || error);
        return [];
    }
}
/**
 * Fetch Ordinals inscriptions for an address
 */
async function fetchOrdinals(address, network = 'mainnet') {
    const cacheKey = getCacheKey(address, 'ordinals');
    const cached = getCached(cacheKey);
    if (cached)
        return cached;
    try {
        const baseUrl = network === 'testnet'
            ? 'https://open-api.unisat.io/v1'
            : UNISAT_API_BASE;
        const response = await axios_1.default.get(`${baseUrl}/indexer/address/${address}/inscription-data`, {
            headers: {
                'Accept': 'application/json',
            },
            timeout: 10000,
        });
        if (response.data?.code !== 0 || !response.data?.data?.inscription) {
            return [];
        }
        const ordinals = response.data.data.inscription.map((item) => ({
            inscriptionId: item.inscriptionId,
            inscriptionNumber: item.inscriptionNumber,
            contentType: item.contentType || 'unknown',
            contentLength: item.contentLength || 0,
        }));
        setCache(cacheKey, ordinals);
        return ordinals;
    }
    catch (error) {
        // 404 means no ordinals found - return empty
        if (error.response?.status === 404) {
            return [];
        }
        console.error('Failed to fetch Ordinals:', error.message || error);
        return [];
    }
}
/**
 * Fetch Bitmap assets (inscriptions with block number format)
 */
async function fetchBitmaps(address, network = 'mainnet') {
    try {
        const ordinals = await fetchOrdinals(address, network);
        // Filter for Bitmap inscriptions (they follow a specific pattern)
        // Bitmap inscriptions typically have content like "720143.bitmap" or similar
        const bitmaps = [];
        for (const ordinal of ordinals) {
            // Check if this looks like a Bitmap inscription
            // Bitmap inscriptions have specific content type or inscription number patterns
            if (ordinal.inscriptionId.includes('bitmap') ||
                ordinal.contentType?.includes('bitmap') ||
                ordinal.contentType?.includes('text/plain')) {
                // Extract block number from inscription ID or fetch content
                const blockMatch = ordinal.inscriptionId.match(/(\d+)\.bitmap/);
                if (blockMatch) {
                    bitmaps.push({
                        blockNumber: parseInt(blockMatch[1]),
                        inscriptionId: ordinal.inscriptionId,
                    });
                }
            }
        }
        return bitmaps;
    }
    catch (error) {
        console.error('Failed to fetch Bitmaps:', error);
        return [];
    }
}
/**
 * Get complete asset balance for an address
 */
async function getAssetBalance(address, network = 'mainnet') {
    const [runes, ordinals, bitmaps] = await Promise.all([
        fetchRunesBalances(address, network),
        fetchOrdinals(address, network),
        fetchBitmaps(address, network),
    ]);
    return {
        address,
        runes: runes.map(r => ({
            id: r.runeid,
            name: r.rune,
            symbol: r.symbol,
            amount: parseInt(r.balance) / Math.pow(10, r.divisibility),
            decimals: r.divisibility,
        })),
        ordinals: ordinals.map(o => ({
            id: o.inscriptionId,
            inscriptionNumber: o.inscriptionNumber,
            contentType: o.contentType,
        })),
        bitmaps: bitmaps,
    };
}
/**
 * Validate if an address owns a specific asset
 */
async function verifyAssetOwnership(address, assetType, assetId, minAmount = 1, network = 'mainnet') {
    const balance = await getAssetBalance(address, network);
    switch (assetType) {
        case 'rune':
            return balance.runes.some(r => r.id === assetId && r.amount >= minAmount);
        case 'ordinal':
            return balance.ordinals.some(o => o.id === assetId);
        case 'bitmap':
            return balance.bitmaps.some(b => b.blockNumber.toString() === assetId);
        default:
            return false;
    }
}
/**
 * Clear cache for an address (useful after transactions)
 */
function clearAddressCache(address) {
    cache.delete(getCacheKey(address, 'runes'));
    cache.delete(getCacheKey(address, 'ordinals'));
}
//# sourceMappingURL=indexer.js.map
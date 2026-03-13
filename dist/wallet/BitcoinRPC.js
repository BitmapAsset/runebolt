"use strict";
/**
 * BitcoinRPC — Simple Bitcoin RPC client with mempool.space REST API fallback.
 *
 * Supports both bitcoin-core RPC (localhost) and mempool.space public API.
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
exports.BitcoinRPC = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
/**
 * Bitcoin RPC client with dual-backend support.
 * Uses bitcoin-core JSON-RPC or mempool.space REST API.
 */
class BitcoinRPC {
    backend;
    rpcUrl;
    rpcUser;
    rpcPass;
    mempoolUrl;
    constructor(config) {
        this.backend = config.backend;
        this.rpcUrl = config.rpcUrl || 'http://localhost:8332';
        this.rpcUser = config.rpcUser || '';
        this.rpcPass = config.rpcPass || '';
        this.mempoolUrl = config.mempoolUrl || 'https://mempool.space';
    }
    /**
     * Creates a BitcoinRPC instance using mempool.space as backend (no node required).
     */
    static mempool(baseUrl) {
        return new BitcoinRPC({ backend: 'mempool', mempoolUrl: baseUrl });
    }
    /**
     * Creates a BitcoinRPC instance using bitcoin-core RPC.
     */
    static bitcoind(rpcUrl, rpcUser, rpcPass) {
        return new BitcoinRPC({ backend: 'bitcoind', rpcUrl, rpcUser, rpcPass });
    }
    /** Fetch mempool transaction IDs */
    async getMempool() {
        if (this.backend === 'mempool') {
            return this.mempoolGet('/api/mempool/txids');
        }
        return this.rpcCall('getrawmempool');
    }
    /** Get raw transaction data */
    async getRawTransaction(txid) {
        if (this.backend === 'mempool') {
            return this.mempoolGet(`/api/tx/${txid}`);
        }
        return this.rpcCall('getrawtransaction', [txid, true]);
    }
    /** Get raw transaction hex */
    async getRawTransactionHex(txid) {
        if (this.backend === 'mempool') {
            return this.mempoolGet(`/api/tx/${txid}/hex`);
        }
        return this.rpcCall('getrawtransaction', [txid, false]);
    }
    /** Broadcast a raw transaction hex to the network */
    async broadcastTx(rawTxHex) {
        if (this.backend === 'mempool') {
            return this.mempoolPost('/api/tx', rawTxHex);
        }
        return this.rpcCall('sendrawtransaction', [rawTxHex]);
    }
    /** Estimate fee rate in sat/vB for target confirmation blocks */
    async estimateFee(targetBlocks = 6) {
        if (this.backend === 'mempool') {
            const fees = await this.mempoolGet('/api/v1/fees/recommended');
            if (targetBlocks <= 1)
                return fees.fastestFee;
            if (targetBlocks <= 3)
                return fees.halfHourFee;
            if (targetBlocks <= 6)
                return fees.hourFee;
            return fees.minimumFee;
        }
        const result = await this.rpcCall('estimatesmartfee', [targetBlocks]);
        if (result.feerate) {
            // Convert BTC/kB to sat/vB
            return Math.ceil(result.feerate * 100_000);
        }
        return 2; // fallback: 2 sat/vB
    }
    /** Get block hash by height */
    async getBlockHash(height) {
        if (this.backend === 'mempool') {
            return this.mempoolGet(`/api/block-height/${height}`);
        }
        return this.rpcCall('getblockhash', [height]);
    }
    /** Get full block data by hash */
    async getBlock(hash) {
        if (this.backend === 'mempool') {
            const block = await this.mempoolGet(`/api/block/${hash}`);
            const txids = await this.mempoolGet(`/api/block/${hash}/txids`);
            return {
                hash: block.id,
                height: block.height,
                tx: txids,
                previousblockhash: block.previousblockhash,
                time: block.timestamp,
            };
        }
        return this.rpcCall('getblock', [hash, 1]);
    }
    /** Get current blockchain tip height */
    async getBlockCount() {
        if (this.backend === 'mempool') {
            return this.mempoolGet('/api/blocks/tip/height');
        }
        return this.rpcCall('getblockcount');
    }
    /** Get transactions for a specific address */
    async getAddressTransactions(address) {
        if (this.backend === 'mempool') {
            return this.mempoolGet(`/api/address/${address}/txs`);
        }
        throw new Error('getAddressTransactions not supported via bitcoind RPC — use mempool backend');
    }
    /** Get unconfirmed (mempool) transactions for a specific address */
    async getAddressMempoolTxs(address) {
        if (this.backend === 'mempool') {
            return this.mempoolGet(`/api/address/${address}/txs/mempool`);
        }
        throw new Error('getAddressMempoolTxs not supported via bitcoind RPC — use mempool backend');
    }
    // ── Internal: Bitcoin Core JSON-RPC ──
    async rpcCall(method, params = []) {
        const body = JSON.stringify({
            jsonrpc: '1.0',
            id: Date.now(),
            method,
            params,
        });
        const url = new URL(this.rpcUrl);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;
        return new Promise((resolve, reject) => {
            const req = transport.request({
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 8332),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(`${this.rpcUser}:${this.rpcPass}`).toString('base64'),
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error)
                            reject(new Error(`RPC error: ${json.error.message}`));
                        else
                            resolve(json.result);
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse RPC response: ${data.slice(0, 200)}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
    // ── Internal: mempool.space REST API ──
    async mempoolGet(path) {
        const url = `${this.mempoolUrl}${path}`;
        const transport = url.startsWith('https') ? https : http;
        return new Promise((resolve, reject) => {
            transport.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        // Some endpoints return plain text (e.g., block hash, tx hex)
                        const contentType = res.headers['content-type'] || '';
                        if (contentType.includes('application/json')) {
                            resolve(JSON.parse(data));
                        }
                        else {
                            // Try JSON first, fall back to raw string
                            try {
                                resolve(JSON.parse(data));
                            }
                            catch {
                                resolve(data);
                            }
                        }
                    }
                    catch (e) {
                        reject(new Error(`Failed to parse mempool response: ${data.slice(0, 200)}`));
                    }
                });
            }).on('error', reject);
        });
    }
    async mempoolPost(path, body) {
        const url = new URL(`${this.mempoolUrl}${path}`);
        const isHttps = url.protocol === 'https:';
        const transport = isHttps ? https : http;
        return new Promise((resolve, reject) => {
            const req = transport.request({
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Length': Buffer.byteLength(body),
                },
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`Broadcast failed (${res.statusCode}): ${data}`));
                    }
                    else {
                        resolve(data.trim());
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
exports.BitcoinRPC = BitcoinRPC;
//# sourceMappingURL=BitcoinRPC.js.map
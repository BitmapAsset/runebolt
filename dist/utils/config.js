"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
function env(key, fallback) {
    const val = process.env[key] ?? fallback;
    if (val === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return val;
}
function loadConfig() {
    const homeDir = process.env.HOME || '';
    const dataDir = env('RUNEBOLT_DATA_DIR', path_1.default.join(homeDir, '.runebolt'));
    return {
        network: env('BITCOIN_NETWORK', 'regtest'),
        bitcoin: {
            rpcUrl: env('BITCOIN_RPC_URL', 'http://localhost:18443'),
            rpcUser: env('BITCOIN_RPC_USER', 'bitcoin'),
            rpcPass: env('BITCOIN_RPC_PASS', 'bitcoin'),
        },
        lnd: {
            host: env('LND_HOST', 'localhost'),
            port: parseInt(env('LND_PORT', '10009')),
            tlsCertPath: env('LND_TLS_CERT', path_1.default.join(homeDir, '.lnd/tls.cert')),
            macaroonPath: env('LND_MACAROON', path_1.default.join(homeDir, '.lnd/data/chain/bitcoin/regtest/admin.macaroon')),
        },
        tapd: {
            host: env('TAPD_HOST', 'localhost'),
            port: parseInt(env('TAPD_PORT', '10029')),
            tlsCertPath: env('TAPD_TLS_CERT', path_1.default.join(homeDir, '.tapd/tls.cert')),
            macaroonPath: env('TAPD_MACAROON', path_1.default.join(homeDir, '.tapd/data/regtest/admin.macaroon')),
        },
        indexer: {
            ordApiUrl: env('ORD_API_URL', 'http://localhost:80'),
        },
        wallet: {
            dataDir,
            walletFile: path_1.default.join(dataDir, 'wallet.enc'),
            auditLogFile: path_1.default.join(dataDir, 'audit.log'),
            unlockTimeoutMs: parseInt(env('WALLET_UNLOCK_TIMEOUT_MS', '600000')),
            maxUnlockAttempts: parseInt(env('WALLET_MAX_UNLOCK_ATTEMPTS', '5')),
            lockoutDurationMs: parseInt(env('WALLET_LOCKOUT_DURATION_MS', '300000')),
        },
        server: {
            port: parseInt(env('SERVER_PORT', '3000')),
            host: env('SERVER_HOST', '127.0.0.1'),
            corsOrigins: env('CORS_ORIGINS', 'http://localhost:3000').split(','),
        },
    };
}
//# sourceMappingURL=config.js.map
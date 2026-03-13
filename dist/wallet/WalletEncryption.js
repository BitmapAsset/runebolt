"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletEncryption = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const argon2_1 = __importDefault(require("argon2"));
const logger_1 = require("../utils/logger");
const security_1 = require("../security");
const log = (0, logger_1.createLogger)('WalletEncryption');
const WALLET_VERSION = 1;
const ARGON2_TIME_COST = 3;
const ARGON2_MEMORY_COST = 65536; // 64MB
const ARGON2_PARALLELISM = 4;
const SALT_LENGTH = 32;
class WalletEncryption {
    /**
     * Encrypt wallet data (xprv) with password using argon2id + AES-256-GCM.
     */
    static async encrypt(data, password) {
        return security_1.MemoryGuard.withGuard(async (guard) => {
            const salt = security_1.CryptoUtils.secureRandom(SALT_LENGTH);
            // Derive encryption key using argon2id
            const keyBuffer = await argon2_1.default.hash(password, {
                type: argon2_1.default.argon2id,
                salt,
                timeCost: ARGON2_TIME_COST,
                memoryCost: ARGON2_MEMORY_COST,
                parallelism: ARGON2_PARALLELISM,
                hashLength: 32,
                raw: true,
            });
            const key = Buffer.from(keyBuffer);
            guard.track(key);
            const plaintext = Buffer.from(data, 'utf-8');
            guard.track(plaintext);
            const { iv, ciphertext, tag } = security_1.CryptoUtils.encrypt(plaintext, key);
            return {
                version: WALLET_VERSION,
                salt,
                iv,
                ciphertext,
                tag,
                argon2Params: {
                    timeCost: ARGON2_TIME_COST,
                    memoryCost: ARGON2_MEMORY_COST,
                    parallelism: ARGON2_PARALLELISM,
                },
            };
        });
    }
    /**
     * Decrypt wallet data with password.
     */
    static async decrypt(wallet, password) {
        return security_1.MemoryGuard.withGuard(async (guard) => {
            const keyBuffer = await argon2_1.default.hash(password, {
                type: argon2_1.default.argon2id,
                salt: wallet.salt,
                timeCost: wallet.argon2Params.timeCost,
                memoryCost: wallet.argon2Params.memoryCost,
                parallelism: wallet.argon2Params.parallelism,
                hashLength: 32,
                raw: true,
            });
            const key = Buffer.from(keyBuffer);
            guard.track(key);
            const plaintext = security_1.CryptoUtils.decrypt(wallet.ciphertext, key, wallet.iv, wallet.tag);
            guard.track(plaintext);
            return plaintext.toString('utf-8');
        });
    }
    /**
     * Save encrypted wallet to disk.
     */
    static save(wallet, filePath) {
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const serialized = JSON.stringify({
            version: wallet.version,
            salt: wallet.salt.toString('hex'),
            iv: wallet.iv.toString('hex'),
            ciphertext: wallet.ciphertext.toString('hex'),
            tag: wallet.tag.toString('hex'),
            argon2Params: wallet.argon2Params,
        });
        fs_1.default.writeFileSync(filePath, serialized, { mode: 0o600 });
        log.info({ path: filePath }, 'Wallet file saved');
    }
    /**
     * Load encrypted wallet from disk.
     */
    static load(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`Wallet file not found: ${filePath}`);
        }
        const raw = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        return {
            version: raw.version,
            salt: Buffer.from(raw.salt, 'hex'),
            iv: Buffer.from(raw.iv, 'hex'),
            ciphertext: Buffer.from(raw.ciphertext, 'hex'),
            tag: Buffer.from(raw.tag, 'hex'),
            argon2Params: raw.argon2Params,
        };
    }
    /**
     * Check if a wallet file exists.
     */
    static exists(filePath) {
        return fs_1.default.existsSync(filePath);
    }
}
exports.WalletEncryption = WalletEncryption;
//# sourceMappingURL=WalletEncryption.js.map
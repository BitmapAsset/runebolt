"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoUtils = void 0;
const crypto_1 = __importDefault(require("crypto"));
class CryptoUtils {
    /**
     * Constant-time comparison to prevent timing attacks.
     */
    static timingSafeEqual(a, b) {
        if (a.length !== b.length) {
            // Compare against dummy to maintain constant time even on length mismatch
            const dummy = Buffer.alloc(a.length);
            crypto_1.default.timingSafeEqual(a, dummy);
            return false;
        }
        return crypto_1.default.timingSafeEqual(a, b);
    }
    static secureRandom(bytes) {
        return crypto_1.default.randomBytes(bytes);
    }
    static sha256(data) {
        return crypto_1.default.createHash('sha256').update(data).digest();
    }
    static doubleSha256(data) {
        return CryptoUtils.sha256(CryptoUtils.sha256(data));
    }
    static hmacSha256(key, data) {
        return crypto_1.default.createHmac('sha256', key).update(data).digest();
    }
    /**
     * AES-256-GCM encryption.
     */
    static encrypt(plaintext, key) {
        const iv = crypto_1.default.randomBytes(12);
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { iv, ciphertext, tag };
    }
    /**
     * AES-256-GCM decryption.
     */
    static decrypt(ciphertext, key, iv, tag) {
        const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }
    /**
     * Zero out a buffer to prevent secrets lingering in memory.
     */
    static zeroBuffer(buf) {
        buf.fill(0);
    }
}
exports.CryptoUtils = CryptoUtils;
//# sourceMappingURL=CryptoUtils.js.map
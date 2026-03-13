export declare class CryptoUtils {
    /**
     * Constant-time comparison to prevent timing attacks.
     */
    static timingSafeEqual(a: Buffer, b: Buffer): boolean;
    static secureRandom(bytes: number): Buffer;
    static sha256(data: Buffer): Buffer;
    static doubleSha256(data: Buffer): Buffer;
    static hmacSha256(key: Buffer, data: Buffer): Buffer;
    /**
     * AES-256-GCM encryption.
     */
    static encrypt(plaintext: Buffer, key: Buffer): {
        iv: Buffer;
        ciphertext: Buffer;
        tag: Buffer;
    };
    /**
     * AES-256-GCM decryption.
     */
    static decrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer;
    /**
     * Zero out a buffer to prevent secrets lingering in memory.
     */
    static zeroBuffer(buf: Buffer): void;
}
//# sourceMappingURL=CryptoUtils.d.ts.map
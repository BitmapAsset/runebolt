import { EncryptedWallet } from '../types';
export declare class WalletEncryption {
    /**
     * Encrypt wallet data (xprv) with password using argon2id + AES-256-GCM.
     */
    static encrypt(data: string, password: string): Promise<EncryptedWallet>;
    /**
     * Decrypt wallet data with password.
     */
    static decrypt(wallet: EncryptedWallet, password: string): Promise<string>;
    /**
     * Save encrypted wallet to disk.
     */
    static save(wallet: EncryptedWallet, filePath: string): void;
    /**
     * Load encrypted wallet from disk.
     */
    static load(filePath: string): EncryptedWallet;
    /**
     * Check if a wallet file exists.
     */
    static exists(filePath: string): boolean;
}
//# sourceMappingURL=WalletEncryption.d.ts.map
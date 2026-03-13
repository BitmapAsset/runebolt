import { BitcoinNetwork, WalletAddress } from '../types';
export declare class KeyManager {
    private masterKey;
    private readonly network;
    private readonly networkName;
    constructor(network: BitcoinNetwork);
    /**
     * Generate a new 24-word BIP-39 mnemonic.
     * The mnemonic is returned ONCE - caller must store it securely.
     */
    generateMnemonic(): string;
    /**
     * Initialize from mnemonic. The mnemonic is used to derive the master key,
     * then should be zeroed from memory by the caller.
     */
    initFromMnemonic(mnemonic: string, passphrase?: string): Promise<void>;
    /**
     * Initialize from serialized xprv (for wallet file loading).
     */
    initFromXprv(xprv: string): void;
    /**
     * Export xprv for encrypted storage. Returns it and caller must handle securely.
     */
    exportXprv(): string;
    /**
     * Get master fingerprint (safe to expose).
     */
    getFingerprint(): string;
    /**
     * Derive a Taproot (BIP-86) address: m/86'/0'/0'/0/index
     */
    deriveTaprootAddress(index: number): WalletAddress;
    /**
     * Derive a segwit (BIP-84) address: m/84'/0'/0'/0/index
     */
    deriveSegwitAddress(index: number): WalletAddress;
    /**
     * Get the keypair for signing at a given derivation path.
     * Returns the ECPair. Caller MUST use MemoryGuard to track the private key.
     */
    getSigningKey(derivationPath: string): {
        privateKey: Buffer;
        publicKey: Buffer;
    };
    /**
     * Get x-only public key for Taproot at given path.
     */
    getTaprootPubkey(derivationPath: string): Buffer;
    /**
     * Lock the wallet - zero the master key from memory.
     */
    lock(): void;
    isUnlocked(): boolean;
    private ensureUnlocked;
}
//# sourceMappingURL=KeyManager.d.ts.map
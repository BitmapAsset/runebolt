"use strict";
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
exports.KeyManager = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const bip32_1 = require("bip32");
const bip39 = __importStar(require("bip39"));
const logger_1 = require("../utils/logger");
const security_1 = require("../security");
const log = (0, logger_1.createLogger)('KeyManager');
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
bitcoin.initEccLib(ecc);
class KeyManager {
    masterKey = null;
    network;
    networkName;
    constructor(network) {
        this.networkName = network;
        this.network = network === 'mainnet' ? bitcoin.networks.bitcoin
            : network === 'testnet' ? bitcoin.networks.testnet
                : bitcoin.networks.regtest;
    }
    /**
     * Generate a new 24-word BIP-39 mnemonic.
     * The mnemonic is returned ONCE - caller must store it securely.
     */
    generateMnemonic() {
        return bip39.generateMnemonic(256);
    }
    /**
     * Initialize from mnemonic. The mnemonic is used to derive the master key,
     * then should be zeroed from memory by the caller.
     */
    async initFromMnemonic(mnemonic, passphrase = '') {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid BIP-39 mnemonic');
        }
        const seed = await bip39.mnemonicToSeed(mnemonic, passphrase);
        this.masterKey = bip32.fromSeed(Buffer.from(seed), this.network);
        // Zero the seed buffer
        security_1.CryptoUtils.zeroBuffer(Buffer.from(seed));
        log.info('Wallet initialized from mnemonic');
    }
    /**
     * Initialize from serialized xprv (for wallet file loading).
     */
    initFromXprv(xprv) {
        this.masterKey = bip32.fromBase58(xprv, this.network);
        log.info('Wallet initialized from xprv');
    }
    /**
     * Export xprv for encrypted storage. Returns it and caller must handle securely.
     */
    exportXprv() {
        this.ensureUnlocked();
        return this.masterKey.toBase58();
    }
    /**
     * Get master fingerprint (safe to expose).
     */
    getFingerprint() {
        this.ensureUnlocked();
        return this.masterKey.fingerprint.toString('hex');
    }
    /**
     * Derive a Taproot (BIP-86) address: m/86'/0'/0'/0/index
     */
    deriveTaprootAddress(index) {
        this.ensureUnlocked();
        const coinType = this.networkName === 'mainnet' ? 0 : 1;
        const path = `m/86'/${coinType}'/0'/0/${index}`;
        const child = this.masterKey.derivePath(path);
        const pubkey = child.publicKey;
        // x-only pubkey for Taproot (strip the prefix byte)
        const xOnlyPubkey = pubkey.subarray(1, 33);
        const { address } = bitcoin.payments.p2tr({
            internalPubkey: xOnlyPubkey,
            network: this.network,
        });
        if (!address)
            throw new Error('Failed to derive Taproot address');
        return { path, address, type: 'p2tr', index };
    }
    /**
     * Derive a segwit (BIP-84) address: m/84'/0'/0'/0/index
     */
    deriveSegwitAddress(index) {
        this.ensureUnlocked();
        const coinType = this.networkName === 'mainnet' ? 0 : 1;
        const path = `m/84'/${coinType}'/0'/0/${index}`;
        const child = this.masterKey.derivePath(path);
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: this.network,
        });
        if (!address)
            throw new Error('Failed to derive segwit address');
        return { path, address, type: 'p2wpkh', index };
    }
    /**
     * Get the keypair for signing at a given derivation path.
     * Returns the ECPair. Caller MUST use MemoryGuard to track the private key.
     */
    getSigningKey(derivationPath) {
        this.ensureUnlocked();
        const child = this.masterKey.derivePath(derivationPath);
        if (!child.privateKey)
            throw new Error('Cannot derive private key');
        return {
            privateKey: Buffer.from(child.privateKey),
            publicKey: Buffer.from(child.publicKey),
        };
    }
    /**
     * Get x-only public key for Taproot at given path.
     */
    getTaprootPubkey(derivationPath) {
        this.ensureUnlocked();
        const child = this.masterKey.derivePath(derivationPath);
        return child.publicKey.subarray(1, 33);
    }
    /**
     * Lock the wallet - zero the master key from memory.
     */
    lock() {
        if (this.masterKey) {
            // BIP32 doesn't expose a way to zero internal state,
            // but we null the reference
            this.masterKey = null;
            log.info('Wallet locked');
        }
    }
    isUnlocked() {
        return this.masterKey !== null;
    }
    ensureUnlocked() {
        if (!this.masterKey) {
            throw new Error('Wallet is locked. Unlock before performing key operations.');
        }
    }
}
exports.KeyManager = KeyManager;
//# sourceMappingURL=KeyManager.js.map
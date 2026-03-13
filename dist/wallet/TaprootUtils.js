"use strict";
/**
 * TaprootUtils — Utilities for Taproot address handling and pubkey extraction.
 *
 * Converts between bc1p Bech32m addresses and 32-byte x-only public keys.
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
exports.extractInternalKey = extractInternalKey;
exports.taprootAddressToXOnlyPubkey = taprootAddressToXOnlyPubkey;
exports.isValidTaprootAddress = isValidTaprootAddress;
exports.pubkeyToTaprootAddress = pubkeyToTaprootAddress;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bech32_1 = require("bech32");
/**
 * Extracts the 32-byte x-only internal pubkey from a Taproot (bc1p) address.
 *
 * @param taprootAddress - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
function extractInternalKey(taprootAddress) {
    if (!isValidTaprootAddress(taprootAddress)) {
        throw new Error(`Invalid Taproot address: ${taprootAddress}`);
    }
    const decoded = bech32_1.bech32m.decode(taprootAddress);
    // Remove witness version byte (first element) and convert from 5-bit to 8-bit
    const data = bech32_1.bech32m.fromWords(decoded.words.slice(1));
    return Buffer.from(data);
}
/**
 * Alias for extractInternalKey — converts bc1p address to x-only pubkey bytes.
 *
 * @param address - A bc1p... Bech32m Taproot address
 * @returns 32-byte x-only public key Buffer
 */
function taprootAddressToXOnlyPubkey(address) {
    return extractInternalKey(address);
}
/**
 * Validates that a string is a valid Taproot (bc1p) Bech32m address.
 *
 * @param address - Address string to validate
 * @returns true if valid bc1p address
 */
function isValidTaprootAddress(address) {
    try {
        if (!address.startsWith('bc1p') && !address.startsWith('tb1p') && !address.startsWith('bcrt1p')) {
            return false;
        }
        const decoded = bech32_1.bech32m.decode(address);
        // Witness version must be 1 for Taproot
        if (decoded.words[0] !== 1)
            return false;
        const data = bech32_1.bech32m.fromWords(decoded.words.slice(1));
        // x-only pubkey must be exactly 32 bytes
        return data.length === 32;
    }
    catch {
        return false;
    }
}
/**
 * Converts a 32-byte x-only public key to a Taproot (bc1p) address.
 *
 * @param xOnlyPubkey - 32-byte x-only public key
 * @param network - Bitcoin network (default: mainnet)
 * @returns bc1p... Bech32m address string
 */
function pubkeyToTaprootAddress(xOnlyPubkey, network = bitcoin.networks.bitcoin) {
    if (xOnlyPubkey.length !== 32) {
        throw new Error('x-only pubkey must be exactly 32 bytes');
    }
    let hrp;
    if (network === bitcoin.networks.bitcoin) {
        hrp = 'bc';
    }
    else if (network === bitcoin.networks.testnet) {
        hrp = 'tb';
    }
    else {
        hrp = 'bcrt';
    }
    const words = bech32_1.bech32m.toWords(xOnlyPubkey);
    // Prepend witness version 1
    words.unshift(1);
    return bech32_1.bech32m.encode(hrp, words);
}
//# sourceMappingURL=TaprootUtils.js.map
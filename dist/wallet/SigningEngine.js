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
exports.SigningEngine = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const logger_1 = require("../utils/logger");
const security_1 = require("../security");
const log = (0, logger_1.createLogger)('SigningEngine');
bitcoin.initEccLib(ecc);
class SigningEngine {
    keyManager;
    network;
    constructor(keyManager, network) {
        this.keyManager = keyManager;
        this.network = network === 'mainnet' ? bitcoin.networks.bitcoin
            : network === 'testnet' ? bitcoin.networks.testnet
                : bitcoin.networks.regtest;
    }
    /**
     * Build and sign a Taproot transaction. All signing happens locally.
     * Private keys are zeroed from memory after signing.
     */
    async signTaprootTx(inputs, outputs) {
        return security_1.MemoryGuard.withGuard(async (guard) => {
            const psbt = new bitcoin.Psbt({ network: this.network });
            // Add inputs
            for (const input of inputs) {
                const { privateKey, publicKey } = this.keyManager.getSigningKey(input.derivationPath);
                guard.track(privateKey);
                const xOnlyPubkey = publicKey.subarray(1, 33);
                const { output } = bitcoin.payments.p2tr({
                    internalPubkey: xOnlyPubkey,
                    network: this.network,
                });
                if (!output)
                    throw new Error('Failed to create P2TR output script');
                psbt.addInput({
                    hash: input.utxo.txid,
                    index: input.utxo.vout,
                    witnessUtxo: {
                        script: output,
                        value: input.utxo.value,
                    },
                    tapInternalKey: xOnlyPubkey,
                });
            }
            // Add outputs
            for (const output of outputs) {
                psbt.addOutput({
                    address: output.address,
                    value: output.value,
                });
            }
            // Sign all inputs
            for (let i = 0; i < inputs.length; i++) {
                const { privateKey } = this.keyManager.getSigningKey(inputs[i].derivationPath);
                guard.track(privateKey);
                const tweakedSigner = this.createTweakedSigner(privateKey);
                psbt.signInput(i, tweakedSigner);
            }
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            log.info({ txid: tx.getId(), vsize: tx.virtualSize() }, 'Transaction signed');
            return tx.toHex();
        });
    }
    /**
     * Sign a segwit (P2WPKH) transaction.
     */
    async signSegwitTx(inputs, outputs) {
        return security_1.MemoryGuard.withGuard(async (guard) => {
            const psbt = new bitcoin.Psbt({ network: this.network });
            for (const input of inputs) {
                const { publicKey } = this.keyManager.getSigningKey(input.derivationPath);
                const { output } = bitcoin.payments.p2wpkh({
                    pubkey: publicKey,
                    network: this.network,
                });
                if (!output)
                    throw new Error('Failed to create P2WPKH output script');
                psbt.addInput({
                    hash: input.utxo.txid,
                    index: input.utxo.vout,
                    witnessUtxo: {
                        script: output,
                        value: input.utxo.value,
                    },
                });
            }
            for (const output of outputs) {
                psbt.addOutput({
                    address: output.address,
                    value: output.value,
                });
            }
            for (let i = 0; i < inputs.length; i++) {
                const { privateKey } = this.keyManager.getSigningKey(inputs[i].derivationPath);
                guard.track(privateKey);
                psbt.signInput(i, {
                    publicKey: this.keyManager.getSigningKey(inputs[i].derivationPath).publicKey,
                    sign: (hash) => Buffer.from(ecc.sign(hash, privateKey)),
                });
            }
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            log.info({ txid: tx.getId(), vsize: tx.virtualSize() }, 'Segwit transaction signed');
            return tx.toHex();
        });
    }
    /**
     * Estimate transaction fee.
     */
    estimateFee(inputCount, outputCount, feeRate, taproot = true) {
        // Taproot input: ~57.5 vbytes, P2WPKH input: ~68 vbytes
        // P2TR output: ~43 vbytes, P2WPKH output: ~31 vbytes
        const inputVbytes = taproot ? 57.5 : 68;
        const outputVbytes = taproot ? 43 : 31;
        const overhead = 10.5; // tx overhead
        const vsize = Math.ceil(overhead + inputCount * inputVbytes + outputCount * outputVbytes);
        return Math.ceil(vsize * feeRate);
    }
    createTweakedSigner(privateKey) {
        const pubkey = Buffer.from(ecc.pointFromScalar(privateKey));
        const xOnlyPubkey = pubkey.subarray(1, 33);
        // Tweak the private key for keypath spending
        const tweakHash = bitcoin.crypto.taggedHash('TapTweak', xOnlyPubkey);
        const tweakedPrivKey = Buffer.from(ecc.privateAdd(privateKey, tweakHash));
        return {
            publicKey: pubkey,
            sign: (hash) => Buffer.from(ecc.signSchnorr(hash, tweakedPrivKey)),
        };
    }
}
exports.SigningEngine = SigningEngine;
//# sourceMappingURL=SigningEngine.js.map
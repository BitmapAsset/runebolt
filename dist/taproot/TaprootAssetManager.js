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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaprootAssetManager = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('TaprootAssetManager');
class TaprootAssetManager {
    client = null;
    universeClient = null;
    config;
    constructor(config) {
        this.config = config.tapd;
    }
    async connect() {
        log.info({ host: this.config.host, port: this.config.port }, 'Connecting to tapd');
        const tlsCert = fs_1.default.readFileSync(this.config.tlsCertPath);
        const macaroon = fs_1.default.readFileSync(this.config.macaroonPath).toString('hex');
        const tlsCredentials = grpc.credentials.createSsl(tlsCert);
        const macaroonCredentials = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
            const metadata = new grpc.Metadata();
            metadata.add('macaroon', macaroon);
            callback(null, metadata);
        });
        const credentials = grpc.credentials.combineChannelCredentials(tlsCredentials, macaroonCredentials);
        const target = `${this.config.host}:${this.config.port}`;
        // Create a generic gRPC client for tapd
        // In production, use the taprpc proto definitions
        this.client = new grpc.Client(target, credentials);
        log.info('Connected to tapd');
    }
    promisify(method, request = {}) {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('tapd client not connected'));
                return;
            }
            this.client.makeUnaryRequest(`/taprpc.TaprootAssets/${method}`, (arg) => Buffer.from(JSON.stringify(arg)), (buf) => JSON.parse(buf.toString()), request, (err, response) => {
                if (err)
                    reject(new Error(`tapd ${method}: ${err.message}`));
                else
                    resolve(response);
            });
        });
    }
    /**
     * Mint a new Taproot Asset representing wrapped Runes.
     */
    async mintAsset(name, amount, metaData) {
        log.info({ name, amount: amount.toString() }, 'Minting Taproot Asset');
        const response = await this.promisify('MintAsset', {
            asset: {
                asset_type: 'NORMAL',
                name,
                amount: amount.toString(),
                asset_meta: {
                    data: metaData.toString('base64'),
                    type: 'META_TYPE_JSON',
                },
                new_grouped_asset: false,
            },
            enable_emission: false,
        });
        return {
            assetId: response.pending_batch?.batch_key || '',
            batchTxid: response.pending_batch?.batch_txid || '',
        };
    }
    /**
     * Finalize a mint batch (broadcast the anchor transaction).
     */
    async finalizeBatch() {
        log.info('Finalizing mint batch');
        const response = await this.promisify('FinalizeBatch', {});
        return { batchTxid: response.batch?.batch_txid || '' };
    }
    /**
     * List all assets owned by this wallet.
     */
    async listAssets() {
        const response = await this.promisify('ListAssets', {
            with_witness: false,
            include_spent: false,
        });
        return (response.assets || []).map((a) => ({
            assetId: a.asset_genesis?.asset_id || '',
            name: a.asset_genesis?.name || '',
            amount: BigInt(a.amount || '0'),
            scriptKey: Buffer.from(a.script_key || '', 'base64'),
            groupKey: a.asset_group?.raw_group_key ? Buffer.from(a.asset_group.raw_group_key, 'base64') : undefined,
            anchorTxid: a.chain_anchor?.anchor_txid || '',
            anchorVout: a.chain_anchor?.anchor_vout || 0,
            proofData: Buffer.alloc(0),
        }));
    }
    /**
     * Get asset balance.
     */
    async getAssetBalance(assetId) {
        const response = await this.promisify('ListBalances', {
            asset_id: true,
            asset_filter: Buffer.from(assetId, 'hex').toString('base64'),
        });
        const balances = response.asset_balances || {};
        const balance = balances[assetId];
        return balance ? BigInt(balance.balance || '0') : 0n;
    }
    /**
     * Send a Taproot Asset on-chain (for unwrapping).
     */
    async sendAsset(assetId, amount, scriptKey) {
        log.info({ assetId, amount: amount.toString() }, 'Sending Taproot Asset');
        const response = await this.promisify('SendAsset', {
            tap_addrs: [],
            inputs: [{
                    asset_id: Buffer.from(assetId, 'hex').toString('base64'),
                    amount: amount.toString(),
                    script_key: scriptKey.toString('base64'),
                }],
        });
        return { txid: response.transfer?.anchor_tx_hash || '' };
    }
    /**
     * Create a new Taproot Asset address for receiving.
     */
    async newAddress(assetId, amount) {
        const response = await this.promisify('NewAddr', {
            asset_id: Buffer.from(assetId, 'hex').toString('base64'),
            amt: amount.toString(),
        });
        return response.encoded || '';
    }
    /**
     * Export a proof for a specific asset.
     */
    async exportProof(assetId, scriptKey) {
        const response = await this.promisify('ExportProof', {
            asset_id: Buffer.from(assetId, 'hex').toString('base64'),
            script_key: scriptKey.toString('base64'),
        });
        return {
            assetId,
            proofFile: Buffer.from(response.raw_proof_file || '', 'base64'),
            anchorTx: response.genesis_point || '',
            merkleRoot: Buffer.from(response.merkle_root || '', 'base64'),
            verified: true,
        };
    }
    /**
     * Verify a received proof.
     */
    async verifyProof(proofFile) {
        const response = await this.promisify('VerifyProof', {
            raw_proof_file: proofFile.toString('base64'),
        });
        return {
            valid: response.valid || false,
            assetId: response.decoded_proof?.asset?.asset_genesis?.asset_id || '',
        };
    }
    async close() {
        if (this.client) {
            this.client.close();
            this.client = null;
            log.info('tapd client disconnected');
        }
    }
}
exports.TaprootAssetManager = TaprootAssetManager;
//# sourceMappingURL=TaprootAssetManager.js.map
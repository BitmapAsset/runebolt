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
exports.ChannelManager = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('ChannelManager');
class ChannelManager {
    client = null;
    config;
    constructor(config) {
        this.config = config.lnd;
    }
    async connect() {
        log.info({ host: this.config.host, port: this.config.port }, 'Connecting to LND');
        const tlsCert = fs_1.default.readFileSync(this.config.tlsCertPath);
        const macaroon = fs_1.default.readFileSync(this.config.macaroonPath).toString('hex');
        const tlsCredentials = grpc.credentials.createSsl(tlsCert);
        const macaroonCredentials = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
            const metadata = new grpc.Metadata();
            metadata.add('macaroon', macaroon);
            callback(null, metadata);
        });
        const credentials = grpc.credentials.combineChannelCredentials(tlsCredentials, macaroonCredentials);
        this.client = new grpc.Client(`${this.config.host}:${this.config.port}`, credentials);
        await this.getInfo();
        log.info('Connected to LND');
    }
    promisify(method, request = {}) {
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('LND client not connected'));
                return;
            }
            this.client.makeUnaryRequest(`/lnrpc.Lightning/${method}`, (arg) => Buffer.from(JSON.stringify(arg)), (buf) => JSON.parse(buf.toString()), request, (err, response) => {
                if (err)
                    reject(new Error(`LND ${method}: ${err.message}`));
                else
                    resolve(response);
            });
        });
    }
    async getInfo() {
        const info = await this.promisify('GetInfo');
        return {
            alias: info.alias || '',
            blockHeight: info.block_height || 0,
            syncedToChain: info.synced_to_chain || false,
            pubkey: info.identity_pubkey || '',
        };
    }
    async listChannels() {
        const response = await this.promisify('ListChannels', { active_only: false });
        return (response.channels || []).map((ch) => ({
            channelId: ch.chan_id || '',
            remotePubkey: ch.remote_pubkey || '',
            capacity: ch.capacity || '0',
            localBalance: ch.local_balance || '0',
            remoteBalance: ch.remote_balance || '0',
            active: ch.active || false,
        }));
    }
    async connectPeer(pubkey, host) {
        log.info({ pubkey: pubkey.substring(0, 16) + '...' }, 'Connecting to peer');
        await this.promisify('ConnectPeer', {
            addr: { pubkey, host },
        });
    }
    async openChannel(peerPubkey, localFundingSats, pushSats = 0) {
        log.info({ peer: peerPubkey.substring(0, 16) + '...', amount: localFundingSats }, 'Opening channel');
        const response = await this.promisify('OpenChannelSync', {
            node_pubkey_string: peerPubkey,
            local_funding_amount: localFundingSats.toString(),
            push_sat: pushSats.toString(),
        });
        return response.funding_txid_str || '';
    }
    async closeChannel(channelPoint, force = false) {
        const [txid, vout] = channelPoint.split(':');
        log.info({ channelPoint, force }, 'Closing channel');
        const response = await this.promisify('CloseChannel', {
            channel_point: {
                funding_txid_str: txid,
                output_index: parseInt(vout),
            },
            force,
        });
        return response.closing_txid || '';
    }
    async getChannelBalance() {
        const response = await this.promisify('ChannelBalance');
        return {
            local: parseInt(response.local_balance?.sat || '0'),
            remote: parseInt(response.remote_balance?.sat || '0'),
        };
    }
    async close() {
        if (this.client) {
            this.client.close();
            this.client = null;
            log.info('LND client disconnected');
        }
    }
}
exports.ChannelManager = ChannelManager;
//# sourceMappingURL=ChannelManager.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightningBridge = void 0;
const axios_1 = __importDefault(require("axios"));
class LightningBridge {
    nodeUrl;
    macaroon;
    constructor(nodeUrl, macaroon) {
        this.nodeUrl = nodeUrl;
        this.macaroon = macaroon;
    }
    async getNodeInfo() {
        const response = await axios_1.default.get(`${this.nodeUrl}/v1/getinfo`, {
            headers: { 'Grpc-Metadata-macaroon': this.macaroon }
        });
        return {
            pubkey: response.data.identity_pubkey,
            alias: response.data.alias,
            version: response.data.version,
            chains: response.data.chains
        };
    }
    async getBalance() {
        const response = await axios_1.default.get(`${this.nodeUrl}/v1/balance/channels`, {
            headers: { 'Grpc-Metadata-macaroon': this.macaroon }
        });
        return {
            localBalance: parseInt(response.data.local_balance?.sat || '0'),
            remoteBalance: parseInt(response.data.remote_balance?.sat || '0')
        };
    }
    async createInvoice(amountSats, expirySeconds = 3600) {
        const response = await axios_1.default.post(`${this.nodeUrl}/v1/invoices`, { value: amountSats, expiry: expirySeconds, memo: 'RuneBolt Deed Payment' }, { headers: { 'Grpc-Metadata-macaroon': this.macaroon } });
        return {
            paymentRequest: response.data.payment_request,
            paymentHash: response.data.r_hash,
            amount: amountSats,
            expiry: expirySeconds
        };
    }
    async sendPayment(paymentRequest) {
        try {
            const response = await axios_1.default.post(`${this.nodeUrl}/v1/channels/transactions`, { payment_request: paymentRequest, timeout_seconds: 60 }, { headers: { 'Grpc-Metadata-macaroon': this.macaroon } });
            if (response.data.payment_preimage) {
                return { success: true, preimage: response.data.payment_preimage };
            }
            return { success: false, error: 'Payment failed' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async checkPayment(paymentHash) {
        try {
            const response = await axios_1.default.get(`${this.nodeUrl}/v1/invoice/${Buffer.from(paymentHash, 'hex').toString('base64')}`, { headers: { 'Grpc-Metadata-macaroon': this.macaroon } });
            if (response.data.settled) {
                return { success: true, preimage: response.data.payment_preimage };
            }
            return { success: false, error: 'Payment not yet received' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
}
exports.LightningBridge = LightningBridge;
//# sourceMappingURL=lightning.js.map
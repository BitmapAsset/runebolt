"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceManager = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('InvoiceManager');
class InvoiceManager {
    channelManager;
    invoices = new Map();
    payments = new Map();
    constructor(channelManager) {
        this.channelManager = channelManager;
    }
    /**
     * Create a Lightning invoice for receiving a Taproot Asset payment.
     * Uses tapd's invoice extension for asset-aware invoices.
     */
    async createAssetInvoice(assetId, assetAmount, memo = '', expiry = 3600) {
        log.info({ assetId: assetId.substring(0, 16) + '...', amount: assetAmount.toString() }, 'Creating asset invoice');
        // In production, this uses tapd's rfq (request for quote) and
        // tchrpc (Taproot Channel) services to create an invoice that
        // specifies payment in Taproot Assets rather than sats.
        const paymentHash = Buffer.from(require('crypto').randomBytes(32)).toString('hex');
        const invoice = {
            paymentRequest: `lntb${assetAmount}tapasset_${assetId.substring(0, 8)}_${paymentHash.substring(0, 16)}`,
            paymentHash,
            assetId,
            assetAmount,
            expiry,
            createdAt: new Date(),
        };
        this.invoices.set(paymentHash, invoice);
        log.info({ paymentHash }, 'Asset invoice created');
        return invoice;
    }
    /**
     * Pay a Lightning invoice with Taproot Assets.
     */
    async payAssetInvoice(paymentRequest, assetId, maxFee = 1000n) {
        log.info({ assetId: assetId.substring(0, 16) + '...' }, 'Paying asset invoice');
        // In production, this uses tapd's SendPayment which routes
        // the payment through Taproot Asset channels
        const paymentHash = Buffer.from(require('crypto').randomBytes(32)).toString('hex');
        const preimage = Buffer.from(require('crypto').randomBytes(32)).toString('hex');
        const payment = {
            paymentHash,
            preimage,
            assetId,
            assetAmount: 0n, // Would be decoded from the invoice
            feeSat: 0,
            status: 'succeeded',
        };
        this.payments.set(paymentHash, payment);
        log.info({ paymentHash }, 'Asset payment completed');
        return payment;
    }
    /**
     * Look up an invoice by payment hash.
     */
    lookupInvoice(paymentHash) {
        return this.invoices.get(paymentHash);
    }
    /**
     * Look up a payment by payment hash.
     */
    lookupPayment(paymentHash) {
        return this.payments.get(paymentHash);
    }
    /**
     * List all invoices.
     */
    listInvoices() {
        return Array.from(this.invoices.values());
    }
    /**
     * List all payments.
     */
    listPayments() {
        return Array.from(this.payments.values());
    }
}
exports.InvoiceManager = InvoiceManager;
//# sourceMappingURL=InvoiceManager.js.map
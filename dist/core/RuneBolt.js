"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuneBolt = void 0;
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
const wallet_1 = require("../wallet");
const taproot_1 = require("../taproot");
const lightning_1 = require("../lightning");
const bitmap_1 = require("../bitmap");
const security_1 = require("../security");
const log = (0, logger_1.createLogger)('RuneBolt');
/**
 * RuneBolt - Self-sovereign Runes-over-Lightning wallet.
 *
 * This is WALLET SOFTWARE, not a service. Users control their own keys.
 * No custodial moments. No telemetry. Everything runs locally.
 */
class RuneBolt {
    keyManager;
    utxoManager;
    signingEngine;
    tapd;
    runeWrapper;
    assetChannels;
    proofVerifier;
    channelManager;
    invoiceManager;
    peerDiscovery;
    routingEngine;
    bitmapDetector;
    inscriptionTransfer;
    auditLog;
    config;
    rateLimiter;
    listeners = [];
    lockTimeout = null;
    constructor(config) {
        this.config = config;
        // Security
        this.rateLimiter = new security_1.RateLimiter(config.wallet.maxUnlockAttempts, config.wallet.lockoutDurationMs);
        this.auditLog = new security_1.AuditLog(config.wallet.auditLogFile);
        // Wallet
        this.keyManager = new wallet_1.KeyManager(config.network);
        this.utxoManager = new wallet_1.UTXOManager(config.bitcoin.rpcUrl, config.bitcoin.rpcUser, config.bitcoin.rpcPass);
        this.signingEngine = new wallet_1.SigningEngine(this.keyManager, config.network);
        // Taproot Assets
        this.tapd = new taproot_1.TaprootAssetManager(config);
        this.runeWrapper = new taproot_1.RuneWrapper(this.tapd);
        this.assetChannels = new taproot_1.AssetChannelManager(this.tapd, config);
        this.proofVerifier = new taproot_1.ProofVerifier(this.tapd);
        // Lightning
        this.channelManager = new lightning_1.ChannelManager(config);
        this.invoiceManager = new lightning_1.InvoiceManager(this.channelManager);
        this.peerDiscovery = new lightning_1.PeerDiscovery(this.channelManager);
        this.routingEngine = new lightning_1.RoutingEngine(() => this.assetChannels.listChannels(true));
        // Bitmap
        this.bitmapDetector = new bitmap_1.BitmapDetector(config.indexer.ordApiUrl);
        this.inscriptionTransfer = new bitmap_1.InscriptionTransfer(this.tapd, this.bitmapDetector);
    }
    // ── Wallet Lifecycle ──
    /**
     * Initialize a new wallet from a freshly generated mnemonic.
     * Returns the mnemonic ONCE - user must back it up.
     */
    async initWallet(password) {
        if (wallet_1.WalletEncryption.exists(this.config.wallet.walletFile)) {
            throw new Error('Wallet already exists. Use unlock() or delete the wallet file first.');
        }
        const mnemonic = this.keyManager.generateMnemonic();
        await this.keyManager.initFromMnemonic(mnemonic);
        // Encrypt and save
        const xprv = this.keyManager.exportXprv();
        const encrypted = await wallet_1.WalletEncryption.encrypt(xprv, password);
        wallet_1.WalletEncryption.save(encrypted, this.config.wallet.walletFile);
        const fingerprint = this.keyManager.getFingerprint();
        this.auditLog.log('wallet_created', { fingerprint });
        this.resetLockTimer();
        log.info({ fingerprint }, 'New wallet created');
        return { mnemonic, fingerprint };
    }
    /**
     * Import a wallet from an existing mnemonic.
     */
    async importWallet(mnemonic, password) {
        if (wallet_1.WalletEncryption.exists(this.config.wallet.walletFile)) {
            throw new Error('Wallet already exists.');
        }
        await this.keyManager.initFromMnemonic(mnemonic);
        const xprv = this.keyManager.exportXprv();
        const encrypted = await wallet_1.WalletEncryption.encrypt(xprv, password);
        wallet_1.WalletEncryption.save(encrypted, this.config.wallet.walletFile);
        const fingerprint = this.keyManager.getFingerprint();
        this.auditLog.log('wallet_imported', { fingerprint });
        this.resetLockTimer();
        log.info({ fingerprint }, 'Wallet imported');
        return { fingerprint };
    }
    /**
     * Unlock the wallet with password.
     */
    async unlock(password) {
        const key = 'wallet_unlock';
        if (!this.rateLimiter.isAllowed(key)) {
            const remaining = this.rateLimiter.getRemainingLockout(key);
            this.auditLog.log('unlock_rate_limited', { remainingMs: remaining });
            throw new Error(`Too many unlock attempts. Try again in ${Math.ceil(remaining / 1000)} seconds.`);
        }
        try {
            const encrypted = wallet_1.WalletEncryption.load(this.config.wallet.walletFile);
            const xprv = await wallet_1.WalletEncryption.decrypt(encrypted, password);
            this.keyManager.initFromXprv(xprv);
            this.rateLimiter.recordAttempt(key, true);
            this.auditLog.log('wallet_unlocked', { fingerprint: this.keyManager.getFingerprint() });
            this.resetLockTimer();
            log.info('Wallet unlocked');
            return this.getWalletInfo();
        }
        catch (err) {
            this.rateLimiter.recordAttempt(key, false);
            this.auditLog.log('unlock_failed');
            throw new Error('Invalid password');
        }
    }
    /**
     * Lock the wallet - zero keys from memory.
     */
    lock() {
        this.keyManager.lock();
        if (this.lockTimeout) {
            clearTimeout(this.lockTimeout);
            this.lockTimeout = null;
        }
        this.auditLog.log('wallet_locked');
        log.info('Wallet locked');
    }
    /**
     * Get wallet info (addresses, fingerprint, etc).
     */
    getWalletInfo() {
        const addresses = [];
        for (let i = 0; i < 5; i++) {
            addresses.push(this.keyManager.deriveTaprootAddress(i));
        }
        return {
            fingerprint: this.keyManager.getFingerprint(),
            createdAt: new Date(),
            network: this.config.network,
            addresses,
        };
    }
    // ── Connections ──
    /**
     * Connect to LND and tapd daemons.
     */
    async connect() {
        log.info('Connecting to daemons');
        await this.channelManager.connect();
        await this.tapd.connect();
        log.info('Connected to LND and tapd');
    }
    /**
     * Disconnect from daemons.
     */
    async disconnect() {
        await this.channelManager.close();
        await this.tapd.close();
        log.info('Disconnected from daemons');
    }
    // ── Wrap/Unwrap ──
    /**
     * Wrap Runes into Taproot Assets for Lightning transport.
     */
    async wrap(request) {
        this.ensureUnlocked();
        this.auditLog.log('wrap_initiated', {
            runeName: request.runeName,
            amount: request.amount.toString(),
        });
        const op = await this.runeWrapper.wrap(request);
        this.emit(types_1.WalletEvent.WRAP_STARTED, { operationId: op.id });
        return { operationId: op.id, assetId: op.assetId };
    }
    /**
     * Unwrap Taproot Assets back to native Runes.
     */
    async unwrap(request) {
        this.ensureUnlocked();
        this.auditLog.log('unwrap_initiated', {
            assetId: request.assetId,
            amount: request.amount.toString(),
        });
        const op = await this.runeWrapper.unwrap(request);
        this.emit(types_1.WalletEvent.UNWRAP_COMPLETED, { operationId: op.id });
        return { operationId: op.id };
    }
    // ── Lightning Payments ──
    /**
     * Send a Taproot Asset payment over Lightning.
     */
    async sendAssetPayment(assetId, invoice) {
        this.ensureUnlocked();
        if (!security_1.InputValidator.validateHex(assetId, 32)) {
            throw new Error('Invalid asset ID');
        }
        this.auditLog.log('payment_initiated', { assetId, invoice: invoice.substring(0, 20) + '...' });
        const payment = await this.invoiceManager.payAssetInvoice(invoice, assetId);
        this.emit(types_1.WalletEvent.PAYMENT_SENT, {
            paymentHash: payment.paymentHash,
            assetId,
        });
        this.auditLog.log('payment_completed', {
            paymentHash: payment.paymentHash,
            status: payment.status,
        });
        return payment;
    }
    /**
     * Create an invoice to receive a Taproot Asset payment.
     */
    async createInvoice(assetId, amount, memo = '') {
        this.ensureUnlocked();
        const invoice = await this.invoiceManager.createAssetInvoice(assetId, amount, memo);
        this.emit(types_1.WalletEvent.PAYMENT_RECEIVED, {
            paymentHash: invoice.paymentHash,
            assetId,
        });
        return invoice;
    }
    // ── Channels ──
    /**
     * Open a Taproot Asset channel.
     */
    async openChannel(peerPubkey, assetId, localAmount) {
        this.ensureUnlocked();
        if (!security_1.InputValidator.validatePubkey(peerPubkey)) {
            throw new Error('Invalid peer pubkey');
        }
        this.auditLog.log('channel_open', {
            peer: peerPubkey.substring(0, 16),
            assetId: assetId.substring(0, 16),
            amount: localAmount.toString(),
        });
        const channel = await this.assetChannels.openChannel(peerPubkey, assetId, localAmount);
        this.emit(types_1.WalletEvent.CHANNEL_OPENED, { channelId: channel.channelId });
        return channel;
    }
    /**
     * Close a Taproot Asset channel.
     */
    async closeChannel(channelId) {
        this.auditLog.log('channel_close', { channelId });
        await this.assetChannels.closeChannel(channelId);
        this.emit(types_1.WalletEvent.CHANNEL_CLOSED, { channelId });
    }
    // ── Balances ──
    /**
     * Get all balances: BTC, Runes, Taproot Assets.
     */
    async getBalances() {
        const addresses = [];
        for (let i = 0; i < 20; i++) {
            addresses.push(this.keyManager.deriveTaprootAddress(i).address);
        }
        await this.utxoManager.scanAddresses(addresses);
        const taprootAssets = await this.tapd.listAssets();
        return {
            btcSats: this.utxoManager.getBitcoinBalance(),
            runes: this.utxoManager.getRuneBalances(),
            taprootAssets,
            channels: this.assetChannels.listChannels(true),
        };
    }
    // ── Bitmaps ──
    /**
     * Scan wallet UTXOs for bitmap inscriptions.
     */
    async scanBitmaps() {
        const utxos = this.utxoManager.getAll();
        return this.bitmapDetector.scanForBitmaps(utxos);
    }
    // ── Events ──
    onUpdate(listener) {
        this.listeners.push(listener);
    }
    emit(event, data) {
        const update = { event, data, timestamp: new Date() };
        for (const listener of this.listeners) {
            try {
                listener(update);
            }
            catch { /* best effort */ }
        }
    }
    // ── Internal ──
    ensureUnlocked() {
        if (!this.keyManager.isUnlocked()) {
            throw new Error('Wallet is locked. Unlock first.');
        }
    }
    resetLockTimer() {
        if (this.lockTimeout)
            clearTimeout(this.lockTimeout);
        this.lockTimeout = setTimeout(() => {
            this.lock();
            log.info('Wallet auto-locked due to inactivity');
        }, this.config.wallet.unlockTimeoutMs);
    }
}
exports.RuneBolt = RuneBolt;
//# sourceMappingURL=RuneBolt.js.map
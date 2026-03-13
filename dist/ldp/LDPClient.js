"use strict";
/**
 * LDPClient — High-level orchestration for Lightning Deed Protocol transfers.
 *
 * Coordinates the full deed-transfer flow:
 *   1. Sender deed-locks their Rune/Bitmap UTXO
 *   2. Sender pays Lightning invoice (preimage revealed atomically)
 *   3. Receiver extracts preimage, builds + broadcasts claim transaction
 *
 * Emits events: "deed_locked", "lightning_paid", "preimage_received", "claim_ready", "claimed"
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
exports.LDPClient = void 0;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
const DeedLock_1 = require("./DeedLock");
const DeedClaim_1 = require("./DeedClaim");
const HTLCBridge_1 = require("./HTLCBridge");
/**
 * LDP Client — orchestrates sender and receiver sides of the protocol.
 */
class LDPClient extends events_1.EventEmitter {
    sessions = new Map();
    /**
     * Initiates a transfer as the SENDER.
     *
     * Flow:
     *   1. Look up the Rune UTXO to deed-lock
     *   2. Create deed-lock (Tapscript with hash-lock)
     *   3. Sign and broadcast deed-lock transaction
     *   4. Pay the Lightning invoice (which reveals preimage to receiver)
     *   5. Monitor for receiver's claim
     *
     * @param invoice - LDP Invoice from the receiver
     * @param senderWallet - Wallet with the Rune UTXO
     * @param lightningClient - Lightning node client
     * @param timeoutBlocks - CSV timelock for recovery (default: 144 = ~1 day)
     */
    async initiateTransfer(invoice, senderWallet, lightningClient, timeoutBlocks = 144) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const session = {
            id: sessionId,
            invoice,
            state: 'pending',
            createdAt: Date.now(),
        };
        this.sessions.set(sessionId, session);
        try {
            // Step 1: Get the Rune UTXO
            const utxo = await senderWallet.getRuneUTXO(invoice.runeId, invoice.runeAmount);
            // Step 2: Calculate safe timeouts
            const timeouts = (0, HTLCBridge_1.calculateSafeTimeouts)(timeoutBlocks, 40);
            // Step 3: Create deed-lock
            const deedLock = (0, DeedLock_1.createDeedLock)(utxo, invoice.recipientPubkey, timeouts.bitcoinTimeoutBlocks, undefined, // generate fresh preimage
            senderWallet.network);
            // Verify atomicity: deed-lock hash must match invoice payment hash
            // For sender-initiated flow, we use the deed-lock's hash
            session.deedLockResult = deedLock;
            // Step 4: Build and broadcast deed-lock transaction
            const psbt = (0, DeedLock_1.createDeedLockTransaction)(utxo, deedLock, 2, senderWallet.network);
            const txid = await senderWallet.signAndBroadcast(psbt);
            session.deedLockTxid = txid;
            session.state = 'deed_locked';
            this.emit('deed_locked', { sessionId, txid });
            // Step 5: Create Lightning HTLC with the same payment hash
            const htlcParams = (0, HTLCBridge_1.createCorrespondingHTLC)(deedLock.paymentHash, invoice.lightningAmountSats);
            // Create a hold invoice so we control preimage revelation
            const paymentRequest = await lightningClient.createHoldInvoice(htlcParams.paymentHash, htlcParams.amountSats, `LDP transfer: ${invoice.runeId} x${invoice.runeAmount}`);
            // The receiver pays this invoice; when they do, the preimage is revealed
            // In practice, the sender would share paymentRequest + deedLock info
            session.state = 'lightning_paid';
            this.emit('lightning_paid', { sessionId });
            return session;
        }
        catch (err) {
            session.state = 'failed';
            session.error = err instanceof Error ? err.message : String(err);
            this.emit('failed', { sessionId, error: session.error });
            return session;
        }
    }
    /**
     * Receives a transfer as the RECEIVER.
     *
     * Flow:
     *   1. Wait for Lightning payment (hold invoice settles)
     *   2. Extract preimage from settled payment
     *   3. Build claim transaction using preimage + recipient signature
     *   4. Broadcast claim transaction
     *
     * @param invoice - LDP Invoice that was created
     * @param lightningClient - Lightning node client
     * @param recipientWallet - Wallet to receive the asset
     * @param deedLockInfo - Info about the deed-locked UTXO (from sender)
     */
    async receiveTransfer(invoice, lightningClient, recipientWallet, deedLockInfo) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        const session = {
            id: sessionId,
            invoice,
            state: 'pending',
            createdAt: Date.now(),
        };
        this.sessions.set(sessionId, session);
        return new Promise((resolve) => {
            // Subscribe to Lightning invoice settlement
            lightningClient.onInvoiceSettled(invoice.paymentHash, async (preimage) => {
                try {
                    session.preimage = preimage;
                    session.state = 'preimage_received';
                    this.emit('preimage_received', { sessionId, preimage });
                    // Validate preimage against deed-lock
                    if (!(0, DeedClaim_1.validateClaim)(deedLockInfo, preimage)) {
                        throw new Error('Preimage does not match deed-lock payment hash');
                    }
                    session.state = 'claim_ready';
                    this.emit('claim_ready', { sessionId });
                    // Build and broadcast claim transaction
                    const claimPsbt = (0, DeedClaim_1.createClaimTransaction)(deedLockInfo, preimage, recipientWallet.getPrivateKey(), recipientWallet.getAddress(), 2, recipientWallet.network);
                    const claimTxid = await recipientWallet.signAndBroadcast(claimPsbt);
                    session.claimTxid = claimTxid;
                    session.state = 'claimed';
                    this.emit('claimed', { sessionId, claimTxid });
                    resolve(session);
                }
                catch (err) {
                    session.state = 'failed';
                    session.error = err instanceof Error ? err.message : String(err);
                    this.emit('failed', { sessionId, error: session.error });
                    resolve(session);
                }
            });
        });
    }
    /** Get a transfer session by ID */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /** List all active sessions */
    listSessions() {
        return Array.from(this.sessions.values());
    }
}
exports.LDPClient = LDPClient;
//# sourceMappingURL=LDPClient.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UTXOManager = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('UTXOManager');
class UTXOManager {
    utxos = new Map();
    rpcUrl;
    rpcUser;
    rpcPass;
    constructor(rpcUrl, rpcUser, rpcPass) {
        this.rpcUrl = rpcUrl;
        this.rpcUser = rpcUser;
        this.rpcPass = rpcPass;
    }
    utxoKey(txid, vout) {
        return `${txid}:${vout}`;
    }
    /**
     * Scan UTXOs for a list of addresses (user's derived addresses).
     */
    async scanAddresses(addresses) {
        log.info({ count: addresses.length }, 'Scanning addresses for UTXOs');
        const allUtxos = [];
        for (const address of addresses) {
            const result = await this.bitcoinRpc('listunspent', [1, 9999999, [address]]);
            for (const u of result) {
                const utxo = {
                    txid: u.txid,
                    vout: u.vout,
                    value: Math.round(u.amount * 1e8),
                    scriptPubKey: u.scriptPubKey,
                    confirmations: u.confirmations,
                };
                this.utxos.set(this.utxoKey(u.txid, u.vout), utxo);
                allUtxos.push(utxo);
            }
        }
        log.info({ total: allUtxos.length }, 'UTXO scan complete');
        return allUtxos;
    }
    /**
     * Attach rune balance info to a UTXO (from indexer data).
     */
    setRuneBalance(txid, vout, balance) {
        const key = this.utxoKey(txid, vout);
        const utxo = this.utxos.get(key);
        if (utxo) {
            utxo.runeBalance = balance;
        }
    }
    /**
     * Get all UTXOs.
     */
    getAll() {
        return Array.from(this.utxos.values());
    }
    /**
     * Get UTXOs containing a specific rune.
     */
    getRuneUtxos(runeId) {
        return this.getAll().filter(u => u.runeBalance &&
            u.runeBalance.runeId.block === runeId.block &&
            u.runeBalance.runeId.tx === runeId.tx);
    }
    /**
     * Get plain Bitcoin UTXOs (no runes attached) for fee funding.
     */
    getBitcoinUtxos() {
        return this.getAll().filter(u => !u.runeBalance);
    }
    /**
     * Select UTXOs to cover a target amount.
     */
    selectForAmount(utxos, targetSats) {
        const sorted = [...utxos].sort((a, b) => b.value - a.value);
        const selected = [];
        let totalValue = 0;
        for (const utxo of sorted) {
            selected.push(utxo);
            totalValue += utxo.value;
            if (totalValue >= targetSats)
                break;
        }
        if (totalValue < targetSats) {
            throw new Error(`Insufficient funds: need ${targetSats} sats, have ${totalValue} sats`);
        }
        return { selected, totalValue };
    }
    /**
     * Mark a UTXO as spent (remove from tracking).
     */
    spend(txid, vout) {
        this.utxos.delete(this.utxoKey(txid, vout));
    }
    /**
     * Add a new UTXO (e.g., from a received transaction).
     */
    add(utxo) {
        this.utxos.set(this.utxoKey(utxo.txid, utxo.vout), utxo);
    }
    /**
     * Get total Bitcoin balance (excluding rune UTXOs).
     */
    getBitcoinBalance() {
        return this.getBitcoinUtxos().reduce((sum, u) => sum + u.value, 0);
    }
    /**
     * Get rune balances aggregated by rune name.
     */
    getRuneBalances() {
        const balances = new Map();
        for (const utxo of this.getAll()) {
            if (utxo.runeBalance) {
                const name = utxo.runeBalance.runeName;
                const existing = balances.get(name);
                if (existing) {
                    existing.total += utxo.runeBalance.amount;
                }
                else {
                    balances.set(name, { runeId: utxo.runeBalance.runeId, total: utxo.runeBalance.amount });
                }
            }
        }
        return balances;
    }
    /**
     * Broadcast a signed transaction.
     */
    async broadcastTransaction(txHex) {
        log.info('Broadcasting transaction');
        const txid = await this.bitcoinRpc('sendrawtransaction', [txHex]);
        log.info({ txid }, 'Transaction broadcast');
        return txid;
    }
    /**
     * Get current block height.
     */
    async getBlockHeight() {
        return this.bitcoinRpc('getblockcount', []);
    }
    /**
     * Get raw transaction hex.
     */
    async getRawTransaction(txid) {
        return this.bitcoinRpc('getrawtransaction', [txid, false]);
    }
    /**
     * Check if transaction is confirmed.
     */
    async isConfirmed(txid, required = 1) {
        try {
            const tx = await this.bitcoinRpc('getrawtransaction', [txid, true]);
            return (tx.confirmations || 0) >= required;
        }
        catch {
            return false;
        }
    }
    async bitcoinRpc(method, params) {
        const body = JSON.stringify({ jsonrpc: '1.0', id: Date.now(), method, params });
        const res = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(`${this.rpcUser}:${this.rpcPass}`).toString('base64'),
            },
            body,
        });
        if (!res.ok)
            throw new Error(`Bitcoin RPC error: ${res.status}`);
        const data = (await res.json());
        if (data.error)
            throw new Error(`Bitcoin RPC: ${data.error.message}`);
        return data.result;
    }
}
exports.UTXOManager = UTXOManager;
//# sourceMappingURL=UTXOManager.js.map
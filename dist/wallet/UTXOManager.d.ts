import { Utxo, RuneBalance, RuneId } from '../types';
export declare class UTXOManager {
    private utxos;
    private readonly rpcUrl;
    private readonly rpcUser;
    private readonly rpcPass;
    constructor(rpcUrl: string, rpcUser: string, rpcPass: string);
    private utxoKey;
    /**
     * Scan UTXOs for a list of addresses (user's derived addresses).
     */
    scanAddresses(addresses: string[]): Promise<Utxo[]>;
    /**
     * Attach rune balance info to a UTXO (from indexer data).
     */
    setRuneBalance(txid: string, vout: number, balance: RuneBalance): void;
    /**
     * Get all UTXOs.
     */
    getAll(): Utxo[];
    /**
     * Get UTXOs containing a specific rune.
     */
    getRuneUtxos(runeId: RuneId): Utxo[];
    /**
     * Get plain Bitcoin UTXOs (no runes attached) for fee funding.
     */
    getBitcoinUtxos(): Utxo[];
    /**
     * Select UTXOs to cover a target amount.
     */
    selectForAmount(utxos: Utxo[], targetSats: number): {
        selected: Utxo[];
        totalValue: number;
    };
    /**
     * Mark a UTXO as spent (remove from tracking).
     */
    spend(txid: string, vout: number): void;
    /**
     * Add a new UTXO (e.g., from a received transaction).
     */
    add(utxo: Utxo): void;
    /**
     * Get total Bitcoin balance (excluding rune UTXOs).
     */
    getBitcoinBalance(): number;
    /**
     * Get rune balances aggregated by rune name.
     */
    getRuneBalances(): Map<string, {
        runeId: RuneId;
        total: bigint;
    }>;
    /**
     * Broadcast a signed transaction.
     */
    broadcastTransaction(txHex: string): Promise<string>;
    /**
     * Get current block height.
     */
    getBlockHeight(): Promise<number>;
    /**
     * Get raw transaction hex.
     */
    getRawTransaction(txid: string): Promise<string>;
    /**
     * Check if transaction is confirmed.
     */
    isConfirmed(txid: string, required?: number): Promise<boolean>;
    private bitcoinRpc;
}
//# sourceMappingURL=UTXOManager.d.ts.map
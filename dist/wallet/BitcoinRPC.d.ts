/**
 * BitcoinRPC — Simple Bitcoin RPC client with mempool.space REST API fallback.
 *
 * Supports both bitcoin-core RPC (localhost) and mempool.space public API.
 */
/** Raw transaction data from RPC or API */
export interface RawTransaction {
    txid: string;
    hex: string;
    vout: Array<{
        value: number;
        n: number;
        scriptPubKey: {
            hex: string;
            address?: string;
            type: string;
        };
    }>;
    vin: Array<{
        txid: string;
        vout: number;
        scriptSig?: {
            hex: string;
        };
        txinwitness?: string[];
    }>;
    confirmations?: number;
    blockhash?: string;
    blockheight?: number;
}
/** Block data */
export interface BlockData {
    hash: string;
    height: number;
    tx: string[];
    previousblockhash?: string;
    time: number;
}
/** Fee estimation result */
export interface FeeEstimation {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    minimumFee: number;
}
export type RPCBackend = 'bitcoind' | 'mempool';
interface RPCConfig {
    /** Backend type */
    backend: RPCBackend;
    /** Bitcoin Core RPC URL (for 'bitcoind' backend) */
    rpcUrl?: string;
    /** Bitcoin Core RPC username */
    rpcUser?: string;
    /** Bitcoin Core RPC password */
    rpcPass?: string;
    /** Mempool.space base URL (default: https://mempool.space) */
    mempoolUrl?: string;
}
/**
 * Bitcoin RPC client with dual-backend support.
 * Uses bitcoin-core JSON-RPC or mempool.space REST API.
 */
export declare class BitcoinRPC {
    private backend;
    private rpcUrl;
    private rpcUser;
    private rpcPass;
    private mempoolUrl;
    constructor(config: RPCConfig);
    /**
     * Creates a BitcoinRPC instance using mempool.space as backend (no node required).
     */
    static mempool(baseUrl?: string): BitcoinRPC;
    /**
     * Creates a BitcoinRPC instance using bitcoin-core RPC.
     */
    static bitcoind(rpcUrl: string, rpcUser: string, rpcPass: string): BitcoinRPC;
    /** Fetch mempool transaction IDs */
    getMempool(): Promise<string[]>;
    /** Get raw transaction data */
    getRawTransaction(txid: string): Promise<RawTransaction>;
    /** Get raw transaction hex */
    getRawTransactionHex(txid: string): Promise<string>;
    /** Broadcast a raw transaction hex to the network */
    broadcastTx(rawTxHex: string): Promise<string>;
    /** Estimate fee rate in sat/vB for target confirmation blocks */
    estimateFee(targetBlocks?: number): Promise<number>;
    /** Get block hash by height */
    getBlockHash(height: number): Promise<string>;
    /** Get full block data by hash */
    getBlock(hash: string): Promise<BlockData>;
    /** Get current blockchain tip height */
    getBlockCount(): Promise<number>;
    /** Get transactions for a specific address */
    getAddressTransactions(address: string): Promise<RawTransaction[]>;
    /** Get unconfirmed (mempool) transactions for a specific address */
    getAddressMempoolTxs(address: string): Promise<RawTransaction[]>;
    private rpcCall;
    private mempoolGet;
    private mempoolPost;
}
export {};
//# sourceMappingURL=BitcoinRPC.d.ts.map
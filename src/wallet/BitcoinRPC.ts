/**
 * BitcoinRPC — Simple Bitcoin RPC client with mempool.space REST API fallback.
 *
 * Supports both bitcoin-core RPC (localhost) and mempool.space public API.
 */

import * as http from 'http';
import * as https from 'https';

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
    scriptSig?: { hex: string };
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
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Bitcoin RPC client with dual-backend support.
 * Uses bitcoin-core JSON-RPC or mempool.space REST API.
 */
export class BitcoinRPC {
  private backend: RPCBackend;
  private rpcUrl: string;
  private rpcUser: string;
  private rpcPass: string;
  private mempoolUrl: string;
  private timeoutMs: number;

  constructor(config: RPCConfig) {
    this.backend = config.backend;
    this.rpcUrl = config.rpcUrl || 'http://localhost:8332';
    this.rpcUser = config.rpcUser || '';
    this.rpcPass = config.rpcPass || '';
    this.mempoolUrl = config.mempoolUrl || 'https://mempool.space';
    this.timeoutMs = config.timeoutMs || 30_000;
  }

  /**
   * Creates a BitcoinRPC instance using mempool.space as backend (no node required).
   */
  static mempool(baseUrl?: string): BitcoinRPC {
    return new BitcoinRPC({ backend: 'mempool', mempoolUrl: baseUrl });
  }

  /**
   * Creates a BitcoinRPC instance using bitcoin-core RPC.
   */
  static bitcoind(rpcUrl: string, rpcUser: string, rpcPass: string): BitcoinRPC {
    return new BitcoinRPC({ backend: 'bitcoind', rpcUrl, rpcUser, rpcPass });
  }

  /** Fetch mempool transaction IDs */
  async getMempool(): Promise<string[]> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<string[]>('/api/mempool/txids');
    }
    return this.rpcCall<string[]>('getrawmempool');
  }

  /** Get raw transaction data */
  async getRawTransaction(txid: string): Promise<RawTransaction> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<RawTransaction>(`/api/tx/${txid}`);
    }
    return this.rpcCall<RawTransaction>('getrawtransaction', [txid, true]);
  }

  /** Get raw transaction hex */
  async getRawTransactionHex(txid: string): Promise<string> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<string>(`/api/tx/${txid}/hex`);
    }
    return this.rpcCall<string>('getrawtransaction', [txid, false]);
  }

  /** Broadcast a raw transaction hex to the network */
  async broadcastTx(rawTxHex: string): Promise<string> {
    if (this.backend === 'mempool') {
      return this.mempoolPost('/api/tx', rawTxHex);
    }
    return this.rpcCall<string>('sendrawtransaction', [rawTxHex]);
  }

  /** Estimate fee rate in sat/vB for target confirmation blocks */
  async estimateFee(targetBlocks: number = 6): Promise<number> {
    if (this.backend === 'mempool') {
      const fees = await this.mempoolGet<FeeEstimation>('/api/v1/fees/recommended');
      if (targetBlocks <= 1) return fees.fastestFee;
      if (targetBlocks <= 3) return fees.halfHourFee;
      if (targetBlocks <= 6) return fees.hourFee;
      return fees.minimumFee;
    }
    const result = await this.rpcCall<{ feerate?: number; errors?: string[] }>(
      'estimatesmartfee',
      [targetBlocks]
    );
    if (result.feerate) {
      // Convert BTC/kB to sat/vB
      return Math.ceil(result.feerate * 100_000);
    }
    return 2; // fallback: 2 sat/vB
  }

  /** Get block hash by height */
  async getBlockHash(height: number): Promise<string> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<string>(`/api/block-height/${height}`);
    }
    return this.rpcCall<string>('getblockhash', [height]);
  }

  /** Get full block data by hash */
  async getBlock(hash: string): Promise<BlockData> {
    if (this.backend === 'mempool') {
      const block = await this.mempoolGet<any>(`/api/block/${hash}`);
      const txids = await this.mempoolGet<string[]>(`/api/block/${hash}/txids`);
      return {
        hash: block.id,
        height: block.height,
        tx: txids,
        previousblockhash: block.previousblockhash,
        time: block.timestamp,
      };
    }
    return this.rpcCall<BlockData>('getblock', [hash, 1]);
  }

  /** Get current blockchain tip height */
  async getBlockCount(): Promise<number> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<number>('/api/blocks/tip/height');
    }
    return this.rpcCall<number>('getblockcount');
  }

  /** Get transactions for a specific address */
  async getAddressTransactions(address: string): Promise<RawTransaction[]> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<RawTransaction[]>(`/api/address/${address}/txs`);
    }
    throw new Error('getAddressTransactions not supported via bitcoind RPC — use mempool backend');
  }

  /** Get unconfirmed (mempool) transactions for a specific address */
  async getAddressMempoolTxs(address: string): Promise<RawTransaction[]> {
    if (this.backend === 'mempool') {
      return this.mempoolGet<RawTransaction[]>(`/api/address/${address}/txs/mempool`);
    }
    throw new Error('getAddressMempoolTxs not supported via bitcoind RPC — use mempool backend');
  }

  // ── Internal: Bitcoin Core JSON-RPC ──

  private async rpcCall<T>(method: string, params: any[] = []): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    });

    const url = new URL(this.rpcUrl);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise<T>((resolve, reject) => {
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 8332),
          path: url.pathname,
          method: 'POST',
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${this.rpcUser}:${this.rpcPass}`).toString('base64'),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.error) reject(new Error(`RPC error: ${json.error.message}`));
              else resolve(json.result as T);
            } catch (e) {
              reject(new Error(`Failed to parse RPC response: ${data.slice(0, 200)}`));
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`RPC request timed out after ${this.timeoutMs}ms`));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // ── Internal: mempool.space REST API ──

  private async mempoolGet<T>(path: string): Promise<T> {
    const url = `${this.mempoolUrl}${path}`;
    const transport = url.startsWith('https') ? https : http;

    return new Promise<T>((resolve, reject) => {
      const req = transport.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            // Some endpoints return plain text (e.g., block hash, tx hex)
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              resolve(JSON.parse(data) as T);
            } else {
              // Try JSON first, fall back to raw string
              try {
                resolve(JSON.parse(data) as T);
              } catch {
                resolve(data as unknown as T);
              }
            }
          } catch (e) {
            reject(new Error(`Failed to parse mempool response: ${data.slice(0, 200)}`));
          }
        });
      });
      req.setTimeout(this.timeoutMs, () => {
        req.destroy();
        reject(new Error(`Mempool GET timed out after ${this.timeoutMs}ms`));
      });
      req.on('error', reject);
    });
  }

  private async mempoolPost(path: string, body: string): Promise<string> {
    const url = new URL(`${this.mempoolUrl}${path}`);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    return new Promise<string>((resolve, reject) => {
      const req = transport.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname,
          method: 'POST',
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Broadcast failed (${res.statusCode}): ${data}`));
            } else {
              resolve(data.trim());
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Broadcast request timed out after ${this.timeoutMs}ms`));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

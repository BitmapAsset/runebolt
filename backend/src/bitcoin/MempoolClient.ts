/**
 * Client for the mempool.space REST API.
 * Provides access to UTXOs, transactions, fee estimates, and broadcasting.
 *
 * Supports mainnet, testnet, and signet via BITCOIN_NETWORK env var.
 */

export interface UTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TxInput[];
  vout: TxOutput[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface TxInput {
  txid: string;
  vout: number;
  prevout: TxOutput | null;
  scriptsig: string;
  sequence: number;
  witness?: string[];
}

export interface TxOutput {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address?: string;
  value: number;
}

export interface FeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

/**
 * Resolve the mempool.space base URL from environment.
 * MEMPOOL_API takes precedence; otherwise inferred from BITCOIN_NETWORK.
 */
function resolveBaseUrl(): string {
  if (process.env.MEMPOOL_API) {
    return process.env.MEMPOOL_API;
  }

  const network = process.env.BITCOIN_NETWORK || 'mainnet';
  switch (network) {
    case 'testnet':
      return 'https://mempool.space/testnet/api';
    case 'signet':
      return 'https://mempool.space/signet/api';
    default:
      return 'https://mempool.space/api';
  }
}

export class MempoolClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || resolveBaseUrl();
  }

  /**
   * Fetch UTXOs for a given Bitcoin address.
   */
  async getUtxos(address: string): Promise<UTXO[]> {
    const url = `${this.baseUrl}/address/${address}/utxo`;
    console.log(`[MempoolClient] Fetching UTXOs for ${address}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as UTXO[];
  }

  /**
   * Fetch a transaction by its txid.
   */
  async getTx(txid: string): Promise<Transaction> {
    const url = `${this.baseUrl}/tx/${txid}`;
    console.log(`[MempoolClient] Fetching tx ${txid}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as Transaction;
  }

  /**
   * Fetch raw transaction hex by txid.
   */
  async getTxHex(txid: string): Promise<string> {
    const url = `${this.baseUrl}/tx/${txid}/hex`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tx hex: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Broadcast a signed transaction to the network.
   * Returns the txid on success.
   */
  async broadcastTx(txHex: string): Promise<string> {
    const url = `${this.baseUrl}/tx`;
    console.log(`[MempoolClient] Broadcasting transaction (${txHex.length / 2} bytes)`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to broadcast transaction: ${response.status} — ${errorText}`);
    }

    const txid = await response.text();
    console.log(`[MempoolClient] Transaction broadcast successful: ${txid}`);
    return txid;
  }

  /**
   * Get the current block height.
   */
  async getBlockHeight(): Promise<number> {
    const url = `${this.baseUrl}/blocks/tip/height`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch block height: ${response.status} ${response.statusText}`);
    }

    const height = await response.text();
    return parseInt(height, 10);
  }

  /**
   * Get current fee estimates (in sat/vB).
   */
  async getFeeEstimates(): Promise<FeeEstimates> {
    const url = `${this.baseUrl}/v1/fees/recommended`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch fee estimates: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as FeeEstimates;
  }

  /**
   * Check if a transaction is confirmed.
   */
  async isConfirmed(txid: string): Promise<boolean> {
    try {
      const tx = await this.getTx(txid);
      return tx.status.confirmed;
    } catch {
      return false;
    }
  }

  /**
   * Get the address for UTXOs (alias for getUtxos for backward compat).
   */
  async getAddressUtxos(address: string): Promise<UTXO[]> {
    return this.getUtxos(address);
  }

  /**
   * Get transaction details (alias for getTx).
   */
  async getTransaction(txid: string): Promise<Transaction> {
    return this.getTx(txid);
  }
}

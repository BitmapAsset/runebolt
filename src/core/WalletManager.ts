import * as bitcoin from 'bitcoinjs-lib';
import { createLogger } from '../utils/logger';
import { InsufficientFundsError } from '../utils/errors';
import { BridgeConfig, UtxoRef } from '../types';

const log = createLogger('WalletManager');

interface Utxo extends UtxoRef {
  scriptPubKey: string;
  confirmations: number;
}

export class WalletManager {
  private readonly network: bitcoin.Network;
  private readonly rpcUrl: string;
  private readonly rpcUser: string;
  private readonly rpcPass: string;

  constructor(config: BridgeConfig) {
    this.network =
      config.network === 'mainnet'
        ? bitcoin.networks.bitcoin
        : config.network === 'testnet'
          ? bitcoin.networks.testnet
          : bitcoin.networks.regtest;
    this.rpcUrl = config.bitcoin.rpcUrl;
    this.rpcUser = config.bitcoin.rpcUser;
    this.rpcPass = config.bitcoin.rpcPass;
  }

  /**
   * List UTXOs for the bridge wallet (for funding fee payments).
   */
  async listUtxos(address: string, minConfirmations: number = 1): Promise<Utxo[]> {
    log.info({ address, minConfirmations }, 'Listing UTXOs');
    const result = await this.bitcoinRpc('listunspent', [
      minConfirmations,
      9999999,
      [address],
    ]);

    return result.map((u: any) => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round(u.amount * 1e8),
      scriptPubKey: u.scriptPubKey,
      confirmations: u.confirmations,
    }));
  }

  /**
   * Select UTXOs to cover a target amount using a simple accumulator strategy.
   */
  selectUtxos(utxos: Utxo[], targetSats: number): { selected: Utxo[]; totalValue: number } {
    // Sort by value descending for fewer inputs
    const sorted = [...utxos].sort((a, b) => b.value - a.value);

    const selected: Utxo[] = [];
    let totalValue = 0;

    for (const utxo of sorted) {
      selected.push(utxo);
      totalValue += utxo.value;
      if (totalValue >= targetSats) {
        break;
      }
    }

    if (totalValue < targetSats) {
      throw new InsufficientFundsError(
        `Insufficient funds: need ${targetSats} sats, have ${totalValue} sats`,
        { targetSats, available: totalValue },
      );
    }

    log.info({ selectedCount: selected.length, totalValue, targetSats }, 'UTXOs selected');
    return { selected, totalValue };
  }

  /**
   * Get the raw transaction hex for a given txid.
   */
  async getRawTransaction(txid: string): Promise<string> {
    return this.bitcoinRpc('getrawtransaction', [txid, false]);
  }

  /**
   * Broadcast a signed transaction.
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    log.info('Broadcasting transaction');
    const txid = await this.bitcoinRpc('sendrawtransaction', [txHex]);
    log.info({ txid }, 'Transaction broadcast');
    return txid;
  }

  /**
   * Get current block height.
   */
  async getBlockHeight(): Promise<number> {
    return this.bitcoinRpc('getblockcount', []);
  }

  /**
   * Generate a new address for receiving.
   */
  async generateAddress(): Promise<string> {
    return this.bitcoinRpc('getnewaddress', ['', 'bech32m']);
  }

  /**
   * Verify that a transaction is confirmed.
   */
  async isConfirmed(txid: string, requiredConfirmations: number = 1): Promise<boolean> {
    try {
      const tx = await this.bitcoinRpc('getrawtransaction', [txid, true]);
      return (tx.confirmations || 0) >= requiredConfirmations;
    } catch {
      return false;
    }
  }

  private async bitcoinRpc(method: string, params: unknown[]): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: '1.0',
      id: Date.now(),
      method,
      params,
    });

    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' + Buffer.from(`${this.rpcUser}:${this.rpcPass}`).toString('base64'),
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Bitcoin RPC error: ${res.status}`);
    }

    const data = (await res.json()) as { result: any; error: any };
    if (data.error) {
      throw new Error(`Bitcoin RPC: ${data.error.message}`);
    }

    return data.result;
  }
}

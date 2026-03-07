import { createLogger } from '../utils/logger';
import { IndexerError } from '../utils/errors';
import { RuneBalance, RuneId, UtxoRef, BridgeConfig } from '../types';

const log = createLogger('RunesIndexer');

interface OrdRuneResponse {
  id: string;
  name: string;
  number: number;
  divisibility: number;
  symbol: string;
  supply: string;
}

interface OrdRuneBalanceEntry {
  rune_id: string;
  rune_name: string;
  amount: string;
  utxo: string;
}

// Input sanitization: only allow safe characters in URL path segments
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.\-:]+$/;

function validatePathSegment(value: string, label: string): void {
  if (!value || !SAFE_IDENTIFIER.test(value)) {
    throw new IndexerError(`Invalid ${label}: contains disallowed characters`);
  }
}

export class RunesIndexer {
  private readonly ordUrl: string;
  private readonly unisatUrl: string;
  private readonly unisatApiKey: string;

  constructor(config: BridgeConfig) {
    this.ordUrl = config.indexer.ordApiUrl;
    this.unisatUrl = config.indexer.unisatApiUrl;
    this.unisatApiKey = config.indexer.unisatApiKey;
  }

  async getRuneInfo(runeName: string): Promise<OrdRuneResponse> {
    validatePathSegment(runeName, 'rune name');
    log.info({ runeName }, 'Fetching rune info');
    try {
      const res = await fetch(`${this.ordUrl}/rune/${runeName}`);
      if (!res.ok) {
        throw new IndexerError(`Rune not found: ${runeName}`, { status: res.status });
      }
      return (await res.json()) as OrdRuneResponse;
    } catch (err) {
      if (err instanceof IndexerError) throw err;
      throw new IndexerError(`Failed to fetch rune info: ${(err as Error).message}`);
    }
  }

  parseRuneId(runeIdStr: string): RuneId {
    const [block, tx] = runeIdStr.split(':').map(Number);
    if (isNaN(block) || isNaN(tx)) {
      throw new IndexerError(`Invalid rune ID format: ${runeIdStr}`);
    }
    return { block, tx };
  }

  formatRuneId(runeId: RuneId): string {
    return `${runeId.block}:${runeId.tx}`;
  }

  async getRuneBalances(address: string): Promise<RuneBalance[]> {
    validatePathSegment(address, 'address');
    log.info({ address }, 'Fetching rune balances');
    try {
      // Try ord API first
      const res = await fetch(`${this.ordUrl}/address/${address}/runes`);
      if (!res.ok) {
        throw new Error(`Ord API returned ${res.status}`);
      }
      const entries = (await res.json()) as OrdRuneBalanceEntry[];
      return entries.map((entry) => {
        const [txid, voutStr] = entry.utxo.split(':');
        return {
          runeId: this.parseRuneId(entry.rune_id),
          runeName: entry.rune_name,
          amount: BigInt(entry.amount),
          address,
          utxo: {
            txid,
            vout: parseInt(voutStr, 10),
            value: 546, // Runes typically sit on dust UTXOs
          },
        };
      });
    } catch (err) {
      log.warn({ err, address }, 'Ord API failed, trying Unisat');
      return this.getRuneBalancesUnisat(address);
    }
  }

  private async getRuneBalancesUnisat(address: string): Promise<RuneBalance[]> {
    validatePathSegment(address, 'address');
    if (!this.unisatApiKey) {
      throw new IndexerError('No Unisat API key configured and ord API unavailable');
    }

    const res = await fetch(
      `${this.unisatUrl}/v1/indexer/address/${address}/runes/balance-list`,
      {
        headers: {
          Authorization: `Bearer ${this.unisatApiKey}`,
        },
      },
    );

    if (!res.ok) {
      throw new IndexerError(`Unisat API error: ${res.status}`);
    }

    const data = (await res.json()) as {
      data: {
        detail: Array<{
          runeid: string;
          rune: string;
          amount: string;
          utxo: { txid: string; vout: number; satoshi: number };
        }>;
      };
    };

    return data.data.detail.map((entry) => ({
      runeId: this.parseRuneId(entry.runeid),
      runeName: entry.rune,
      amount: BigInt(entry.amount),
      address,
      utxo: {
        txid: entry.utxo.txid,
        vout: entry.utxo.vout,
        value: entry.utxo.satoshi,
      },
    }));
  }

  async getRuneBalance(address: string, runeName: string): Promise<RuneBalance | null> {
    const balances = await this.getRuneBalances(address);
    return balances.find((b) => b.runeName.toUpperCase() === runeName.toUpperCase()) ?? null;
  }

  async verifyRuneUtxo(utxo: UtxoRef, runeId: RuneId, expectedAmount: bigint): Promise<boolean> {
    validatePathSegment(utxo.txid, 'txid');
    log.info({ utxo, runeId, expectedAmount: expectedAmount.toString() }, 'Verifying rune UTXO');
    try {
      const res = await fetch(`${this.ordUrl}/output/${utxo.txid}:${utxo.vout}`);
      if (!res.ok) return false;

      const data = (await res.json()) as {
        runes: Array<{ id: string; amount: string }>;
      };

      const runeIdStr = this.formatRuneId(runeId);
      const rune = data.runes?.find((r) => r.id === runeIdStr);
      if (!rune) return false;

      return BigInt(rune.amount) >= expectedAmount;
    } catch (err) {
      log.error({ err }, 'Failed to verify rune UTXO');
      return false;
    }
  }

  async waitForConfirmation(txid: string, confirmations: number = 1): Promise<boolean> {
    validatePathSegment(txid, 'txid');
    log.info({ txid, confirmations }, 'Waiting for transaction confirmation');
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`${this.ordUrl}/tx/${txid}`);
        if (res.ok) {
          const data = (await res.json()) as { confirmations?: number };
          if (data.confirmations && data.confirmations >= confirmations) {
            return true;
          }
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 10_000));
    }
    return false;
  }
}

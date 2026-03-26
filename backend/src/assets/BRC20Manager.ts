/**
 * BRC20Manager — Handles BRC-20 token operations for RuneBolt.
 *
 * IMPORTANT: BRC-20 tokens use a DIFFERENT on-chain mechanism than Runes.
 * - Runes use Runestone OP_RETURN protocol
 * - BRC-20 tokens transfer via inscriptions containing JSON payloads:
 *     { "p": "brc-20", "op": "transfer", "tick": "ordi", "amt": "1000" }
 *
 * For RuneBolt payment channels:
 *   1. User sends BRC-20 inscription to hub multisig address
 *   2. Hub tracks balances off-chain within the channel
 *   3. Settlement: hub inscribes a transfer back to the user's address
 */

import Database from '../db/Database';

/** BRC-20 transfer inscription content */
export interface BRC20TransferContent {
  p: 'brc-20';
  op: 'transfer';
  tick: string;
  amt: string;
}

/** BRC-20 inscription metadata returned from indexer APIs */
export interface BRC20Inscription {
  inscriptionId: string;
  ticker: string;
  amount: string;
  owner: string;
  confirmed: boolean;
}

/** Balance info for a BRC-20 token */
export interface BRC20Balance {
  ticker: string;
  available: string;
  transferable: string;
  total: string;
}

class BRC20Manager {
  private db: Database;
  private readonly unisatBaseUrl: string;

  constructor() {
    this.db = Database.getInstance();
    this.unisatBaseUrl = process.env.UNISAT_API_URL || 'https://open-api.unisat.io/v1';
  }

  /**
   * Build the JSON content for a BRC-20 transfer inscription.
   *
   * This is the payload that gets inscribed on-chain to move BRC-20 tokens.
   * NOT an OP_RETURN — it's an ordinals inscription with JSON content.
   */
  buildTransferInscription(ticker: string, amount: string): BRC20TransferContent {
    if (!ticker || ticker.length < 1 || ticker.length > 5) {
      throw new Error('BRC-20 ticker must be 1-5 characters');
    }

    if (!amount || !/^\d+$/.test(amount)) {
      throw new Error('BRC-20 amount must be a positive integer string');
    }

    if (BigInt(amount) <= 0n) {
      throw new Error('BRC-20 transfer amount must be greater than zero');
    }

    return {
      p: 'brc-20',
      op: 'transfer',
      tick: ticker.toLowerCase(),
      amt: amount,
    };
  }

  /**
   * Serialize a BRC-20 transfer inscription to the JSON string that gets inscribed.
   */
  serializeInscription(content: BRC20TransferContent): string {
    return JSON.stringify(content);
  }

  /**
   * Verify a BRC-20 balance for an address via the Unisat API.
   *
   * In production, this calls the Unisat indexer. In dev/test, returns mock data
   * if UNISAT_API_KEY is not set.
   */
  async verifyBRC20Balance(address: string, ticker: string): Promise<BRC20Balance> {
    const apiKey = process.env.UNISAT_API_KEY;

    if (!apiKey) {
      // Dev/test fallback: return zero balances
      console.warn('[BRC20Manager] No UNISAT_API_KEY set — returning zero balances');
      return {
        ticker,
        available: '0',
        transferable: '0',
        total: '0',
      };
    }

    const url = `${this.unisatBaseUrl}/indexer/address/${address}/brc20/${ticker}/info`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unisat API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      code: number;
      data: {
        availableBalance: string;
        transferableBalance: string;
        overallBalance: string;
      };
    };

    if (data.code !== 0) {
      throw new Error(`Unisat API returned error code: ${data.code}`);
    }

    return {
      ticker,
      available: data.data.availableBalance,
      transferable: data.data.transferableBalance,
      total: data.data.overallBalance,
    };
  }

  /**
   * Get BRC-20 inscriptions held by an address via the Unisat API.
   */
  async getInscriptionsByAddress(address: string): Promise<BRC20Inscription[]> {
    const apiKey = process.env.UNISAT_API_KEY;

    if (!apiKey) {
      console.warn('[BRC20Manager] No UNISAT_API_KEY set — returning empty inscriptions');
      return [];
    }

    const url = `${this.unisatBaseUrl}/indexer/address/${address}/inscription-data?cursor=0&size=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unisat API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      code: number;
      data: {
        inscription: Array<{
          inscriptionId: string;
          contentType: string;
          contentBody: string;
          address: string;
          utxo: { satoshi: number; confirmations: number };
        }>;
      };
    };

    if (data.code !== 0) {
      throw new Error(`Unisat API returned error code: ${data.code}`);
    }

    const brc20Inscriptions: BRC20Inscription[] = [];

    for (const insc of data.data.inscription) {
      if (!insc.contentType?.includes('json')) continue;

      try {
        const content = JSON.parse(insc.contentBody) as Record<string, unknown>;
        if (content.p === 'brc-20' && content.op === 'transfer') {
          brc20Inscriptions.push({
            inscriptionId: insc.inscriptionId,
            ticker: String(content.tick),
            amount: String(content.amt),
            owner: insc.address,
            confirmed: insc.utxo.confirmations > 0,
          });
        }
      } catch {
        // Not valid JSON — skip
      }
    }

    return brc20Inscriptions;
  }

  /**
   * Record a BRC-20 channel deposit in the database.
   * Called when a user sends a BRC-20 inscription to the hub multisig.
   */
  async recordDeposit(
    userPubkey: string,
    assetId: string,
    amount: string,
    inscriptionId: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO asset_balances (user_pubkey, asset_id, balance, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_pubkey, asset_id)
       DO UPDATE SET balance = asset_balances.balance + $3::numeric, updated_at = NOW()`,
      [userPubkey, assetId, amount]
    );

    console.log(`[BRC20Manager] Recorded deposit: ${amount} ${assetId} from ${userPubkey} (inscription: ${inscriptionId})`);
  }

  /**
   * Get a user's off-chain BRC-20 balance tracked by the hub.
   */
  async getChannelBalance(userPubkey: string, assetId: string): Promise<string> {
    const row = await this.db.queryOne<{ balance: string }>(
      'SELECT balance FROM asset_balances WHERE user_pubkey = $1 AND asset_id = $2',
      [userPubkey, assetId]
    );
    return row?.balance ?? '0';
  }
}

export default BRC20Manager;

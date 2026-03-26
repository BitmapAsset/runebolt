/**
 * BitmapEscrow — Escrow model for Bitmap (NFT inscription) trading on RuneBolt.
 *
 * IMPORTANT: Bitmaps are single, non-fungible inscriptions — they CANNOT be split.
 * This is a DIFFERENT model than Rune/BRC-20 payment channels.
 *
 * Transfer model — Atomic swap via escrow:
 *   1. Seller deposits Bitmap inscription to escrow multisig address
 *   2. Buyer deposits payment (BTC/DOG) to escrow
 *   3. Hub verifies both sides arrived
 *   4. Hub releases both atomically (inscription to buyer, payment to seller)
 *   5. If either side doesn't fulfill within timeout, refund
 */

import { v4 as uuidv4 } from 'uuid';
import Database from '../db/Database';

export enum EscrowStatus {
  CREATED = 'created',
  INSCRIPTION_DEPOSITED = 'inscription_deposited',
  PAYMENT_DEPOSITED = 'payment_deposited',
  BOTH_DEPOSITED = 'both_deposited',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

export interface Escrow {
  id: string;
  sellerPubkey: string;
  buyerPubkey: string;
  inscriptionId: string;
  priceAsset: string;
  priceAmount: string;
  status: EscrowStatus;
  timeoutAt: string;
  createdAt: string;
}

export interface EscrowDeposit {
  escrowId: string;
  side: 'seller' | 'buyer';
  txid: string;
  confirmed: boolean;
  createdAt: string;
}

/** Default escrow timeout: 24 hours */
const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

class BitmapEscrow {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Create a new escrow for a Bitmap inscription trade.
   *
   * @param sellerPubkey - Pubkey of the inscription owner
   * @param buyerPubkey  - Pubkey of the buyer
   * @param inscriptionId - The ordinals inscription ID being sold
   * @param priceAsset   - Asset used for payment (e.g. 'btc', 'dog')
   * @param priceAmount  - Price in the smallest unit of priceAsset
   * @param timeoutMs    - Optional timeout in ms (default 24h)
   */
  async createEscrow(
    sellerPubkey: string,
    buyerPubkey: string,
    inscriptionId: string,
    priceAsset: string,
    priceAmount: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<string> {
    if (sellerPubkey === buyerPubkey) {
      throw new Error('Seller and buyer cannot be the same pubkey');
    }

    if (!inscriptionId) {
      throw new Error('Inscription ID is required');
    }

    if (!priceAmount || BigInt(priceAmount) <= 0n) {
      throw new Error('Price must be greater than zero');
    }

    const id = uuidv4();
    const timeoutAt = new Date(Date.now() + timeoutMs).toISOString();

    await this.db.query(
      `INSERT INTO escrows (id, seller_pubkey, buyer_pubkey, inscription_id, price_asset, price_amount, status, timeout_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, sellerPubkey, buyerPubkey, inscriptionId, priceAsset, priceAmount, EscrowStatus.CREATED, timeoutAt]
    );

    console.log(`[BitmapEscrow] Created escrow ${id}: ${inscriptionId} for ${priceAmount} ${priceAsset}`);
    return id;
  }

  /**
   * Record that the seller has deposited the inscription to the escrow multisig.
   */
  async depositInscription(escrowId: string, txid: string): Promise<Escrow> {
    return await this.db.transaction(async (client) => {
      const escrow = await this.getEscrowWithClient(client, escrowId);

      if (escrow.status !== EscrowStatus.CREATED && escrow.status !== EscrowStatus.PAYMENT_DEPOSITED) {
        throw new Error(`Cannot deposit inscription in escrow state: ${escrow.status}`);
      }

      // Record the deposit
      await client.query(
        `INSERT INTO escrow_deposits (escrow_id, side, txid, confirmed)
         VALUES ($1, 'seller', $2, false)`,
        [escrowId, txid]
      );

      // Update escrow status
      const newStatus = escrow.status === EscrowStatus.PAYMENT_DEPOSITED
        ? EscrowStatus.BOTH_DEPOSITED
        : EscrowStatus.INSCRIPTION_DEPOSITED;

      await client.query(
        'UPDATE escrows SET status = $1 WHERE id = $2',
        [newStatus, escrowId]
      );

      return { ...escrow, status: newStatus };
    });
  }

  /**
   * Record that the buyer has deposited payment to the escrow.
   */
  async depositPayment(escrowId: string, txid: string): Promise<Escrow> {
    return await this.db.transaction(async (client) => {
      const escrow = await this.getEscrowWithClient(client, escrowId);

      if (escrow.status !== EscrowStatus.CREATED && escrow.status !== EscrowStatus.INSCRIPTION_DEPOSITED) {
        throw new Error(`Cannot deposit payment in escrow state: ${escrow.status}`);
      }

      // Record the deposit
      await client.query(
        `INSERT INTO escrow_deposits (escrow_id, side, txid, confirmed)
         VALUES ($1, 'buyer', $2, false)`,
        [escrowId, txid]
      );

      // Update escrow status
      const newStatus = escrow.status === EscrowStatus.INSCRIPTION_DEPOSITED
        ? EscrowStatus.BOTH_DEPOSITED
        : EscrowStatus.PAYMENT_DEPOSITED;

      await client.query(
        'UPDATE escrows SET status = $1 WHERE id = $2',
        [newStatus, escrowId]
      );

      return { ...escrow, status: newStatus };
    });
  }

  /**
   * Execute the atomic swap — release inscription to buyer, payment to seller.
   *
   * Only callable when both sides have deposited (status = BOTH_DEPOSITED).
   * In production this would broadcast the release transactions on-chain.
   */
  async executeSwap(escrowId: string): Promise<Escrow> {
    return await this.db.transaction(async (client) => {
      const escrow = await this.getEscrowWithClient(client, escrowId);

      if (escrow.status !== EscrowStatus.BOTH_DEPOSITED) {
        throw new Error(`Cannot execute swap: escrow is in state ${escrow.status}, expected ${EscrowStatus.BOTH_DEPOSITED}`);
      }

      // Mark as executing
      await client.query(
        'UPDATE escrows SET status = $1 WHERE id = $2',
        [EscrowStatus.EXECUTING, escrowId]
      );

      // TODO: In production, broadcast release transactions:
      //   1. Transfer inscription from multisig to buyer address
      //   2. Transfer payment from multisig to seller address
      // For now, mark both deposits as confirmed and complete the escrow.

      await client.query(
        'UPDATE escrow_deposits SET confirmed = true WHERE escrow_id = $1',
        [escrowId]
      );

      await client.query(
        'UPDATE escrows SET status = $1 WHERE id = $2',
        [EscrowStatus.COMPLETED, escrowId]
      );

      console.log(`[BitmapEscrow] Swap executed for escrow ${escrowId}`);
      return { ...escrow, status: EscrowStatus.COMPLETED };
    });
  }

  /**
   * Refund an escrow that has timed out or where one side didn't fulfill.
   *
   * Returns deposits to their original owners.
   */
  async refundEscrow(escrowId: string): Promise<Escrow> {
    return await this.db.transaction(async (client) => {
      const escrow = await this.getEscrowWithClient(client, escrowId);

      const refundableStates: string[] = [
        EscrowStatus.CREATED,
        EscrowStatus.INSCRIPTION_DEPOSITED,
        EscrowStatus.PAYMENT_DEPOSITED,
        EscrowStatus.BOTH_DEPOSITED,
      ];

      if (!refundableStates.includes(escrow.status)) {
        throw new Error(`Cannot refund escrow in state: ${escrow.status}`);
      }

      // Check if timeout has passed (anyone can trigger refund after timeout)
      const now = new Date();
      const timeout = new Date(escrow.timeoutAt);
      if (now < timeout && escrow.status !== EscrowStatus.CREATED) {
        throw new Error('Escrow has not timed out yet — both parties must wait for timeout or complete the swap');
      }

      // TODO: In production, broadcast refund transactions on-chain

      await client.query(
        'UPDATE escrows SET status = $1 WHERE id = $2',
        [EscrowStatus.REFUNDED, escrowId]
      );

      console.log(`[BitmapEscrow] Refunded escrow ${escrowId}`);
      return { ...escrow, status: EscrowStatus.REFUNDED };
    });
  }

  /**
   * Get escrow status and details.
   */
  async getEscrowStatus(escrowId: string): Promise<{ escrow: Escrow; deposits: EscrowDeposit[] }> {
    const escrowRow = await this.db.queryOne<{
      id: string;
      seller_pubkey: string;
      buyer_pubkey: string;
      inscription_id: string;
      price_asset: string;
      price_amount: string;
      status: EscrowStatus;
      timeout_at: string;
      created_at: string;
    }>('SELECT * FROM escrows WHERE id = $1', [escrowId]);

    if (!escrowRow) {
      throw new Error(`Escrow not found: ${escrowId}`);
    }

    const depositRows = await this.db.query<{
      escrow_id: string;
      side: 'seller' | 'buyer';
      txid: string;
      confirmed: boolean;
      created_at: string;
    }>('SELECT * FROM escrow_deposits WHERE escrow_id = $1 ORDER BY created_at ASC', [escrowId]);

    const escrow: Escrow = {
      id: escrowRow.id,
      sellerPubkey: escrowRow.seller_pubkey,
      buyerPubkey: escrowRow.buyer_pubkey,
      inscriptionId: escrowRow.inscription_id,
      priceAsset: escrowRow.price_asset,
      priceAmount: escrowRow.price_amount,
      status: escrowRow.status,
      timeoutAt: escrowRow.timeout_at,
      createdAt: escrowRow.created_at,
    };

    const deposits: EscrowDeposit[] = depositRows.rows.map(d => ({
      escrowId: d.escrow_id,
      side: d.side,
      txid: d.txid,
      confirmed: d.confirmed,
      createdAt: d.created_at,
    }));

    return { escrow, deposits };
  }

  /**
   * Get all escrows for a pubkey (as seller or buyer).
   */
  async getEscrowsByPubkey(pubkey: string): Promise<Escrow[]> {
    const result = await this.db.query<{
      id: string;
      seller_pubkey: string;
      buyer_pubkey: string;
      inscription_id: string;
      price_asset: string;
      price_amount: string;
      status: EscrowStatus;
      timeout_at: string;
      created_at: string;
    }>(
      'SELECT * FROM escrows WHERE seller_pubkey = $1 OR buyer_pubkey = $1 ORDER BY created_at DESC',
      [pubkey]
    );

    return result.rows.map(r => ({
      id: r.id,
      sellerPubkey: r.seller_pubkey,
      buyerPubkey: r.buyer_pubkey,
      inscriptionId: r.inscription_id,
      priceAsset: r.price_asset,
      priceAmount: r.price_amount,
      status: r.status,
      timeoutAt: r.timeout_at,
      createdAt: r.created_at,
    }));
  }

  // Internal helper: fetch escrow within an existing transaction
  private async getEscrowWithClient(
    client: import('pg').PoolClient,
    escrowId: string,
  ): Promise<Escrow> {
    const result = await client.query(
      'SELECT * FROM escrows WHERE id = $1 FOR UPDATE',
      [escrowId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Escrow not found: ${escrowId}`);
    }

    return {
      id: row.id,
      sellerPubkey: row.seller_pubkey,
      buyerPubkey: row.buyer_pubkey,
      inscriptionId: row.inscription_id,
      priceAsset: row.price_asset,
      priceAmount: row.price_amount,
      status: row.status as EscrowStatus,
      timeoutAt: row.timeout_at,
      createdAt: row.created_at,
    };
  }
}

export default BitmapEscrow;

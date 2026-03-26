/**
 * FeeManager — calculates and records fees for RuneBolt transfers.
 *
 * Free tier: first 500 transactions per user are free.
 * After free tier:
 *   - Off-chain transfer fee: 0.1%
 *   - Settlement (on-chain) fee: 0.5%
 */

import Database from '../db/Database';

const FREE_TIER_LIMIT = 500;
const OFF_CHAIN_FEE_RATE = 0.001;  // 0.1%
const SETTLEMENT_FEE_RATE = 0.005; // 0.5%

export type FeeType = 'off_chain' | 'settlement';

export interface FeeCalculation {
  feeAmount: bigint;
  feeRate: number;
  feeType: FeeType;
  isFree: boolean;
  freeTransactionsRemaining: number;
}

export interface FeeRecord {
  transferId: string;
  pubkey: string;
  amount: bigint;
  feeType: FeeType;
  feeRate: number;
}

export class FeeManager {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Calculate the fee for a transfer based on user tier and transaction count.
   */
  async calculateFee(
    pubkey: string,
    transferAmount: bigint,
    feeType: FeeType = 'off_chain'
  ): Promise<FeeCalculation> {
    const txCount = await this.db.getTransactionCount(pubkey);
    const currentCount = txCount?.count ?? 0;
    const remaining = Math.max(0, FREE_TIER_LIMIT - currentCount);

    if (remaining > 0) {
      return {
        feeAmount: 0n,
        feeRate: 0,
        feeType,
        isFree: true,
        freeTransactionsRemaining: remaining - 1, // will decrement after this tx
      };
    }

    const rate = feeType === 'settlement' ? SETTLEMENT_FEE_RATE : OFF_CHAIN_FEE_RATE;
    // Pure BigInt arithmetic: multiply by scaled rate, then divide to avoid Number precision loss
    const scaledRate = BigInt(Math.round(rate * 1_000_000));
    const feeAmount = (transferAmount * scaledRate + 999_999n) / 1_000_000n; // ceil division

    return {
      feeAmount,
      feeRate: rate,
      feeType,
      isFree: false,
      freeTransactionsRemaining: 0,
    };
  }

  /**
   * Record a fee and increment the user's transaction count.
   * Call this after a successful transfer.
   */
  async recordFee(
    transferId: string,
    pubkey: string,
    feeCalc: FeeCalculation
  ): Promise<void> {
    // Always increment transaction count
    await this.db.incrementTransactionCount(pubkey);

    // Record in fee_ledger (tracks all transactions including free ones)
    await this.db.query(
      `INSERT INTO fee_ledger (user_pubkey, transfer_id, fee_amount, fee_type)
       VALUES ($1, $2, $3, $4)`,
      [pubkey, transferId, feeCalc.feeAmount.toString(), feeCalc.isFree ? 'free' : feeCalc.feeType]
    );

    // Update free_remaining and total_fees_paid in user_transaction_counts
    await this.db.query(
      `UPDATE user_transaction_counts
       SET free_remaining = GREATEST(0, 500 - count),
           total_fees_paid = total_fees_paid + $1
       WHERE pubkey = $2`,
      [feeCalc.feeAmount.toString(), pubkey]
    );

    // Only record a fee_records entry if there was a non-zero fee
    if (feeCalc.feeAmount > 0n) {
      await this.db.createFeeRecord({
        transfer_id: transferId,
        pubkey,
        amount: feeCalc.feeAmount.toString(),
        fee_type: feeCalc.feeType,
        fee_rate: feeCalc.feeRate,
      });
    }

    // Auto-upgrade tier when free transactions are exhausted
    if (feeCalc.freeTransactionsRemaining === 0 && feeCalc.isFree) {
      await this.db.updateUserTier(pubkey, 'standard');
    }
  }

  /**
   * Get the number of free transactions remaining for a user.
   */
  async getFreeTransactionsRemaining(pubkey: string): Promise<number> {
    const txCount = await this.db.getTransactionCount(pubkey);
    const currentCount = txCount?.count ?? 0;
    return Math.max(0, FREE_TIER_LIMIT - currentCount);
  }

  /**
   * Get user tier info for API responses.
   */
  async getUserTierInfo(pubkey: string): Promise<{
    tier: string;
    transactionCount: number;
    freeTransactionsRemaining: number;
    feeRates: { offChain: string; settlement: string };
  }> {
    const [tierRow, txCount] = await Promise.all([
      this.db.getUserTier(pubkey),
      this.db.getTransactionCount(pubkey),
    ]);

    const currentCount = txCount?.count ?? 0;
    const remaining = Math.max(0, FREE_TIER_LIMIT - currentCount);
    const tier = tierRow?.tier ?? 'free';

    return {
      tier,
      transactionCount: currentCount,
      freeTransactionsRemaining: remaining,
      feeRates: {
        offChain: remaining > 0 ? '0%' : `${OFF_CHAIN_FEE_RATE * 100}%`,
        settlement: remaining > 0 ? '0%' : `${SETTLEMENT_FEE_RATE * 100}%`,
      },
    };
  }
}

export default FeeManager;

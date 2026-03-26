/**
 * Fee API routes — fee status and schedule endpoints.
 */

import { Router, Request, Response } from 'express';
import Database from '../../db/Database';
import { FeeManager } from '../../fees/FeeManager';

const router = Router();
const db = Database.getInstance();
const feeManager = new FeeManager();

/**
 * GET /status/:pubkey
 * Returns free transactions remaining, total fees paid, and tier info.
 */
router.get('/status/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const user = await db.getUser(pubkey);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        userMessage: 'No user found with this public key.',
      });
      return;
    }

    const tierInfo = await feeManager.getUserTierInfo(pubkey);

    // Get total fees paid from fee_records
    const feesResult = await db.queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM fee_records WHERE pubkey = $1',
      [pubkey]
    );
    const totalFeesPaid = feesResult?.total || '0';

    res.json({
      success: true,
      data: {
        pubkey,
        tier: tierInfo.tier,
        transactionCount: tierInfo.transactionCount,
        freeTransactionsRemaining: tierInfo.freeTransactionsRemaining,
        totalFeesPaid,
        currentRates: tierInfo.feeRates,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[feeRoutes] GET /status/:pubkey error:', message);
    res.status(500).json({
      success: false,
      error: message,
      userMessage: 'Failed to retrieve fee status. Please try again.',
    });
  }
});

/**
 * GET /schedule
 * Returns the fee schedule for all tiers.
 */
router.get('/schedule', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      freeTier: {
        freeTransactions: 500,
        offChainFeeRate: '0%',
        settlementFeeRate: '0%',
        description: 'First 500 transactions are completely free',
      },
      standardTier: {
        offChainFeeRate: '0.1%',
        settlementFeeRate: '0.5%',
        description: 'After 500 free transactions, standard micro-fees apply',
      },
    },
  });
});

export default router;

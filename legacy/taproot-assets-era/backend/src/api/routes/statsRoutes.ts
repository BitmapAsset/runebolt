/**
 * Public stats and user tier API routes.
 */

import { Router, Request, Response } from 'express';
import Database from '../../db/Database';
import { FeeManager } from '../../fees/FeeManager';

const router = Router();
const db = Database.getInstance();
const feeManager = new FeeManager();

/**
 * GET /stats
 * Public stats endpoint: total users, transfers, volume, channels.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await db.getPublicStats();

    res.json({
      success: true,
      data: {
        totalUsers: stats.totalUsers,
        totalTransfers: stats.totalTransfers,
        totalVolume: stats.totalVolume,
        totalChannels: stats.totalChannels,
        openChannels: stats.openChannels,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[statsRoutes] GET /stats error:', message);
    res.status(500).json({
      success: false,
      error: message,
      userMessage: 'Failed to retrieve platform statistics. Please try again.',
    });
  }
});

/**
 * GET /user/:pubkey/tier
 * Get user tier info and remaining free transactions.
 */
router.get('/user/:pubkey/tier', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      data: tierInfo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[statsRoutes] GET /user/:pubkey/tier error:', message);
    res.status(500).json({
      success: false,
      error: message,
      userMessage: 'Failed to retrieve tier information. Please try again.',
    });
  }
});

export default router;

/**
 * User management API routes.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Database from '../../db/Database';
import { ChannelManager } from '../../channels/ChannelManager';
import { channelToJson } from '../../channels/ChannelState';
import { requireAuth } from '../../auth/AuthMiddleware';
import { FeeManager } from '../../fees/FeeManager';

const router = Router();
const db = Database.getInstance();
const channelManager = new ChannelManager();
const feeManager = new FeeManager();

/**
 * GET /user/:pubkey
 * Get user info, their channels, and aggregate balance.
 */
router.get('/user/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const user = await db.getUser(pubkey);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const channels = await channelManager.getChannelsByPubkey(pubkey);

    // Aggregate balance across all open channels
    let totalLocal = 0n;
    let totalRemote = 0n;
    let totalCapacity = 0n;

    for (const channel of channels) {
      if (channel.state === 'OPEN') {
        totalLocal += channel.localBalance;
        totalRemote += channel.remoteBalance;
        totalCapacity += channel.capacity;
      }
    }

    const freeRemaining = await feeManager.getFreeTransactionsRemaining(pubkey);

    res.json({
      success: true,
      data: {
        pubkey: user.pubkey,
        username: user.username,
        createdAt: user.created_at,
        channels: channels.map(channelToJson),
        aggregateBalance: {
          local: totalLocal.toString(),
          remote: totalRemote.toString(),
          capacity: totalCapacity.toString(),
        },
        channelCount: channels.length,
        openChannelCount: channels.filter((c) => c.state === 'OPEN').length,
        freeTransactionsRemaining: freeRemaining,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[userRoutes] GET /user/:pubkey error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /user/register
 * Register a username for the authenticated user's pubkey.
 */
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
});

router.post('/user/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { username } = parsed.data;
    const pubkey = req.auth!.pubkey;

    // Check if username is already taken
    const existing = await db.getUserByUsername(username);
    if (existing && existing.pubkey !== pubkey) {
      res.status(409).json({
        success: false,
        error: 'Username is already taken',
      });
      return;
    }

    // Ensure user exists
    await db.createUser(pubkey);

    // Update username
    await db.updateUsername(pubkey, username);

    const user = await db.getUser(pubkey);

    res.json({
      success: true,
      data: {
        pubkey: user!.pubkey,
        username: user!.username,
        createdAt: user!.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('UNIQUE constraint')) {
      res.status(409).json({
        success: false,
        error: 'Username is already taken',
      });
      return;
    }
    console.error('[userRoutes] POST /user/register error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

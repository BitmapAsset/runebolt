/**
 * Authentication API routes using challenge-response with Bitcoin signing.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ChallengeManager } from '../../auth/ChallengeManager';
import { generateToken, requireAuth } from '../../auth/AuthMiddleware';
import Database from '../../db/Database';

const router = Router();
const challengeManager = new ChallengeManager();
const db = Database.getInstance();

/**
 * POST /auth/challenge
 * Generate a challenge for the given pubkey to sign.
 */
const challengeSchema = z.object({
  pubkey: z
    .string()
    .min(64, 'Public key must be at least 64 characters')
    .max(66, 'Public key must be at most 66 characters'),
});

router.post('/auth/challenge', async (req: Request, res: Response) => {
  try {
    const parsed = challengeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { pubkey } = parsed.data;
    const { challengeId, message } = await challengeManager.createChallenge(pubkey);

    res.json({
      success: true,
      data: {
        challengeId,
        message,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authRoutes] POST /auth/challenge error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /auth/verify
 * Verify a signed challenge and return a JWT.
 */
const verifySchema = z.object({
  challengeId: z.string().uuid('Invalid challengeId format'),
  signature: z.string().min(1, 'Signature is required'),
});

router.post('/auth/verify', async (req: Request, res: Response) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { challengeId, signature } = parsed.data;
    const result = await challengeManager.verifyChallenge(challengeId, signature);

    if (!result.valid || !result.pubkey) {
      res.status(401).json({
        success: false,
        error: 'Challenge verification failed. The challenge may have expired or the signature is invalid.',
      });
      return;
    }

    // Ensure user exists in the database
    db.createUser(result.pubkey);

    // Generate JWT
    const token = generateToken(result.pubkey);

    res.json({
      success: true,
      data: {
        token,
        pubkey: result.pubkey,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authRoutes] POST /auth/verify error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /auth/me
 * Get the current authenticated user's info.
 */
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const pubkey = req.auth!.pubkey;
    const user = await db.getUser(pubkey);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        pubkey: user.pubkey,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authRoutes] GET /auth/me error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

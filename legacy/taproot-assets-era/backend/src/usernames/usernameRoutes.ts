import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Database from '../db/Database';
import { requireAuth } from '../auth/AuthMiddleware';
import { generateUsername, isValidUsername } from './usernameUtils';

const router = Router();
const db = Database.getInstance();

/**
 * Username validation and availability check
 * GET /usernames/check/:username
 */
router.get('/usernames/check/:username', async (req: Request, res: Response) => {
  try {
    const username = req.params.username.toLowerCase().replace(/^@/, '');
    
    if (!isValidUsername(username)) {
      res.json({
        success: true,
        data: {
          available: false,
          reason: 'Username must be 3-20 characters, letters, numbers, and underscores only',
        },
      });
      return;
    }

    const existing = await db.getUserByUsername(username);
    
    res.json({
      success: true,
      data: {
        available: !existing,
        username: username,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[usernameRoutes] GET /usernames/check error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get username for a pubkey
 * GET /usernames/resolve/:pubkey
 */
router.get('/usernames/resolve/:pubkey', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      data: {
        pubkey: user.pubkey,
        username: user.username,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[usernameRoutes] GET /usernames/resolve error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Resolve username to pubkey
 * GET /usernames/:username
 */
router.get('/usernames/:username', async (req: Request, res: Response) => {
  try {
    const username = req.params.username.toLowerCase().replace(/^@/, '');
    const user = await db.getUserByUsername(username);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Username not found',
        userFriendly: {
          title: "We couldn't find @" + username,
          message: 'Check the spelling or ask them to join RuneBolt.',
          action: 'You can send them a claim link instead!',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        pubkey: user.pubkey,
        profileUrl: `https://runebolt.io/${user.username}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[usernameRoutes] GET /usernames/:username error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Register or update username (authenticated)
 * POST /usernames/register
 */
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

router.post('/usernames/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
        userFriendly: {
          title: 'Invalid username',
          message: 'Usernames must be 3-20 characters and can only contain letters, numbers, and underscores.',
          action: 'Try a different username',
        },
      });
      return;
    }

    const { username: rawUsername } = parsed.data;
    const username = rawUsername.toLowerCase();
    const pubkey = req.auth!.pubkey;

    const existing = await db.getUserByUsername(username);
    if (existing && existing.pubkey !== pubkey) {
      res.status(409).json({
        success: false,
        error: 'Username already taken',
        userFriendly: {
          title: `@${username} is taken`,
          message: 'Someone else is already using this username.',
          action: 'Try a different variation',
        },
      });
      return;
    }

    await db.updateUsername(pubkey, username);

    res.json({
      success: true,
      data: {
        username,
        pubkey,
        profileUrl: `https://runebolt.io/${username}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[usernameRoutes] POST /usernames/register error:', message);
    res.status(500).json({ 
      success: false, 
      error: message,
      userFriendly: {
        title: 'Something went wrong',
        message: "We couldn't save your username. Please try again.",
        action: 'Try again in a moment',
      },
    });
  }
});

/**
 * Auto-generate a username suggestion
 * GET /usernames/suggest/:prefix?
 */
router.get('/usernames/suggest/:prefix?', async (req: Request, res: Response) => {
  try {
    const prefix = req.params.prefix || 'user';
    const suggestion = generateUsername(prefix);
    
    res.json({
      success: true,
      data: {
        suggestion,
        available: !(await db.getUserByUsername(suggestion)),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[usernameRoutes] GET /usernames/suggest error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;

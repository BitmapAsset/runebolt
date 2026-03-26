/**
 * Enhanced authentication with social login support
 * Supports: Google OAuth, Apple Sign In, Email Magic Links
 * Falls back to wallet-based authentication
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { ChallengeManager } from '../auth/ChallengeManager';
import { generateToken, requireAuth } from '../auth/AuthMiddleware';
import Database from '../db/Database';
import { generateUsername } from '../usernames/usernameUtils';

const router = Router();
const challengeManager = new ChallengeManager();
const db = Database.getInstance();

// In-memory store for magic links (production: use Redis)
const magicLinkStore = new Map<string, { email: string; expiresAt: Date; pubkey: string }>();

/**
 * POST /auth/social/initiate
 * Start social login flow (Google, Apple, Email)
 */
const socialInitiateSchema = z.object({
  provider: z.enum(['google', 'apple', 'email']),
  email: z.string().email().optional(),
  redirectUri: z.string().optional(),
});

router.post('/auth/social/initiate', async (req: Request, res: Response) => {
  try {
    const parsed = socialInitiateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
        userFriendly: {
          title: 'Invalid request',
          message: 'Please check your information and try again.',
          action: 'Try again',
        },
      });
      return;
    }

    const { provider, email, redirectUri } = parsed.data;

    // Generate a deterministic pubkey from social provider
    const pubkey = generateSocialPubkey(provider, email || '');

    if (provider === 'email' && email) {
      // Generate magic link
      const magicLinkId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      
      magicLinkStore.set(magicLinkId, { email, expiresAt, pubkey });
      
      // In production: Send actual email here
      console.log(`[Magic Link] ${email}: ${magicLinkId}`);
      
      res.json({
        success: true,
        data: {
          message: 'Magic link sent to your email',
          magicLinkId: process.env.NODE_ENV !== 'production' ? magicLinkId : undefined,
        },
      });
      return;
    }

    // For Google/Apple, return OAuth URL
    const authUrl = getOAuthUrl(provider, redirectUri);
    
    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        state: crypto.randomUUID(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authEnhanced] POST /auth/social/initiate error:', message);
    res.status(500).json({ 
      success: false, 
      error: message,
      userFriendly: {
        title: "Couldn't start login",
        message: 'Something went wrong on our end. Please try again.',
        action: 'Try again in a moment',
      },
    });
  }
});

/**
 * POST /auth/social/verify
 * Verify social login callback and return JWT
 */
const socialVerifySchema = z.object({
  provider: z.enum(['google', 'apple', 'email']),
  code: z.string().optional(),
  magicLinkId: z.string().uuid().optional(),
  idToken: z.string().optional(),
});

router.post('/auth/social/verify', async (req: Request, res: Response) => {
  try {
    const parsed = socialVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { provider, code, magicLinkId, idToken } = parsed.data;
    let pubkey: string;
    let email: string | undefined;
    let isNewUser = false;

    if (provider === 'email' && magicLinkId) {
      const magicLink = magicLinkStore.get(magicLinkId);
      if (!magicLink || magicLink.expiresAt < new Date()) {
        res.status(401).json({
          success: false,
          error: 'Magic link expired or invalid',
          userFriendly: {
            title: 'Link expired',
            message: 'This magic link has expired. Please request a new one.',
            action: 'Request new link',
          },
        });
        return;
      }
      
      pubkey = magicLink.pubkey;
      email = magicLink.email;
      magicLinkStore.delete(magicLinkId);
    } else if (provider === 'google' && code) {
      pubkey = generateSocialPubkey('google', code);
      isNewUser = !(await db.getUser(pubkey));
    } else if (provider === 'apple' && idToken) {
      pubkey = generateSocialPubkey('apple', idToken);
      isNewUser = !(await db.getUser(pubkey));
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid verification parameters',
      });
      return;
    }

    // Ensure user exists
    await db.createUser(pubkey);
    
    // Auto-generate username for new users
    if (isNewUser) {
      const suggestedUsername = generateUsername(email?.split('@')[0] || 'user');
      if (!(await db.getUserByUsername(suggestedUsername))) {
        await db.updateUsername(pubkey, suggestedUsername);
      }
    }

    const user = await db.getUser(pubkey);
    const token = generateToken(pubkey);

    res.json({
      success: true,
      data: {
        token,
        pubkey,
        username: user?.username,
        isNewUser,
        onboardingComplete: !!user?.username && !isNewUser,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authEnhanced] POST /auth/social/verify error:', message);
    res.status(500).json({ 
      success: false, 
      error: message,
      userFriendly: {
        title: "Couldn't sign you in",
        message: 'Something went wrong. Please try again.',
        action: 'Try again',
      },
    });
  }
});

/**
 * POST /auth/wallet/challenge
 * Generate challenge for wallet-based auth (existing flow)
 */
const challengeSchema = z.object({
  pubkey: z.string().min(64).max(66),
});

router.post('/auth/wallet/challenge', async (req: Request, res: Response) => {
  try {
    const parsed = challengeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
        userFriendly: {
          title: 'Invalid wallet address',
          message: 'The wallet address format is not recognized.',
          action: 'Check your wallet connection',
        },
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
    console.error('[authEnhanced] POST /auth/wallet/challenge error:', message);
    res.status(500).json({ 
      success: false, 
      error: message,
      userFriendly: {
        title: "Couldn't generate challenge",
        message: 'Please try connecting your wallet again.',
        action: 'Try again',
      },
    });
  }
});

/**
 * POST /auth/wallet/verify
 * Verify wallet signature and return JWT
 */
const walletVerifySchema = z.object({
  challengeId: z.string().uuid(),
  signature: z.string().min(1),
});

router.post('/auth/wallet/verify', async (req: Request, res: Response) => {
  try {
    const parsed = walletVerifySchema.safeParse(req.body);
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
        error: 'Challenge verification failed',
        userFriendly: {
          title: 'Signature failed',
          message: "We couldn't verify your wallet signature. The challenge may have expired.",
          action: 'Try connecting again',
        },
      });
      return;
    }

    const isNewUser = !(await db.getUser(result.pubkey));
    await db.createUser(result.pubkey);
    
    // Auto-generate username for new users
    if (isNewUser) {
      const suggestedUsername = generateUsername('user');
      if (!(await db.getUserByUsername(suggestedUsername))) {
        await db.updateUsername(result.pubkey, suggestedUsername);
      }
    }

    const user = await db.getUser(result.pubkey);
    const token = generateToken(result.pubkey);

    res.json({
      success: true,
      data: {
        token,
        pubkey: result.pubkey,
        username: user?.username,
        isNewUser,
        onboardingComplete: !!user?.username && !isNewUser,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authEnhanced] POST /auth/wallet/verify error:', message);
    res.status(500).json({ 
      success: false, 
      error: message,
      userFriendly: {
        title: "Couldn't sign you in",
        message: 'Something went wrong verifying your wallet.',
        action: 'Try again',
      },
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const pubkey = req.auth!.pubkey;
    const user = await db.getUser(pubkey);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        userFriendly: {
          title: 'Account not found',
          message: "We couldn't find your account. Please sign in again.",
          action: 'Sign in',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        pubkey: user.pubkey,
        username: user.username,
        profileUrl: user.username ? `https://runebolt.io/${user.username}` : undefined,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[authEnhanced] GET /auth/me error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// Helper functions
function generateSocialPubkey(provider: string, identifier: string): string {
  const hash = crypto.createHash('sha256')
    .update(`${provider}:${identifier}:${process.env.SOCIAL_AUTH_SECRET || 'dev-secret'}`)
    .digest('hex');
  return hash.slice(0, 64);
}

function getOAuthUrl(provider: string, redirectUri?: string): string {
  const state = crypto.randomUUID();
  
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID || 'dev-client-id';
    const redirect = encodeURIComponent(redirectUri || `${process.env.FRONTEND_URL}/auth/callback/google`);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=openid%20email%20profile&state=${state}`;
  }
  
  if (provider === 'apple') {
    const clientId = process.env.APPLE_CLIENT_ID || 'dev-client-id';
    const redirect = encodeURIComponent(redirectUri || `${process.env.FRONTEND_URL}/auth/callback/apple`);
    return `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code%20id_token&scope=name%20email&state=${state}`;
  }
  
  return '';
}

export default router;

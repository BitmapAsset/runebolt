/**
 * Claim link API routes — shareable links for sending runes.
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Database from '../../db/Database';
import { RuneLedger } from '../../ledger/RuneLedger';
import { requireAuth } from '../../auth/AuthMiddleware';
import { getWebSocketManager } from '../../ws/WebSocketServer';

const router = Router();
const db = Database.getInstance();
const ledger = new RuneLedger();

/** Default claim link expiry: 24 hours */
const CLAIM_LINK_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * POST /claim/create
 * Create a shareable claim link. Requires authentication.
 */
const createClaimSchema = z.object({
  amount: z.string().regex(/^\d+$/, 'Amount must be a numeric string'),
  memo: z.string().max(256, 'Memo must be 256 characters or less').optional(),
  expiresInMs: z
    .number()
    .int()
    .positive()
    .max(7 * 24 * 60 * 60 * 1000, 'Max expiry is 7 days')
    .optional(),
});

router.post('/claim/create', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { amount, memo, expiresInMs } = parsed.data;
    const creatorPubkey = req.auth!.pubkey;

    // Verify creator has sufficient balance in at least one channel
    const creatorChannel = await ledger.findOpenChannelForPubkey(creatorPubkey);
    if (!creatorChannel) {
      res.status(422).json({
        success: false,
        error: 'No open channel found. Open a channel first.',
      });
      return;
    }

    const balance = await ledger.getBalance(creatorChannel);
    if (balance.local < BigInt(amount)) {
      res.status(422).json({
        success: false,
        error: `Insufficient balance: have ${balance.local}, need ${amount}`,
      });
      return;
    }

    const claimId = uuidv4();
    const expiresAt = new Date(
      Date.now() + (expiresInMs || CLAIM_LINK_EXPIRY_MS)
    ).toISOString();

    await db.createClaimLink({
      id: claimId,
      creator_pubkey: creatorPubkey,
      amount: Number(amount),
      memo: memo || null,
      expires_at: expiresAt,
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const claimUrl = `${baseUrl}/api/v1/claim/${claimId}`;

    res.status(201).json({
      success: true,
      data: {
        claimId,
        url: claimUrl,
        amount,
        memo: memo || null,
        expiresAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[claimRoutes] POST /claim/create error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /claim/:claimId
 * Get claim link details.
 */
router.get('/claim/:claimId', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = await db.getClaimLink(claimId);

    if (!claim) {
      res.status(404).json({
        success: false,
        error: 'Claim link not found',
      });
      return;
    }

    // Check if expired
    const isExpired = new Date(claim.expires_at).getTime() < Date.now();

    res.json({
      success: true,
      data: {
        claimId: claim.id,
        creatorPubkey: claim.creator_pubkey,
        amount: claim.amount.toString(),
        memo: claim.memo,
        claimed: !!claim.claimed_by,
        claimedBy: claim.claimed_by,
        claimedAt: claim.claimed_at,
        createdAt: claim.created_at,
        expiresAt: claim.expires_at,
        expired: isExpired,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[claimRoutes] GET /claim/:claimId error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /claim/:claimId/redeem
 * Redeem a claim link. Requires authentication.
 */
router.post('/claim/:claimId/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const claimerPubkey = req.auth!.pubkey;

    const claim = await db.getClaimLink(claimId);
    if (!claim) {
      res.status(404).json({
        success: false,
        error: 'Claim link not found',
      });
      return;
    }

    // Check if already claimed
    if (claim.claimed_by) {
      res.status(409).json({
        success: false,
        error: 'Claim link has already been redeemed',
      });
      return;
    }

    // Check if expired
    if (new Date(claim.expires_at).getTime() < Date.now()) {
      res.status(410).json({
        success: false,
        error: 'Claim link has expired',
      });
      return;
    }

    // Cannot claim your own link
    if (claim.creator_pubkey === claimerPubkey) {
      res.status(400).json({
        success: false,
        error: 'Cannot redeem your own claim link',
      });
      return;
    }

    // Find channels for both parties
    const fromChannel = await ledger.findOpenChannelForPubkey(claim.creator_pubkey);
    if (!fromChannel) {
      res.status(422).json({
        success: false,
        error: 'Creator has no open channel',
      });
      return;
    }

    const toChannel = await ledger.findOpenChannelForPubkey(claimerPubkey);
    if (!toChannel) {
      res.status(422).json({
        success: false,
        error: 'You need an open channel to redeem this claim',
      });
      return;
    }

    // Execute the transfer
    const claimNonce = crypto.randomUUID();
    const claimSignature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback')
      .update(`${fromChannel}:${toChannel}:${claim.amount}:${claimNonce}`)
      .digest('hex');
    
    const transfer = await ledger.transfer(
      fromChannel,
      toChannel,
      BigInt(claim.amount),
      claim.memo || `Claim: ${claimId}`,
      claimNonce,
      claimSignature,
      claim.creator_pubkey
    );

    // Mark as claimed
    await db.claimLink(claimId, claimerPubkey);

    // Broadcast via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastToUser(claim.creator_pubkey, 'claim:redeemed', {
        claimId,
        claimedBy: claimerPubkey,
        amount: claim.amount.toString(),
      });

      wsManager.broadcastToUser(claimerPubkey, 'claim:received', {
        claimId,
        amount: claim.amount.toString(),
        from: claim.creator_pubkey,
      });
    }

    res.json({
      success: true,
      data: {
        claimId,
        transferId: transfer.id,
        amount: claim.amount.toString(),
        memo: claim.memo,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('Insufficient') ? 422 : 500;
    console.error('[claimRoutes] POST /claim/:claimId/redeem error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

export default router;

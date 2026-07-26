/**
 * Channel management API routes.
 *
 * SECURITY: Includes amount bounds checking to prevent overflow and abuse.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ChannelManager } from '../../channels/ChannelManager';
import { channelToJson } from '../../channels/ChannelState';
import { RuneLedger } from '../../ledger/RuneLedger';
import { requireAuth } from '../../auth/AuthMiddleware';
import { getWebSocketManager } from '../../ws/WebSocketServer';
import { calculateReserve, getSpendableBalance } from '../../channels/ChannelReserves';
import { SupportedAsset, DOG_RUNE_ID } from '../../rune/RuneConstants';

const router = Router();
const channelManager = new ChannelManager();
const ledger = new RuneLedger();

/** Channel amount bounds */
const MIN_CHANNEL_AMOUNT = 10_000n;
const MAX_CHANNEL_AMOUNT = 100_000_000_000n;

/**
 * POST /channel/open
 * Open a new payment channel.
 *
 * SECURITY: Validates amount against MIN/MAX channel capacity.
 */
/** Map supported asset types to their rune IDs */
const ASSET_RUNE_MAP: Record<string, string> = {
  [SupportedAsset.DOG]: DOG_RUNE_ID,
};

const openChannelSchema = z.object({
  pubkey: z
    .string()
    .length(66, 'Compressed public key must be exactly 66 hex characters')
    .regex(/^(02|03)[0-9a-fA-F]{64}$/, 'Public key must be a valid compressed pubkey (66-char hex starting with 02 or 03)'),
  amount: z
    .string()
    .regex(/^\d+$/, 'Amount must be a numeric string representing raw units'),
  assetType: z
    .nativeEnum(SupportedAsset)
    .default(SupportedAsset.DOG),
});

router.post('/channel/open', async (req: Request, res: Response) => {
  try {
    const parsed = openChannelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { pubkey, amount, assetType } = parsed.data;
    const amountBigInt = BigInt(amount);

    // Resolve runeId from asset type (BTC channels don't use Runestones)
    const runeId = ASSET_RUNE_MAP[assetType];
    if (assetType !== SupportedAsset.BTC && !runeId) {
      res.status(400).json({
        success: false,
        error: `Unsupported asset type for rune channels: ${assetType}`,
      });
      return;
    }

    // SECURITY: Enforce channel capacity bounds
    if (amountBigInt < MIN_CHANNEL_AMOUNT) {
      res.status(400).json({
        success: false,
        error: `Channel capacity must be at least ${MIN_CHANNEL_AMOUNT} raw units (got ${amount})`,
      });
      return;
    }

    if (amountBigInt > MAX_CHANNEL_AMOUNT) {
      res.status(400).json({
        success: false,
        error: `Channel capacity cannot exceed ${MAX_CHANNEL_AMOUNT} raw units`,
      });
      return;
    }

    const reserve = calculateReserve(amountBigInt);

    const result = await channelManager.openChannel(pubkey, amountBigInt, runeId);

    res.status(201).json({
      success: true,
      data: {
        channelId: result.channelId,
        psbt: result.psbt,
        channelAddress: result.channelAddress,
        assetType,
        reserve: reserve.toString(),
        spendable: getSpendableBalance(amountBigInt, amountBigInt).toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[channelRoutes] POST /channel/open error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /channel/activate
 * Activate a pending channel after user signs the funding PSBT.
 */
const activateChannelSchema = z.object({
  channelId: z.string().uuid('Invalid channelId format'),
  signedPsbt: z.string().min(1, 'signedPsbt is required'),
});

router.post('/channel/activate', async (req: Request, res: Response) => {
  try {
    const parsed = activateChannelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { channelId, signedPsbt } = parsed.data;
    const channel = await channelManager.activateChannel(channelId, signedPsbt);

    // Notify via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastChannelStateChange(channelId, channel.state, {
        capacity: channel.capacity.toString(),
        fundingTxid: channel.fundingTxid,
      });
      wsManager.broadcastToUser(channel.userPubkey, 'channel:activated', {
        channelId,
        state: channel.state,
        capacity: channel.capacity.toString(),
      });
    }

    res.json({
      success: true,
      data: channelToJson(channel),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    console.error('[channelRoutes] POST /channel/activate error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /channel/close
 * Initiate a cooperative channel close. Requires authentication.
 */
const closeChannelSchema = z.object({
  channelId: z.string().uuid('Invalid channelId format'),
});

router.post('/channel/close', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = closeChannelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
      });
      return;
    }

    const { channelId } = parsed.data;

    // Verify the user owns this channel
    const channel = await channelManager.getChannel(channelId);
    if (channel.userPubkey !== req.auth!.pubkey) {
      res.status(403).json({
        success: false,
        error: 'You do not own this channel',
      });
      return;
    }

    const result = await channelManager.closeChannel(channelId);

    // Notify via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastChannelStateChange(channelId, 'CLOSING');
      wsManager.broadcastToUser(req.auth!.pubkey, 'channel:closing', {
        channelId,
        state: 'CLOSING',
      });
    }

    res.json({
      success: true,
      data: { psbt: result.psbt },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found')
      ? 404
      : message.includes('Invalid channel state')
        ? 409
        : 500;
    console.error('[channelRoutes] POST /channel/close error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /channel/:channelId
 * Get channel state and balance.
 */
router.get('/channel/:channelId', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const channel = await channelManager.getChannel(channelId);
    const balance = await ledger.getBalance(channelId);

    const reserve = calculateReserve(balance.capacity);
    const spendable = getSpendableBalance(balance.local, balance.capacity);

    res.json({
      success: true,
      data: {
        ...channelToJson(channel),
        balance: {
          local: balance.local.toString(),
          remote: balance.remote.toString(),
          capacity: balance.capacity.toString(),
          reserve: reserve.toString(),
          spendable: spendable.toString(),
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

export default router;

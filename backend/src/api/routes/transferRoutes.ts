/**
 * Transfer API routes for sending runes between channels.
 *
 * SECURITY: Validates transfer amounts, enforces nonce uniqueness,
 * and prevents negative/zero transfers.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { RuneLedger } from '../../ledger/RuneLedger';
import { transferToJson } from '../../ledger/Transfer';
import { requireAuth } from '../../auth/AuthMiddleware';
import { ChannelManager } from '../../channels/ChannelManager';
import { getWebSocketManager } from '../../ws/WebSocketServer';
import { FeeManager } from '../../fees/FeeManager';
import { getSpendableBalance } from '../../channels/ChannelReserves';

const router = Router();
const ledger = new RuneLedger();
const channelManager = new ChannelManager();
const feeManager = new FeeManager();

/** Transfer amount bounds */
const MIN_TRANSFER_AMOUNT = 1n;
/** Dust limit: reject transfers below this threshold */
const DUST_LIMIT = 100n;
/** Maximum safe amount for BigInt (mirrors Number.MAX_SAFE_INTEGER) */
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Map error messages to user-friendly messages and HTTP status codes.
 */
function mapTransferError(message: string): { status: number; userMessage: string } {
  if (message.includes('not found')) {
    return { status: 404, userMessage: 'The specified channel could not be found. Please check the channel ID and try again.' };
  }
  if (message.includes('Insufficient balance')) {
    return { status: 422, userMessage: 'Insufficient balance to complete this transfer. Please check your channel balance.' };
  }
  if (message.includes('Insufficient inbound')) {
    return { status: 422, userMessage: 'The recipient channel does not have enough inbound capacity for this transfer.' };
  }
  if (message.includes('not OPEN')) {
    return { status: 409, userMessage: 'This channel is not in an active state. Only open channels can send or receive transfers.' };
  }
  if (message.includes('replay') || message.includes('nonce')) {
    return { status: 409, userMessage: 'This transfer has already been processed. Each transfer requires a unique nonce.' };
  }
  if (message.includes('signature')) {
    return { status: 401, userMessage: 'Invalid transfer signature. Please sign the transfer with your private key.' };
  }
  return { status: 500, userMessage: 'An unexpected error occurred while processing your transfer. Please try again.' };
}

/**
 * POST /transfer
 * Execute a transfer between channels. Requires authentication.
 *
 * SECURITY: Requires nonce (replay protection) and signature (authorization).
 * Validates amount is positive and within bounds.
 * Calculates and applies fees based on user tier.
 */
const transferSchema = z
  .object({
    fromChannelId: z.string().uuid('Invalid fromChannelId format'),
    toChannelId: z.string().uuid('Invalid toChannelId format').optional(),
    recipientPubkey: z
      .string()
      .min(64, 'Public key must be at least 64 characters')
      .max(66, 'Public key must be at most 66 characters')
      .regex(/^[0-9a-fA-F]+$/, 'Public key must be hex-encoded')
      .optional(),
    amount: z
      .string()
      .regex(/^\d+$/, 'Amount must be a numeric string')
      .refine((val) => {
        const n = BigInt(val);
        return n >= MIN_TRANSFER_AMOUNT;
      }, 'Amount must be at least 1')
      .refine((val) => {
        const n = BigInt(val);
        return n >= DUST_LIMIT;
      }, `Transfer amount below dust limit (minimum ${DUST_LIMIT} units)`)
      .refine((val) => {
        const n = BigInt(val);
        return n <= MAX_SAFE_BIGINT;
      }, 'Amount exceeds maximum safe value'),
    memo: z.string().max(256, 'Memo must be 256 characters or less').optional(),
    nonce: z.string().uuid('Nonce must be a valid UUID'),
    signature: z.string().min(128, 'Signature must be at least 128 characters'),
  })
  .refine((data) => data.toChannelId || data.recipientPubkey, {
    message: 'Either toChannelId or recipientPubkey must be provided',
  });

router.post('/transfer', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join('; '),
        userMessage: 'Invalid transfer request. Please check your input and try again.',
      });
      return;
    }

    const { fromChannelId, toChannelId, recipientPubkey, amount, memo, nonce, signature } = parsed.data;
    const senderPubkey = req.auth!.pubkey;

    // Verify the sender owns the source channel
    const fromChannel = await channelManager.getChannel(fromChannelId);
    if (fromChannel.userPubkey !== senderPubkey) {
      res.status(403).json({
        success: false,
        error: 'You do not own the source channel',
        userMessage: 'You can only send transfers from your own channels.',
      });
      return;
    }

    // Resolve recipient channel
    let resolvedToChannelId = toChannelId;

    if (!resolvedToChannelId && recipientPubkey) {
      resolvedToChannelId = await ledger.findOpenChannelForPubkey(recipientPubkey) || undefined;
      if (!resolvedToChannelId) {
        res.status(404).json({
          success: false,
          error: `No open channel found for recipient ${recipientPubkey.slice(0, 16)}...`,
          userMessage: 'The recipient does not have an open channel to receive transfers.',
        });
        return;
      }
    }

    if (!resolvedToChannelId) {
      res.status(400).json({
        success: false,
        error: 'Could not resolve recipient channel',
        userMessage: 'Please provide either a recipient channel ID or public key.',
      });
      return;
    }

    // Calculate fee
    const transferAmount = BigInt(amount);

    // Verify transfer amount does not exceed channel capacity
    if (transferAmount > fromChannel.capacity) {
      res.status(422).json({
        success: false,
        error: 'Transfer amount exceeds channel capacity',
        userMessage: `Transfer amount (${amount}) exceeds channel capacity (${fromChannel.capacity.toString()}).`,
      });
      return;
    }

    const feeCalc = await feeManager.calculateFee(senderPubkey, transferAmount, 'off_chain');

    // Verify sender has enough spendable balance (balance minus reserve) for amount + fee
    const totalRequired = transferAmount + feeCalc.feeAmount;
    const spendable = getSpendableBalance(fromChannel.localBalance, fromChannel.capacity);
    if (spendable < totalRequired) {
      res.status(422).json({
        success: false,
        error: 'Insufficient spendable balance (reserve protected)',
        userMessage: `Insufficient spendable balance. Spendable: ${spendable.toString()}, Transfer: ${amount}, Fee: ${feeCalc.feeAmount.toString()}, Total required: ${totalRequired.toString()}`,
      });
      return;
    }

    // Execute transfer with replay protection (nonce) and signature verification
    const transfer = await ledger.transfer(
      fromChannelId,
      resolvedToChannelId,
      transferAmount,
      memo,
      nonce,
      signature,
      senderPubkey
    );

    // Record fee and increment transaction count
    await feeManager.recordFee(transfer.id, senderPubkey, feeCalc);

    // Broadcast updates via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      const transferData = transferToJson(transfer);

      // Notify sender channel subscribers
      wsManager.broadcastToChannel(fromChannelId, 'transfer:sent', transferData);

      // Notify recipient channel subscribers
      wsManager.broadcastToChannel(resolvedToChannelId, 'transfer:received', transferData);

      // Notify recipient user
      const toChannel = await channelManager.getChannel(resolvedToChannelId);
      wsManager.broadcastToUser(toChannel.userPubkey, 'transfer:incoming', transferData);

      // Send balance updates to both sender and recipient
      const senderBalance = await ledger.getBalance(fromChannelId);
      const recipientBalance = await ledger.getBalance(resolvedToChannelId);

      wsManager.broadcastToUser(senderPubkey, 'balance:updated', {
        channelId: fromChannelId,
        local: senderBalance.local.toString(),
        remote: senderBalance.remote.toString(),
        capacity: senderBalance.capacity.toString(),
      });

      wsManager.broadcastToUser(toChannel.userPubkey, 'balance:updated', {
        channelId: resolvedToChannelId,
        local: recipientBalance.local.toString(),
        remote: recipientBalance.remote.toString(),
        capacity: recipientBalance.capacity.toString(),
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...transferToJson(transfer),
        fee: {
          amount: feeCalc.feeAmount.toString(),
          rate: feeCalc.feeRate,
          type: feeCalc.feeType,
          wasFree: feeCalc.isFree,
        },
        freeTransactionsRemaining: feeCalc.freeTransactionsRemaining,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const { status, userMessage } = mapTransferError(message);
    console.error('[transferRoutes] POST /transfer error:', message);
    res.status(status).json({ success: false, error: message, userMessage });
  }
});

/**
 * GET /history/:pubkey
 * Get paginated transfer history for a pubkey.
 */
const historyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(Math.max(parseInt(v || '50', 10), 1), 200)),
  offset: z
    .string()
    .optional()
    .transform((v) => Math.max(parseInt(v || '0', 10), 0)),
});

router.get('/history/:pubkey', async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const queryParsed = historyQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        userMessage: 'Please provide valid limit and offset values.',
      });
      return;
    }

    const { limit, offset } = queryParsed.data;
    const transfers = await ledger.getTransferHistory(pubkey, limit, offset);

    res.json({
      success: true,
      data: {
        transfers: transfers.map(transferToJson),
        pagination: { limit, offset, count: transfers.length },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[transferRoutes] GET /history error:', message);
    res.status(500).json({
      success: false,
      error: message,
      userMessage: 'Failed to retrieve transfer history. Please try again.',
    });
  }
});

export default router;

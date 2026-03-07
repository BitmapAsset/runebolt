import { Router, Request, Response, NextFunction } from 'express';
import { RunesBridge } from '../core/RunesBridge';
import { DepositRequestSchema, WithdrawRequestSchema } from '../types';
import { RuneBoltError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const log = createLogger('API');

export function createRouter(bridge: RunesBridge): Router {
  const router = Router();

  // POST /swap/deposit - Deposit Runes, get Lightning payment
  router.post('/swap/deposit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = DepositRequestSchema.parse(req.body);
      const swap = await bridge.deposit(
        parsed.runeName,
        BigInt(parsed.runeAmount),
        parsed.lightningInvoice,
        parsed.refundAddress,
      );

      res.status(201).json({
        id: swap.id,
        state: swap.state,
        runeName: swap.runeName,
        runeAmount: swap.runeAmount.toString(),
        paymentHash: swap.paymentHash,
        expiresAt: swap.expiresAt.toISOString(),
        createdAt: swap.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /swap/deposit/:id/confirm - Confirm deposit with HTLC txid
  router.post('/swap/deposit/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { htlcTxid } = req.body;
      if (!htlcTxid || typeof htlcTxid !== 'string' || !/^[a-f0-9]{64}$/.test(htlcTxid)) {
        res.status(400).json({ error: 'htlcTxid must be a valid 64-character hex txid' });
        return;
      }

      const swap = await bridge.confirmDeposit(req.params.id, htlcTxid);
      res.json(serializeSwap(swap));
    } catch (err) {
      next(err);
    }
  });

  // POST /swap/withdraw - Pay Lightning invoice, receive Runes
  router.post('/swap/withdraw', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = WithdrawRequestSchema.parse(req.body);
      const swap = await bridge.withdraw(
        parsed.runeName,
        BigInt(parsed.runeAmount),
        parsed.destinationAddress,
      );

      res.status(201).json({
        id: swap.id,
        state: swap.state,
        runeName: swap.runeName,
        runeAmount: swap.runeAmount.toString(),
        lightningInvoice: swap.lightningInvoice,
        satoshiAmount: swap.satoshiAmount,
        expiresAt: swap.expiresAt.toISOString(),
        createdAt: swap.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /swap/:id - Swap status
  router.get('/swap/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const swap = bridge.getSwap(req.params.id);
      res.json(serializeSwap(swap));
    } catch (err) {
      next(err);
    }
  });

  // GET /runes/:address - Runes balance check
  router.get('/runes/:address', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address;
      if (!address || address.length > 200 || !/^[a-zA-Z0-9_.\-:]+$/.test(address)) {
        res.status(400).json({ error: 'Invalid address format' });
        return;
      }
      const balances = await bridge.indexer.getRuneBalances(address);
      res.json({
        address,
        balances: balances.map((b) => ({
          runeId: `${b.runeId.block}:${b.runeId.tx}`,
          runeName: b.runeName,
          amount: b.amount.toString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /health - Health check
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const info = await bridge.lightning.getInfo();
      res.json({
        status: 'ok',
        lightning: {
          alias: info.alias,
          blockHeight: info.blockHeight,
          syncedToChain: info.syncedToChain,
        },
      });
    } catch {
      res.status(503).json({ status: 'degraded', lightning: 'disconnected' });
    }
  });

  return router;
}

function serializeSwap(swap: any) {
  return {
    id: swap.id,
    direction: swap.direction,
    state: swap.state,
    runeName: swap.runeName,
    runeAmount: swap.runeAmount.toString(),
    satoshiAmount: swap.satoshiAmount,
    lightningInvoice: swap.lightningInvoice,
    paymentHash: swap.paymentHash,
    // Only expose preimage once the swap is fully completed
    preimage: swap.state === 'completed' ? swap.preimage : null,
    htlcTxid: swap.htlcTxid,
    claimTxid: swap.claimTxid,
    refundTxid: swap.refundTxid,
    onchainAddress: swap.onchainAddress,
    expiresAt: swap.expiresAt?.toISOString(),
    createdAt: swap.createdAt?.toISOString(),
    updatedAt: swap.updatedAt?.toISOString(),
  };
}

// Error handling middleware
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log full error internally but don't expose stack traces to clients
  log.error({ err: { message: err.message, code: (err as any).code, name: err.name } }, 'API error');

  if (err instanceof RuneBoltError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      // Only include details for client errors, not server errors
      ...(err.statusCode < 500 && err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: (err as any).errors,
    });
    return;
  }

  // Never expose internal error details
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

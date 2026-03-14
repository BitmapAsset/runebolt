import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RuneBolt } from '../core/RuneBolt';
import { RuneBoltError } from '../utils/errors';
import { WrapRequestSchema, UnwrapRequestSchema, SendAssetSchema, OpenChannelSchema } from '../types';
import { InputValidator } from '../security';

const ReceiveSchema = z.object({
  assetId: z.string().min(1).max(200),
  amount: z.union([z.string(), z.number()]).refine(
    (val) => { const n = typeof val === 'string' ? parseInt(val, 10) : val; return Number.isFinite(n) && n > 0; },
    { message: 'amount must be a positive number' }
  ),
  memo: z.string().max(256).regex(/^[\x20-\x7E]*$/, 'memo contains invalid characters').optional().default(''),
});

const CloseChannelSchema = z.object({
  channelId: z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_-]+$/, 'Invalid channel ID format'),
});

export function createRouter(bolt: RuneBolt): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      walletLocked: !bolt.keyManager.isUnlocked(),
      version: '1.0.0',
    });
  });

  // Wallet info
  router.get('/wallet', (_req, res, next) => {
    try {
      const info = bolt.getWalletInfo();
      res.json(info);
    } catch (err) { next(err); }
  });

  // Unlock wallet
  router.post('/wallet/unlock', async (req, res, next) => {
    try {
      const { password } = req.body;
      if (!password || typeof password !== 'string' || password.length > 1024) {
        res.status(400).json({ error: 'Password required (max 1024 characters)' });
        return;
      }
      const info = await bolt.unlock(password);
      res.json(info);
    } catch (err) { next(err); }
  });

  // Lock wallet
  router.post('/wallet/lock', (_req, res) => {
    bolt.lock();
    res.json({ status: 'locked' });
  });

  // Get balances
  router.get('/balances', async (_req, res, next) => {
    try {
      const balances = await bolt.getBalances();
      res.json({
        btcSats: balances.btcSats,
        runes: Object.fromEntries(
          Array.from(balances.runes.entries()).map(([name, info]) => [
            name,
            { runeId: info.runeId, total: info.total.toString() },
          ]),
        ),
        taprootAssets: balances.taprootAssets.map(a => ({
          assetId: a.assetId,
          name: a.name,
          amount: a.amount.toString(),
        })),
        channels: balances.channels,
      });
    } catch (err) { next(err); }
  });

  // Wrap runes
  router.post('/wrap', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(WrapRequestSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const result = await bolt.wrap({
        runeId: { block: 0, tx: 0 },
        runeName: validation.data.runeName,
        amount: BigInt(validation.data.runeAmount),
        sourceUtxo: { txid: '', vout: 0, value: 546 },
        destinationPubkey: bolt.keyManager.getTaprootPubkey("m/86'/1'/0'/0/0"),
      });
      res.json(result);
    } catch (err) { next(err); }
  });

  // Unwrap taproot assets
  router.post('/unwrap', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(UnwrapRequestSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const result = await bolt.unwrap({
        assetId: validation.data.assetId,
        amount: BigInt(validation.data.amount),
        destinationAddress: validation.data.destinationAddress,
        proof: {
          assetId: validation.data.assetId,
          proofFile: Buffer.alloc(0),
          anchorTx: '',
          merkleRoot: Buffer.alloc(0),
          verified: false,
        },
      });
      res.json(result);
    } catch (err) { next(err); }
  });

  // Send asset payment
  router.post('/send', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(SendAssetSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const payment = await bolt.sendAssetPayment(
        validation.data.assetId,
        validation.data.invoice,
      );
      res.json({
        paymentHash: payment.paymentHash,
        status: payment.status,
        feeSat: payment.feeSat,
      });
    } catch (err) { next(err); }
  });

  // Create invoice
  router.post('/receive', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(ReceiveSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const { assetId, amount, memo } = validation.data;
      const sanitizedMemo = InputValidator.sanitizeString(memo || '', 256);
      const invoice = await bolt.createInvoice(assetId, BigInt(amount), sanitizedMemo);
      res.json({
        paymentRequest: invoice.paymentRequest,
        paymentHash: invoice.paymentHash,
        assetId: invoice.assetId,
        assetAmount: invoice.assetAmount.toString(),
        expiry: invoice.expiry,
      });
    } catch (err) { next(err); }
  });

  // Channels
  router.get('/channels', (_req, res) => {
    const channels = bolt.assetChannels.listChannels();
    res.json({ channels });
  });

  router.post('/channels/open', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(OpenChannelSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const channel = await bolt.openChannel(
        validation.data.peerPubkey,
        validation.data.assetId,
        BigInt(validation.data.localAmount),
      );
      res.json(channel);
    } catch (err) { next(err); }
  });

  router.post('/channels/close', async (req, res, next) => {
    try {
      const validation = InputValidator.validateSchema(CloseChannelSchema, req.body);
      if (!validation.success) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const { channelId } = validation.data;
      await bolt.closeChannel(channelId);
      res.json({ status: 'closed', channelId });
    } catch (err) { next(err); }
  });

  // Peers
  router.get('/peers', async (_req, res) => {
    const peers = bolt.peerDiscovery.listPeers();
    res.json({ peers });
  });

  router.post('/peers/discover', async (_req, res, next) => {
    try {
      const peers = await bolt.peerDiscovery.discoverPeers();
      res.json({ peers });
    } catch (err) { next(err); }
  });

  // Bitmaps
  router.get('/bitmaps', async (_req, res, next) => {
    try {
      const bitmaps = await bolt.scanBitmaps();
      res.json({ bitmaps });
    } catch (err) { next(err); }
  });

  // Audit log verification
  router.get('/audit/verify', (_req, res) => {
    const result = bolt.auditLog.verify();
    res.json(result);
  });

  return router;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof RuneBoltError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

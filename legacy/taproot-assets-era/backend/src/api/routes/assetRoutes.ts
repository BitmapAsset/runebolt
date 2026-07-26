/**
 * Multi-asset API routes for RuneBolt.
 *
 * Provides endpoints for:
 *   - Asset registry (list/query supported assets)
 *   - Asset balances per user
 *   - Bitmap escrow operations (create, deposit, execute, status)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import AssetRegistry, { assetToJson } from '../../assets/AssetRegistry';
import BRC20Manager from '../../assets/BRC20Manager';
import BitmapEscrow from '../../assets/BitmapEscrow';
import Database from '../../db/Database';
import { requireAuth } from '../../auth/AuthMiddleware';

const router = Router();
const registry = AssetRegistry.getInstance();
const brc20Manager = new BRC20Manager();
const escrow = new BitmapEscrow();

// ==================== Asset Registry Routes ====================

/**
 * GET /assets
 * List all supported assets.
 */
router.get('/assets', (_req: Request, res: Response) => {
  const assets = registry.getAll().map(assetToJson);
  res.json({ success: true, data: assets });
});

/**
 * GET /assets/:id
 * Get a single asset by ID.
 */
router.get('/assets/:id', (req: Request, res: Response) => {
  const asset = registry.get(req.params.id);
  if (!asset) {
    res.status(404).json({ success: false, error: 'Asset not found' });
    return;
  }
  res.json({ success: true, data: assetToJson(asset) });
});

/**
 * GET /assets/:id/balance/:pubkey
 * Get balance for a specific asset and user.
 */
router.get('/assets/:id/balance/:pubkey', async (req: Request, res: Response) => {
  try {
    const { id, pubkey } = req.params;

    const asset = registry.get(id);
    if (!asset) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }

    const balance = await brc20Manager.getChannelBalance(pubkey, id);

    res.json({
      success: true,
      data: {
        asset: id,
        pubkey,
        balance,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[assetRoutes] GET /assets/:id/balance/:pubkey error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

// ==================== Escrow Routes ====================

const pubkeySchema = z
  .string()
  .length(66, 'Compressed public key must be exactly 66 hex characters')
  .regex(/^(02|03)[0-9a-fA-F]{64}$/, 'Must be a valid compressed pubkey');

/**
 * POST /escrow/create
 * Create a new Bitmap escrow.
 */
const createEscrowSchema = z.object({
  sellerPubkey: pubkeySchema,
  buyerPubkey: pubkeySchema,
  inscriptionId: z.string().min(1, 'Inscription ID is required'),
  priceAsset: z.string().min(1, 'Price asset is required'),
  priceAmount: z.string().regex(/^\d+$/, 'Price must be a numeric string'),
  timeoutMs: z.number().int().positive().optional(),
});

router.post('/escrow/create', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createEscrowSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map(e => e.message).join('; '),
      });
      return;
    }

    const { sellerPubkey, buyerPubkey, inscriptionId, priceAsset, priceAmount, timeoutMs } = parsed.data;

    // Verify the authenticated user is the seller or buyer
    if (req.auth!.pubkey !== sellerPubkey && req.auth!.pubkey !== buyerPubkey) {
      res.status(403).json({
        success: false,
        error: 'Authenticated user must be the seller or buyer',
      });
      return;
    }

    // Verify price asset exists
    if (!registry.has(priceAsset)) {
      res.status(400).json({
        success: false,
        error: `Unknown price asset: ${priceAsset}`,
      });
      return;
    }

    const escrowId = await escrow.createEscrow(
      sellerPubkey, buyerPubkey, inscriptionId, priceAsset, priceAmount, timeoutMs
    );

    res.status(201).json({
      success: true,
      data: { escrowId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[assetRoutes] POST /escrow/create error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /escrow/:id/deposit
 * Record a deposit (inscription or payment) for an escrow.
 */
const depositSchema = z.object({
  side: z.enum(['seller', 'buyer']),
  txid: z.string().length(64, 'Transaction ID must be 64 hex characters').regex(/^[0-9a-fA-F]{64}$/),
});

router.post('/escrow/:id/deposit', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = depositSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map(e => e.message).join('; '),
      });
      return;
    }

    const { side, txid } = parsed.data;
    const escrowId = req.params.id;

    let result;
    if (side === 'seller') {
      result = await escrow.depositInscription(escrowId, txid);
    } else {
      result = await escrow.depositPayment(escrowId, txid);
    }

    res.json({
      success: true,
      data: { escrowId, status: result.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    console.error('[assetRoutes] POST /escrow/:id/deposit error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /escrow/:id/execute
 * Execute the atomic swap for a fully-deposited escrow.
 */
router.post('/escrow/:id/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const result = await escrow.executeSwap(escrowId);

    res.json({
      success: true,
      data: { escrowId, status: result.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    console.error('[assetRoutes] POST /escrow/:id/execute error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * POST /escrow/:id/cancel
 * Cancel/refund an escrow (seller cancels, or anyone after timeout).
 */
router.post('/escrow/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const result = await escrow.refundEscrow(escrowId);

    res.json({
      success: true,
      data: { escrowId, status: result.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    console.error('[assetRoutes] POST /escrow/:id/cancel error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

/**
 * GET /escrow/active
 * List all active (non-terminal) escrows.
 * NOTE: Must be registered BEFORE /escrow/:id to avoid "active" matching as :id.
 */
router.get('/escrow/active', async (_req: Request, res: Response) => {
  try {
    const db = Database.getInstance();
    const result = await db.query<{
      id: string;
      seller_pubkey: string;
      buyer_pubkey: string;
      inscription_id: string;
      price_asset: string;
      price_amount: string;
      status: string;
      timeout_at: string;
      created_at: string;
    }>(
      `SELECT * FROM escrows
       WHERE status NOT IN ('completed', 'refunded', 'expired')
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        sellerPubkey: r.seller_pubkey,
        buyerPubkey: r.buyer_pubkey,
        inscriptionId: r.inscription_id,
        priceAsset: r.price_asset,
        priceAmount: r.price_amount,
        status: r.status,
        timeoutAt: r.timeout_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[assetRoutes] GET /escrow/active error:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /escrow/:id
 * Get escrow status and deposit details.
 */
router.get('/escrow/:id', async (req: Request, res: Response) => {
  try {
    const escrowId = req.params.id;
    const result = await escrow.getEscrowStatus(escrowId);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    console.error('[assetRoutes] GET /escrow/:id error:', message);
    res.status(status).json({ success: false, error: message });
  }
});

export default router;

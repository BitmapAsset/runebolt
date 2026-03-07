import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BitmapMarketplace, ListingState } from '../core/BitmapMarketplace';
import { createLogger } from '../utils/logger';

const log = createLogger('BitmapAPI');

const ListBitmapSchema = z.object({
  inscriptionId: z.string().regex(/^[a-f0-9]{64}:\d+$/, 'Must be txid:vout format'),
  bitmapNumber: z.string().min(1).max(100),
  sellerAddress: z.string().min(1).max(200),
  priceSats: z.number().int().min(546).max(100_000_000_000),
});

const BuyBitmapSchema = z.object({
  buyerAddress: z.string().min(1).max(200),
});

const ConfirmEscrowSchema = z.object({
  escrowTxid: z.string().regex(/^[a-f0-9]{64}$/, 'Must be a valid txid'),
});

export function createBitmapRouter(marketplace: BitmapMarketplace): Router {
  const router = Router();

  // POST /bitmap/list — List a Bitmap block for sale
  router.post('/bitmap/list', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ListBitmapSchema.parse(req.body);
      const listing = await marketplace.createListing(
        parsed.inscriptionId,
        parsed.bitmapNumber,
        parsed.sellerAddress,
        parsed.priceSats,
      );

      res.status(201).json(serializeListing(listing));
    } catch (err) {
      next(err);
    }
  });

  // POST /bitmap/:id/escrow — Confirm escrow lock
  router.post('/bitmap/:id/escrow', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ConfirmEscrowSchema.parse(req.body);
      const listing = await marketplace.confirmEscrow(req.params.id, parsed.escrowTxid);
      res.json(serializeListing(listing));
    } catch (err) {
      next(err);
    }
  });

  // POST /bitmap/:id/buy — Buy a listed Bitmap (after paying LN invoice)
  router.post('/bitmap/:id/buy', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = BuyBitmapSchema.parse(req.body);
      const listing = await marketplace.processPurchase(req.params.id, parsed.buyerAddress);

      res.json({
        ...serializeListing(listing),
        preimage: listing.state === ListingState.COMPLETED ? listing.preimage : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /bitmap/listings — Get all active listings
  router.get('/bitmap/listings', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const listings = marketplace.getActiveListings();
      res.json({
        count: listings.length,
        listings: listings.map(serializeListing),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /bitmap/:id — Get listing details
  router.get('/bitmap/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = marketplace.getListing(req.params.id);
      res.json(serializeListing(listing));
    } catch (err) {
      next(err);
    }
  });

  // DELETE /bitmap/:id — Cancel a listing
  router.delete('/bitmap/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const listing = await marketplace.cancelListing(req.params.id);
      res.json(serializeListing(listing));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function serializeListing(listing: any) {
  return {
    id: listing.id,
    state: listing.state,
    inscriptionId: listing.inscriptionId,
    bitmapNumber: listing.bitmapNumber,
    sellerAddress: listing.sellerAddress,
    priceSats: listing.priceSats,
    lightningInvoice: listing.lightningInvoice,
    paymentHash: listing.paymentHash,
    escrowTxid: listing.escrowTxid,
    claimTxid: listing.claimTxid,
    buyerAddress: listing.buyerAddress,
    expiresAt: listing.expiresAt?.toISOString(),
    createdAt: listing.createdAt?.toISOString(),
    updatedAt: listing.updatedAt?.toISOString(),
  };
}

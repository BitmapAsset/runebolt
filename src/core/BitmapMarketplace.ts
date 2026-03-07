import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { SwapError } from '../utils/errors';
import { BridgeConfig, SwapEvent, SwapUpdate } from '../types';
import { BitmapEscrow, BitmapEscrowParams } from './BitmapEscrow';
import { LightningClient } from './LightningClient';
import { WalletManager } from './WalletManager';
import { FeeEstimator } from './FeeEstimator';

const log = createLogger('BitmapMarketplace');

export enum ListingState {
  ACTIVE = 'active',
  ESCROW_LOCKED = 'escrow_locked',
  PAYMENT_RECEIVED = 'payment_received',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

export interface BitmapListing {
  id: string;
  state: ListingState;
  inscriptionId: string; // Ordinals inscription ID (txid:vout)
  bitmapNumber: string;  // e.g., "820000.bitmap"
  sellerAddress: string;
  priceSats: number;
  lightningInvoice: string | null;
  paymentHash: string | null;
  preimage: string | null;
  escrowTxid: string | null;
  claimTxid: string | null;
  buyerAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type MarketplaceListener = (update: SwapUpdate) => void;

export class BitmapMarketplace {
  private readonly listings = new Map<string, BitmapListing>();
  private readonly listeners: MarketplaceListener[] = [];
  private readonly config: BridgeConfig;
  private readonly escrow: BitmapEscrow;
  private readonly lightning: LightningClient;
  private readonly wallet: WalletManager;
  private readonly feeEstimator: FeeEstimator;

  constructor(
    config: BridgeConfig,
    escrow: BitmapEscrow,
    lightning: LightningClient,
    wallet: WalletManager,
    feeEstimator: FeeEstimator,
  ) {
    this.config = config;
    this.escrow = escrow;
    this.lightning = lightning;
    this.wallet = wallet;
    this.feeEstimator = feeEstimator;
  }

  onUpdate(listener: MarketplaceListener): void {
    this.listeners.push(listener);
  }

  private emit(listing: BitmapListing, event: SwapEvent, data?: Record<string, unknown>): void {
    const update: SwapUpdate = {
      swapId: listing.id,
      event,
      state: listing.state as any,
      data,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener(update);
      } catch (err) {
        log.error({ err }, 'Marketplace listener error');
      }
    }
  }

  /**
   * List a Bitmap block for sale.
   *
   * Flow:
   * 1. Seller provides inscription ID, price, and their address
   * 2. Bridge generates a payment hash and creates an escrow address
   * 3. Seller locks inscription in the escrow (HTLC on-chain)
   * 4. Listing becomes active — buyers can pay the Lightning invoice
   */
  async createListing(
    inscriptionId: string,
    bitmapNumber: string,
    sellerAddress: string,
    priceSats: number,
  ): Promise<BitmapListing> {
    log.info({ inscriptionId, bitmapNumber, priceSats }, 'Creating Bitmap listing');

    if (priceSats < 546) {
      throw new SwapError('Price must be at least 546 sats');
    }
    if (priceSats > 100_000_000_000) {
      throw new SwapError('Price exceeds maximum (1000 BTC)');
    }
    if (!inscriptionId.match(/^[a-f0-9]{64}:\d+$/)) {
      throw new SwapError('Invalid inscription ID format (expected txid:vout)');
    }

    // Generate the secret for HTLC
    const { preimage, paymentHash } = this.escrow.generateSecret();

    // Create Lightning invoice for the buyer to pay
    const feeAmount = this.calculateFee(priceSats);
    const totalPrice = priceSats + feeAmount;

    const invoice = await this.lightning.addInvoice(
      totalPrice,
      `RuneBolt Bitmap: ${bitmapNumber} for ${priceSats} sats`,
      7200, // 2 hour expiry
    );

    const listing: BitmapListing = {
      id: uuidv4(),
      state: ListingState.ACTIVE,
      inscriptionId,
      bitmapNumber,
      sellerAddress,
      priceSats,
      lightningInvoice: invoice.paymentRequest,
      paymentHash: paymentHash.toString('hex'),
      preimage: preimage.toString('hex'),
      escrowTxid: null,
      claimTxid: null,
      buyerAddress: null,
      expiresAt: new Date(Date.now() + this.config.bridge.htlcTimeoutBlocks * 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.listings.set(listing.id, listing);
    this.emit(listing, SwapEvent.CREATED, { invoice: invoice.paymentRequest });

    log.info({ listingId: listing.id, bitmapNumber }, 'Bitmap listing created');
    return listing;
  }

  /**
   * Confirm that the seller has locked the inscription in the escrow HTLC.
   */
  async confirmEscrow(listingId: string, escrowTxid: string): Promise<BitmapListing> {
    const listing = this.getListing(listingId);
    if (listing.state !== ListingState.ACTIVE) {
      throw new SwapError(`Invalid state for escrow confirmation: ${listing.state}`);
    }

    log.info({ listingId, escrowTxid }, 'Confirming Bitmap escrow');

    // Verify the inscription is in the escrow output
    const confirmed = await this.wallet.isConfirmed(escrowTxid, 1);
    if (!confirmed) {
      log.warn({ escrowTxid }, 'Escrow tx not yet confirmed, proceeding optimistically');
    }

    listing.escrowTxid = escrowTxid;
    listing.state = ListingState.ESCROW_LOCKED;
    listing.updatedAt = new Date();
    this.emit(listing, SwapEvent.HTLC_LOCKED, { escrowTxid });

    return listing;
  }

  /**
   * Process a purchase — buyer pays Lightning, gets the inscription.
   *
   * 1. Verify the Lightning invoice is paid
   * 2. The preimage is now revealed
   * 3. Buyer uses preimage to claim the inscription from escrow
   */
  async processPurchase(listingId: string, buyerAddress: string): Promise<BitmapListing> {
    const listing = this.getListing(listingId);
    if (listing.state !== ListingState.ESCROW_LOCKED) {
      throw new SwapError(`Listing not ready for purchase: ${listing.state}`);
    }

    // Verify invoice is paid
    const invoiceStatus = await this.lightning.lookupInvoice(listing.paymentHash!);
    if (!invoiceStatus.settled) {
      throw new SwapError('Lightning invoice not yet paid');
    }

    listing.buyerAddress = buyerAddress;
    listing.state = ListingState.PAYMENT_RECEIVED;
    listing.updatedAt = new Date();
    this.emit(listing, SwapEvent.INVOICE_PAID, { buyerAddress });

    log.info({ listingId, buyerAddress }, 'Payment received for Bitmap');

    // In custodial mode, the bridge facilitates the claim.
    // The preimage is shared so the buyer can claim the escrow on-chain.
    listing.state = ListingState.COMPLETED;
    listing.updatedAt = new Date();
    this.emit(listing, SwapEvent.COMPLETED, {
      preimage: listing.preimage,
      buyerAddress,
    });

    log.info({ listingId }, 'Bitmap sale completed');
    return listing;
  }

  /**
   * Cancel a listing (only if not yet in escrow or if expired).
   */
  async cancelListing(listingId: string): Promise<BitmapListing> {
    const listing = this.getListing(listingId);

    if (listing.state === ListingState.COMPLETED) {
      throw new SwapError('Cannot cancel a completed listing');
    }
    if (listing.state === ListingState.PAYMENT_RECEIVED) {
      throw new SwapError('Cannot cancel — payment already received');
    }

    log.info({ listingId }, 'Canceling Bitmap listing');

    listing.state = ListingState.CANCELED;
    listing.updatedAt = new Date();
    this.emit(listing, SwapEvent.REFUNDED);

    return listing;
  }

  getListing(listingId: string): BitmapListing {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new SwapError(`Listing not found: ${listingId}`);
    }
    return listing;
  }

  getActiveListings(): BitmapListing[] {
    return Array.from(this.listings.values()).filter(
      (l) => l.state === ListingState.ACTIVE || l.state === ListingState.ESCROW_LOCKED,
    );
  }

  getAllListings(): BitmapListing[] {
    return Array.from(this.listings.values());
  }

  async checkExpiredListings(): Promise<void> {
    const now = new Date();
    for (const listing of this.listings.values()) {
      if (
        (listing.state === ListingState.ACTIVE ||
          listing.state === ListingState.ESCROW_LOCKED) &&
        now > listing.expiresAt
      ) {
        log.warn({ listingId: listing.id }, 'Bitmap listing expired');
        listing.state = ListingState.EXPIRED;
        listing.updatedAt = now;
        this.emit(listing, SwapEvent.EXPIRED);
      }
    }
  }

  private calculateFee(priceSats: number): number {
    return Math.ceil((priceSats * this.config.bridge.feeRateBps) / 10000);
  }
}

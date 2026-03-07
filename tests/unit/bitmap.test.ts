import crypto from 'crypto';
import * as bitcoin from 'bitcoinjs-lib';
import { BitmapEscrow, BitmapEscrowParams } from '../../src/core/BitmapEscrow';
import { BitmapMarketplace, ListingState } from '../../src/core/BitmapMarketplace';
import { FeeEstimator } from '../../src/core/FeeEstimator';
import { WalletManager } from '../../src/core/WalletManager';
import { MockLightningClient } from '../mocks/MockLightningClient';
import { BridgeConfig, SwapEvent } from '../../src/types';

const mockConfig: BridgeConfig = {
  network: 'regtest',
  mode: 'custodial',
  bitcoin: { rpcUrl: 'http://localhost:18443', rpcUser: 'bitcoin', rpcPass: 'bitcoin' },
  lightning: { lndHost: 'localhost', lndPort: 10009, tlsCertPath: '', macaroonPath: '' },
  indexer: { ordApiUrl: 'http://localhost:80', unisatApiUrl: '', unisatApiKey: '' },
  bridge: {
    htlcTimeoutBlocks: 144,
    minSwapAmount: 100n,
    maxSwapAmount: 100000000n,
    feeRateBps: 50,
    bridgeAddress: 'bcrt1qbridge',
    bridgePrivkeyPath: '',
  },
  server: { port: 3000, host: '0.0.0.0', corsOrigins: ['*'] },
};

describe('BitmapEscrow', () => {
  let escrow: BitmapEscrow;
  let defaultParams: BitmapEscrowParams;

  beforeEach(() => {
    escrow = new BitmapEscrow(mockConfig);

    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest();
    const buyerKey = Buffer.alloc(33);
    buyerKey[0] = 0x02;
    crypto.randomBytes(32).copy(buyerKey, 1);
    const sellerKey = Buffer.alloc(33);
    sellerKey[0] = 0x02;
    crypto.randomBytes(32).copy(sellerKey, 1);

    defaultParams = {
      paymentHash,
      buyerPubkey: buyerKey,
      sellerPubkey: sellerKey,
      timelock: 800144,
      inscriptionId: 'a'.repeat(64) + ':0',
      priceSats: 100000,
    };
  });

  describe('generateSecret', () => {
    it('should generate a valid preimage/hash pair', () => {
      const { preimage, paymentHash } = escrow.generateSecret();
      expect(preimage).toHaveLength(32);
      expect(paymentHash).toHaveLength(32);

      const computedHash = crypto.createHash('sha256').update(preimage).digest();
      expect(computedHash).toEqual(paymentHash);
    });

    it('should generate unique secrets each call', () => {
      const a = escrow.generateSecret();
      const b = escrow.generateSecret();
      expect(a.preimage.equals(b.preimage)).toBe(false);
    });
  });

  describe('buildEscrowScript', () => {
    it('should build a valid HTLC escrow script', () => {
      const script = escrow.buildEscrowScript(defaultParams);
      expect(script).toBeInstanceOf(Buffer);

      const decompiled = bitcoin.script.decompile(script)!;
      expect(decompiled[0]).toBe(bitcoin.opcodes.OP_IF);
      expect(decompiled[1]).toBe(bitcoin.opcodes.OP_SHA256);
      expect(decompiled[2]).toEqual(defaultParams.paymentHash);
    });

    it('should include CHECKLOCKTIMEVERIFY for refund path', () => {
      const script = escrow.buildEscrowScript(defaultParams);
      const decompiled = bitcoin.script.decompile(script)!;
      const hasCLTV = decompiled.some((op) => op === bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY);
      expect(hasCLTV).toBe(true);
    });

    it('should include both buyer and seller pubkeys', () => {
      const script = escrow.buildEscrowScript(defaultParams);
      const hex = script.toString('hex');
      expect(hex).toContain(defaultParams.buyerPubkey.toString('hex'));
      expect(hex).toContain(defaultParams.sellerPubkey.toString('hex'));
    });
  });

  describe('getEscrowAddress', () => {
    it('should generate a valid P2WSH address', () => {
      const script = escrow.buildEscrowScript(defaultParams);
      const address = escrow.getEscrowAddress(script);
      expect(address).toBeDefined();
      expect(address.startsWith('bcrt1')).toBe(true);
    });

    it('should be deterministic', () => {
      const script = escrow.buildEscrowScript(defaultParams);
      expect(escrow.getEscrowAddress(script)).toBe(escrow.getEscrowAddress(script));
    });
  });

  describe('buildLockTransaction', () => {
    it('should build a PSBT with escrow output', () => {
      const inputUtxo = {
        txid: 'b'.repeat(64),
        vout: 0,
        value: 10000,
        scriptPubKey: Buffer.alloc(34),
      };

      const { psbt, escrowAddress, redeemScript } = escrow.buildLockTransaction(
        defaultParams,
        inputUtxo,
        10,
      );

      expect(psbt).toBeInstanceOf(bitcoin.Psbt);
      expect(escrowAddress).toBeDefined();
      expect(redeemScript).toBeInstanceOf(Buffer);
      expect(psbt.txOutputs.length).toBeGreaterThanOrEqual(1);
      // Escrow output should be 546 sats (dust)
      expect(psbt.txOutputs[0].value).toBe(546);
    });
  });

  describe('escrow state tracking', () => {
    it('should register and retrieve escrow state', () => {
      const txid = 'c'.repeat(64);
      escrow.registerEscrow(txid, 0, defaultParams);

      const state = escrow.getEscrowState(txid, 0);
      expect(state).toBeDefined();
      expect(state!.locked).toBe(true);
      expect(state!.claimed).toBe(false);
      expect(state!.refunded).toBe(false);
      expect(state!.params.inscriptionId).toBe(defaultParams.inscriptionId);
    });

    it('should mark claimed', () => {
      const txid = 'd'.repeat(64);
      escrow.registerEscrow(txid, 0, defaultParams);
      escrow.markClaimed(txid, 0);

      const state = escrow.getEscrowState(txid, 0);
      expect(state!.claimed).toBe(true);
      expect(state!.locked).toBe(false);
    });

    it('should mark refunded', () => {
      const txid = 'e'.repeat(64);
      escrow.registerEscrow(txid, 0, defaultParams);
      escrow.markRefunded(txid, 0);

      const state = escrow.getEscrowState(txid, 0);
      expect(state!.refunded).toBe(true);
      expect(state!.locked).toBe(false);
    });

    it('should return undefined for unknown escrow', () => {
      expect(escrow.getEscrowState('unknown', 0)).toBeUndefined();
    });
  });

  describe('witness builders', () => {
    it('should build a claim witness', () => {
      const sig = crypto.randomBytes(72);
      const preimage = crypto.randomBytes(32);
      const script = escrow.buildEscrowScript(defaultParams);

      const witness = escrow.buildClaimWitness(sig, preimage, script);
      expect(witness).toHaveLength(4);
      expect(witness[0]).toEqual(sig);
      expect(witness[1]).toEqual(preimage);
      expect(witness[2]).toEqual(Buffer.from([0x01]));
      expect(witness[3]).toEqual(script);
    });

    it('should build a refund witness', () => {
      const sig = crypto.randomBytes(72);
      const script = escrow.buildEscrowScript(defaultParams);

      const witness = escrow.buildRefundWitness(sig, script);
      expect(witness).toHaveLength(3);
      expect(witness[0]).toEqual(sig);
      expect(witness[1]).toEqual(Buffer.from([]));
      expect(witness[2]).toEqual(script);
    });
  });
});

describe('BitmapMarketplace', () => {
  let marketplace: BitmapMarketplace;
  let mockLightning: MockLightningClient;

  beforeEach(() => {
    mockLightning = new MockLightningClient();
    const escrow = new BitmapEscrow(mockConfig);
    const wallet = new WalletManager(mockConfig);
    const feeEstimator = new FeeEstimator(mockConfig);

    marketplace = new BitmapMarketplace(
      mockConfig,
      escrow,
      mockLightning as any,
      wallet,
      feeEstimator,
    );
  });

  describe('createListing', () => {
    it('should create a listing with LN invoice', async () => {
      const listing = await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      expect(listing.id).toBeDefined();
      expect(listing.state).toBe(ListingState.ACTIVE);
      expect(listing.bitmapNumber).toBe('820000.bitmap');
      expect(listing.priceSats).toBe(100000);
      expect(listing.lightningInvoice).toBeDefined();
      expect(listing.paymentHash).toBeDefined();
    });

    it('should reject price below dust', async () => {
      await expect(
        marketplace.createListing('a'.repeat(64) + ':0', '1.bitmap', 'bcrt1q', 100),
      ).rejects.toThrow('Price must be at least 546 sats');
    });

    it('should reject invalid inscription ID', async () => {
      await expect(
        marketplace.createListing('invalid', '1.bitmap', 'bcrt1q', 10000),
      ).rejects.toThrow('Invalid inscription ID');
    });

    it('should emit CREATED event', async () => {
      const events: SwapEvent[] = [];
      marketplace.onUpdate((update) => events.push(update.event));

      await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      expect(events).toContain(SwapEvent.CREATED);
    });
  });

  describe('cancelListing', () => {
    it('should cancel an active listing', async () => {
      const listing = await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      const canceled = await marketplace.cancelListing(listing.id);
      expect(canceled.state).toBe(ListingState.CANCELED);
    });

    it('should reject canceling a completed listing', async () => {
      const listing = await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      // Force to completed
      (listing as any).state = ListingState.COMPLETED;

      await expect(marketplace.cancelListing(listing.id)).rejects.toThrow(
        'Cannot cancel a completed listing',
      );
    });
  });

  describe('getActiveListings', () => {
    it('should return only active listings', async () => {
      await marketplace.createListing('a'.repeat(64) + ':0', '1.bitmap', 'bcrt1q', 10000);
      await marketplace.createListing('b'.repeat(64) + ':0', '2.bitmap', 'bcrt1q', 20000);

      const listing3 = await marketplace.createListing(
        'c'.repeat(64) + ':0',
        '3.bitmap',
        'bcrt1q',
        30000,
      );
      await marketplace.cancelListing(listing3.id);

      const active = marketplace.getActiveListings();
      expect(active).toHaveLength(2);
    });
  });

  describe('getListing', () => {
    it('should retrieve a listing by ID', async () => {
      const listing = await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      const retrieved = marketplace.getListing(listing.id);
      expect(retrieved.id).toBe(listing.id);
    });

    it('should throw for unknown listing ID', () => {
      expect(() => marketplace.getListing('nonexistent')).toThrow('Listing not found');
    });
  });

  describe('expiry', () => {
    it('should expire old listings', async () => {
      const listing = await marketplace.createListing(
        'a'.repeat(64) + ':0',
        '820000.bitmap',
        'bcrt1qseller',
        100000,
      );

      listing.expiresAt = new Date(Date.now() - 1000);

      await marketplace.checkExpiredListings();

      const updated = marketplace.getListing(listing.id);
      expect(updated.state).toBe(ListingState.EXPIRED);
    });
  });
});

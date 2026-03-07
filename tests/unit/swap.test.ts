import { SubmarineSwap } from '../../src/core/SubmarineSwap';
import { HTLCManager } from '../../src/core/HTLCManager';
import { FeeEstimator } from '../../src/core/FeeEstimator';
import { WalletManager } from '../../src/core/WalletManager';
import { MockLightningClient } from '../mocks/MockLightningClient';
import { MockRunesIndexer } from '../mocks/MockRunesIndexer';
import { BridgeConfig, SwapState, SwapDirection, SwapEvent } from '../../src/types';

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

describe('SubmarineSwap', () => {
  let swapEngine: SubmarineSwap;
  let mockLightning: MockLightningClient;
  let mockIndexer: MockRunesIndexer;

  beforeEach(() => {
    mockLightning = new MockLightningClient();
    mockIndexer = new MockRunesIndexer();

    // Set up bridge balance for withdrawals
    mockIndexer.setBalance('bcrt1qbridge', [
      {
        runeId: { block: 840000, tx: 1 },
        runeName: 'DOG',
        amount: 10000000n,
        address: 'bcrt1qbridge',
        utxo: { txid: 'a'.repeat(64), vout: 0, value: 546 },
      },
    ]);

    const htlc = new HTLCManager(mockConfig);
    const wallet = new WalletManager(mockConfig);
    const feeEstimator = new FeeEstimator(mockConfig);

    swapEngine = new SubmarineSwap(
      mockConfig,
      htlc,
      mockLightning as any,
      mockIndexer as any,
      wallet,
      feeEstimator,
    );
  });

  describe('Deposit flow', () => {
    it('should create a deposit swap', async () => {
      const swap = await swapEngine.initiateDeposit(
        'DOG',
        1000n,
        'lnbcrt1000n1test',
        'bcrt1qrefund',
      );

      expect(swap.id).toBeDefined();
      expect(swap.direction).toBe(SwapDirection.DEPOSIT);
      expect(swap.state).toBe(SwapState.CREATED);
      expect(swap.runeName).toBe('DOG');
      expect(swap.runeAmount).toBe(1000n);
    });

    it('should reject amounts below minimum', async () => {
      await expect(
        swapEngine.initiateDeposit('DOG', 10n, 'lnbcrt100n1test', 'bcrt1qrefund'),
      ).rejects.toThrow('Amount below minimum');
    });

    it('should reject amounts above maximum', async () => {
      await expect(
        swapEngine.initiateDeposit('DOG', 999999999n, 'lnbcrt100n1test', 'bcrt1qrefund'),
      ).rejects.toThrow('Amount above maximum');
    });

    it('should emit events on state changes', async () => {
      const events: SwapEvent[] = [];
      swapEngine.onSwapUpdate((update) => events.push(update.event));

      await swapEngine.initiateDeposit('DOG', 1000n, 'lnbcrt1000n1test', 'bcrt1qrefund');

      expect(events).toContain(SwapEvent.CREATED);
    });
  });

  describe('Withdraw flow', () => {
    it('should create a withdrawal swap', async () => {
      const swap = await swapEngine.initiateWithdraw('DOG', 1000n, 'bcrt1qdest');

      expect(swap.id).toBeDefined();
      expect(swap.direction).toBe(SwapDirection.WITHDRAW);
      expect(swap.state).toBe(SwapState.CREATED);
      expect(swap.lightningInvoice).toBeDefined();
      expect(swap.lightningInvoice.startsWith('lnbcrt')).toBe(true);
    });

    it('should reject if bridge has insufficient liquidity', async () => {
      mockIndexer.setBalance('bcrt1qbridge', []);

      await expect(
        swapEngine.initiateWithdraw('DOG', 1000n, 'bcrt1qdest'),
      ).rejects.toThrow('Insufficient bridge liquidity');
    });
  });

  describe('Swap retrieval', () => {
    it('should retrieve a swap by ID', async () => {
      const swap = await swapEngine.initiateDeposit(
        'DOG',
        1000n,
        'lnbcrt1000n1test',
        'bcrt1qrefund',
      );

      const retrieved = swapEngine.getSwap(swap.id);
      expect(retrieved.id).toBe(swap.id);
    });

    it('should throw for unknown swap ID', () => {
      expect(() => swapEngine.getSwap('nonexistent')).toThrow('Swap not found');
    });

    it('should list all swaps', async () => {
      await swapEngine.initiateDeposit('DOG', 1000n, 'lnbcrt1000n1test', 'bcrt1qrefund');
      await swapEngine.initiateWithdraw('DOG', 2000n, 'bcrt1qdest');

      const allSwaps = swapEngine.getAllSwaps();
      expect(allSwaps).toHaveLength(2);
    });
  });

  describe('Expiry handling', () => {
    it('should mark expired swaps', async () => {
      const swap = await swapEngine.initiateDeposit(
        'DOG',
        1000n,
        'lnbcrt1000n1test',
        'bcrt1qrefund',
      );

      // Force expiry
      swap.expiresAt = new Date(Date.now() - 1000);

      await swapEngine.checkExpiredSwaps();

      const updated = swapEngine.getSwap(swap.id);
      expect(updated.state).toBe(SwapState.EXPIRED);
    });
  });
});

/**
 * Integration test stubs for RuneBolt bridge.
 *
 * These tests require running bitcoind, LND, and ord instances.
 * Use docker-compose to spin up the test environment:
 *   docker-compose up -d
 *   npm run test:integration
 */

import { RunesBridge } from '../../src/core/RunesBridge';
import { BridgeConfig } from '../../src/types';

const INTEGRATION_CONFIG: BridgeConfig = {
  network: 'regtest',
  mode: 'custodial',
  bitcoin: {
    rpcUrl: process.env.BITCOIN_RPC_URL || 'http://localhost:18443',
    rpcUser: process.env.BITCOIN_RPC_USER || 'bitcoin',
    rpcPass: process.env.BITCOIN_RPC_PASS || 'bitcoin',
  },
  lightning: {
    lndHost: process.env.LND_HOST || 'localhost',
    lndPort: parseInt(process.env.LND_PORT || '10009'),
    tlsCertPath: process.env.LND_TLS_CERT || '',
    macaroonPath: process.env.LND_MACAROON || '',
  },
  indexer: {
    ordApiUrl: process.env.ORD_API_URL || 'http://localhost:80',
    unisatApiUrl: '',
    unisatApiKey: '',
  },
  bridge: {
    htlcTimeoutBlocks: 10,
    minSwapAmount: 100n,
    maxSwapAmount: 100000000n,
    feeRateBps: 50,
    bridgeAddress: '',
    bridgePrivkeyPath: '',
  },
  server: { port: 3001, host: '0.0.0.0', corsOrigins: ['*'] },
};

// Skip integration tests unless explicitly enabled
const describeIntegration = process.env.RUN_INTEGRATION ? describe : describe.skip;

describeIntegration('RuneBolt Bridge Integration', () => {
  let bridge: RunesBridge;

  beforeAll(async () => {
    bridge = new RunesBridge(INTEGRATION_CONFIG);
    await bridge.start();
  }, 30000);

  afterAll(async () => {
    await bridge.stop();
  });

  it('should connect to LND', async () => {
    const info = await bridge.lightning.getInfo();
    expect(info.alias).toBeDefined();
    expect(info.syncedToChain).toBe(true);
  });

  it('should create a deposit swap', async () => {
    // Create a Lightning invoice first
    const invoice = await bridge.lightning.addInvoice(1000, 'test deposit');

    const swap = await bridge.deposit('DOG', 1000n, invoice.paymentRequest, 'bcrt1qtest');

    expect(swap.id).toBeDefined();
    expect(swap.state).toBe('created');
  });

  it('should create a withdrawal swap', async () => {
    // This requires bridge to have Runes balance
    // Stub: in a real integration test, etch Runes first
    try {
      const swap = await bridge.withdraw('DOG', 1000n, 'bcrt1qdestination');
      expect(swap.id).toBeDefined();
    } catch (err) {
      // Expected if bridge has no Runes balance in test env
      expect((err as Error).message).toContain('Insufficient bridge liquidity');
    }
  });

  it('should estimate fees', async () => {
    const fees = await bridge.feeEstimator.estimateFees();
    expect(fees.fastestFee).toBeGreaterThan(0);
    expect(fees.minimumFee).toBeGreaterThan(0);
  });

  it('should get block height', async () => {
    const height = await bridge.wallet.getBlockHeight();
    expect(height).toBeGreaterThan(0);
  });
});

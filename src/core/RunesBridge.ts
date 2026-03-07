import { createLogger } from '../utils/logger';
import { BridgeConfig, Swap, SwapUpdate } from '../types';
import { HTLCManager } from './HTLCManager';
import { LightningClient } from './LightningClient';
import { RunesIndexer } from './RunesIndexer';
import { SubmarineSwap } from './SubmarineSwap';
import { WalletManager } from './WalletManager';
import { FeeEstimator } from './FeeEstimator';
import { BitmapEscrow } from './BitmapEscrow';
import { BitmapMarketplace } from './BitmapMarketplace';

const log = createLogger('RunesBridge');

/**
 * RunesBridge - Main orchestrator for the Runes Lightning Bridge.
 *
 * Coordinates all subsystems:
 * - HTLCManager: HTLC creation and management for Runes
 * - LightningClient: LND connection for Lightning payments
 * - RunesIndexer: Runes balance tracking via ord/Unisat
 * - SubmarineSwap: Atomic swap engine
 * - WalletManager: UTXO management
 * - FeeEstimator: On-chain fee estimation
 * - BitmapEscrow: HTLC escrow for Ordinals/Bitmap inscriptions
 * - BitmapMarketplace: Trustless Bitmap block marketplace
 */
export class RunesBridge {
  readonly htlc: HTLCManager;
  readonly lightning: LightningClient;
  readonly indexer: RunesIndexer;
  readonly swapEngine: SubmarineSwap;
  readonly wallet: WalletManager;
  readonly feeEstimator: FeeEstimator;
  readonly bitmapEscrow: BitmapEscrow;
  readonly bitmapMarketplace: BitmapMarketplace;
  private expiryInterval: NodeJS.Timeout | null = null;
  private readonly config: BridgeConfig;

  constructor(config: BridgeConfig) {
    this.config = config;
    this.htlc = new HTLCManager(config);
    this.lightning = new LightningClient(config);
    this.indexer = new RunesIndexer(config);
    this.wallet = new WalletManager(config);
    this.feeEstimator = new FeeEstimator(config);
    this.swapEngine = new SubmarineSwap(
      config,
      this.htlc,
      this.lightning,
      this.indexer,
      this.wallet,
      this.feeEstimator,
    );
    this.bitmapEscrow = new BitmapEscrow(config);
    this.bitmapMarketplace = new BitmapMarketplace(
      config,
      this.bitmapEscrow,
      this.lightning,
      this.wallet,
      this.feeEstimator,
    );
  }

  async start(): Promise<void> {
    log.info({ network: this.config.network, mode: this.config.mode }, 'Starting RuneBolt bridge');

    // Connect to LND
    await this.lightning.connect();

    // Start watching for expired swaps and listings
    this.expiryInterval = setInterval(() => {
      this.swapEngine.checkExpiredSwaps().catch((err) => {
        log.error({ err }, 'Error checking expired swaps');
      });
      this.bitmapMarketplace.checkExpiredListings().catch((err) => {
        log.error({ err }, 'Error checking expired bitmap listings');
      });
    }, 60_000);

    // Subscribe to Lightning invoice updates for withdraw flow
    this.lightning.subscribeInvoices((invoice) => {
      if (invoice.settled) {
        this.handleSettledInvoice(invoice.r_hash.toString('hex'));
      }
    });

    log.info('RuneBolt bridge started');
  }

  async stop(): Promise<void> {
    log.info('Stopping RuneBolt bridge');
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
    }
    await this.lightning.close();
    log.info('RuneBolt bridge stopped');
  }

  /**
   * Deposit: Lock Runes on-chain, receive Lightning payment.
   */
  async deposit(
    runeName: string,
    runeAmount: bigint,
    lightningInvoice: string,
    refundAddress: string,
  ): Promise<Swap> {
    return this.swapEngine.initiateDeposit(runeName, runeAmount, lightningInvoice, refundAddress);
  }

  /**
   * Confirm deposit after user locks Runes in HTLC.
   */
  async confirmDeposit(swapId: string, htlcTxid: string): Promise<Swap> {
    return this.swapEngine.confirmDeposit(swapId, htlcTxid);
  }

  /**
   * Withdraw: Pay Lightning invoice, receive Runes on-chain.
   */
  async withdraw(
    runeName: string,
    runeAmount: bigint,
    destinationAddress: string,
  ): Promise<Swap> {
    return this.swapEngine.initiateWithdraw(runeName, runeAmount, destinationAddress);
  }

  /**
   * Get swap status.
   */
  getSwap(swapId: string): Swap {
    return this.swapEngine.getSwap(swapId);
  }

  /**
   * Subscribe to swap updates.
   */
  onSwapUpdate(listener: (update: SwapUpdate) => void): void {
    this.swapEngine.onSwapUpdate(listener);
  }

  private async handleSettledInvoice(paymentHash: string): Promise<void> {
    // Find the withdrawal swap matching this payment hash
    const swaps = this.swapEngine.getAllSwaps();
    const swap = swaps.find((s) => s.paymentHash === paymentHash && s.direction === 'withdraw');
    if (swap) {
      log.info({ swapId: swap.id }, 'Invoice settled, processing withdrawal');
      await this.swapEngine.processWithdrawPayment(swap.id);
    }
  }
}

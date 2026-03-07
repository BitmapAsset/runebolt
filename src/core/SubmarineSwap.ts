import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';
import { SwapError } from '../utils/errors';
import {
  Swap,
  SwapDirection,
  SwapState,
  SwapUpdate,
  SwapEvent,
  BridgeConfig,
  RuneId,
} from '../types';
import { HTLCManager } from './HTLCManager';
import { LightningClient } from './LightningClient';
import { RunesIndexer } from './RunesIndexer';
import { WalletManager } from './WalletManager';
import { FeeEstimator } from './FeeEstimator';

const log = createLogger('SubmarineSwap');

type SwapListener = (update: SwapUpdate) => void;

export class SubmarineSwap {
  private readonly swaps = new Map<string, Swap>();
  private readonly listeners: SwapListener[] = [];
  private readonly config: BridgeConfig;
  private readonly htlc: HTLCManager;
  private readonly lightning: LightningClient;
  private readonly indexer: RunesIndexer;
  private readonly wallet: WalletManager;
  private readonly feeEstimator: FeeEstimator;

  constructor(
    config: BridgeConfig,
    htlc: HTLCManager,
    lightning: LightningClient,
    indexer: RunesIndexer,
    wallet: WalletManager,
    feeEstimator: FeeEstimator,
  ) {
    this.config = config;
    this.htlc = htlc;
    this.lightning = lightning;
    this.indexer = indexer;
    this.wallet = wallet;
    this.feeEstimator = feeEstimator;
  }

  onSwapUpdate(listener: SwapListener): void {
    this.listeners.push(listener);
  }

  private emit(swap: Swap, event: SwapEvent, data?: Record<string, unknown>): void {
    const update: SwapUpdate = {
      swapId: swap.id,
      event,
      state: swap.state,
      data,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener(update);
      } catch (err) {
        log.error({ err }, 'Swap listener error');
      }
    }
  }

  /**
   * DEPOSIT flow: User locks Runes on-chain, bridge pays Lightning invoice.
   *
   * 1. User provides: Runes to deposit + Lightning invoice to pay
   * 2. Bridge creates HTLC on-chain locked with invoice's payment hash
   * 3. User sends Runes to the HTLC address
   * 4. Bridge verifies Runes received, pays the Lightning invoice
   * 5. User (or bridge) claims the HTLC using the preimage
   */
  async initiateDeposit(
    runeName: string,
    runeAmount: bigint,
    lightningInvoice: string,
    refundAddress: string,
  ): Promise<Swap> {
    log.info({ runeName, runeAmount: runeAmount.toString(), refundAddress }, 'Initiating deposit swap');

    // Validate amounts
    if (runeAmount < this.config.bridge.minSwapAmount) {
      throw new SwapError(`Amount below minimum: ${this.config.bridge.minSwapAmount}`);
    }
    if (runeAmount > this.config.bridge.maxSwapAmount) {
      throw new SwapError(`Amount above maximum: ${this.config.bridge.maxSwapAmount}`);
    }

    // Get rune info
    const runeInfo = await this.indexer.getRuneInfo(runeName);
    const runeId = this.indexer.parseRuneId(runeInfo.id);

    // Decode Lightning invoice to get payment hash
    const decoded = await this.lightning.decodePayReq(lightningInvoice);

    // Calculate the satoshi equivalent (for fee calculation)
    const feeAmount = this.calculateFee(decoded.numSatoshis);

    const swap: Swap = {
      id: uuidv4(),
      direction: SwapDirection.DEPOSIT,
      state: SwapState.CREATED,
      runeId,
      runeName: runeName.toUpperCase(),
      runeAmount,
      satoshiAmount: decoded.numSatoshis,
      lightningInvoice,
      paymentHash: decoded.paymentHash,
      preimage: null,
      htlcTxid: null,
      claimTxid: null,
      refundTxid: null,
      onchainAddress: refundAddress,
      expiresAt: new Date(Date.now() + this.config.bridge.htlcTimeoutBlocks * 10 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.swaps.set(swap.id, swap);
    this.emit(swap, SwapEvent.CREATED, { feeAmount });
    log.info({ swapId: swap.id }, 'Deposit swap created');

    return swap;
  }

  /**
   * After the user has sent Runes to the HTLC, verify and lock them.
   */
  async confirmDeposit(swapId: string, htlcTxid: string): Promise<Swap> {
    const swap = this.getSwap(swapId);
    if (swap.state !== SwapState.CREATED) {
      throw new SwapError(`Invalid state for deposit confirmation: ${swap.state}`);
    }

    log.info({ swapId, htlcTxid }, 'Confirming deposit');

    // Verify the Runes are locked in the HTLC
    const verified = await this.indexer.verifyRuneUtxo(
      { txid: htlcTxid, vout: 1, value: 546 },
      swap.runeId,
      swap.runeAmount,
    );

    if (!verified) {
      throw new SwapError('Could not verify Runes in HTLC output');
    }

    swap.htlcTxid = htlcTxid;
    swap.state = SwapState.HTLC_LOCKED;
    swap.updatedAt = new Date();
    this.emit(swap, SwapEvent.HTLC_LOCKED, { htlcTxid });

    // Now pay the Lightning invoice
    try {
      const payment = await this.lightning.sendPayment(swap.lightningInvoice);
      swap.preimage = payment.preimage;
      swap.state = SwapState.INVOICE_PAID;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.INVOICE_PAID, {
        preimage: payment.preimage,
        feeSat: payment.feeSat,
      });

      // Mark as completed (in custodial mode, bridge already has the Runes)
      swap.state = SwapState.COMPLETED;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.COMPLETED);

      log.info({ swapId }, 'Deposit swap completed');
    } catch (err) {
      log.error({ err, swapId }, 'Failed to pay Lightning invoice');
      swap.state = SwapState.FAILED;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.FAILED, { error: (err as Error).message });
    }

    return swap;
  }

  /**
   * WITHDRAW flow: User pays Lightning invoice, bridge sends Runes on-chain.
   *
   * 1. User provides: destination address for Runes
   * 2. Bridge creates Lightning invoice
   * 3. User pays the invoice
   * 4. Bridge sends Runes to user's address
   */
  async initiateWithdraw(
    runeName: string,
    runeAmount: bigint,
    destinationAddress: string,
  ): Promise<Swap> {
    log.info({ runeName, runeAmount: runeAmount.toString(), destinationAddress }, 'Initiating withdraw swap');

    if (runeAmount < this.config.bridge.minSwapAmount) {
      throw new SwapError(`Amount below minimum: ${this.config.bridge.minSwapAmount}`);
    }
    if (runeAmount > this.config.bridge.maxSwapAmount) {
      throw new SwapError(`Amount above maximum: ${this.config.bridge.maxSwapAmount}`);
    }

    // Check bridge has sufficient Runes balance
    const bridgeBalance = await this.indexer.getRuneBalance(
      this.config.bridge.bridgeAddress,
      runeName,
    );
    if (!bridgeBalance || bridgeBalance.amount < runeAmount) {
      throw new SwapError('Insufficient bridge liquidity for this rune');
    }

    const runeId = bridgeBalance.runeId;

    // Calculate sat amount based on some rate (simplified - would use an oracle in production)
    const satAmount = this.runeToSatRate(runeAmount);
    const feeAmount = this.calculateFee(satAmount);
    const totalSatAmount = satAmount + feeAmount;

    // Create Lightning invoice
    const preimageBytes = crypto.randomBytes(32);
    const invoice = await this.lightning.addInvoice(
      totalSatAmount,
      `RuneBolt withdraw: ${runeAmount} ${runeName}`,
      3600,
    );

    const swap: Swap = {
      id: uuidv4(),
      direction: SwapDirection.WITHDRAW,
      state: SwapState.CREATED,
      runeId,
      runeName: runeName.toUpperCase(),
      runeAmount,
      satoshiAmount: totalSatAmount,
      lightningInvoice: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      preimage: null,
      htlcTxid: null,
      claimTxid: null,
      refundTxid: null,
      onchainAddress: destinationAddress,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.swaps.set(swap.id, swap);
    this.emit(swap, SwapEvent.CREATED, {
      invoice: invoice.paymentRequest,
      satAmount: totalSatAmount,
    });

    log.info({ swapId: swap.id }, 'Withdraw swap created');
    return swap;
  }

  /**
   * Process a paid invoice for a withdrawal swap.
   */
  async processWithdrawPayment(swapId: string): Promise<Swap> {
    const swap = this.getSwap(swapId);
    if (swap.direction !== SwapDirection.WITHDRAW) {
      throw new SwapError('Not a withdrawal swap');
    }

    // Verify invoice is paid
    const invoiceStatus = await this.lightning.lookupInvoice(swap.paymentHash);
    if (!invoiceStatus.settled) {
      throw new SwapError('Invoice not yet paid');
    }

    swap.preimage = invoiceStatus.preimage;
    swap.state = SwapState.INVOICE_PAID;
    swap.updatedAt = new Date();
    this.emit(swap, SwapEvent.INVOICE_PAID);

    // Send Runes on-chain to user's address
    try {
      // In production, this would build and sign a Runes transfer transaction
      // using the bridge's wallet
      const feeRate = await this.feeEstimator.getRecommendedFeeRate();
      log.info(
        {
          swapId,
          destination: swap.onchainAddress,
          runeAmount: swap.runeAmount.toString(),
          feeRate,
        },
        'Sending Runes on-chain',
      );

      // TODO: Build and broadcast Runes transfer transaction
      // const txid = await this.buildAndBroadcastRunesTransfer(...);
      // swap.claimTxid = txid;

      swap.state = SwapState.RUNES_SENT;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.RUNES_SENT);

      swap.state = SwapState.COMPLETED;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.COMPLETED);

      log.info({ swapId }, 'Withdraw swap completed');
    } catch (err) {
      log.error({ err, swapId }, 'Failed to send Runes');
      swap.state = SwapState.FAILED;
      swap.updatedAt = new Date();
      this.emit(swap, SwapEvent.FAILED, { error: (err as Error).message });
    }

    return swap;
  }

  /**
   * Refund an expired deposit swap.
   */
  async refundDeposit(swapId: string): Promise<Swap> {
    const swap = this.getSwap(swapId);
    if (swap.state !== SwapState.HTLC_LOCKED) {
      throw new SwapError('Swap is not in refundable state');
    }
    if (new Date() < swap.expiresAt) {
      throw new SwapError('Swap has not expired yet');
    }

    log.info({ swapId }, 'Refunding deposit');

    // TODO: Build and broadcast refund transaction
    swap.state = SwapState.REFUNDED;
    swap.updatedAt = new Date();
    this.emit(swap, SwapEvent.REFUNDED);

    return swap;
  }

  getSwap(swapId: string): Swap {
    const swap = this.swaps.get(swapId);
    if (!swap) {
      throw new SwapError(`Swap not found: ${swapId}`);
    }
    return swap;
  }

  getAllSwaps(): Swap[] {
    return Array.from(this.swaps.values());
  }

  private calculateFee(satAmount: number): number {
    return Math.ceil((satAmount * this.config.bridge.feeRateBps) / 10000);
  }

  private runeToSatRate(runeAmount: bigint): number {
    // Simplified rate conversion - in production, use a price oracle
    // 1 Rune unit = 1 sat (placeholder)
    return Number(runeAmount);
  }

  /**
   * Check for expired swaps and handle them.
   */
  async checkExpiredSwaps(): Promise<void> {
    const now = new Date();
    for (const swap of this.swaps.values()) {
      if (
        swap.state === SwapState.CREATED ||
        swap.state === SwapState.HTLC_LOCKED
      ) {
        if (now > swap.expiresAt) {
          log.warn({ swapId: swap.id }, 'Swap expired');
          swap.state = SwapState.EXPIRED;
          swap.updatedAt = now;
          this.emit(swap, SwapEvent.EXPIRED);
        }
      }
    }
  }
}

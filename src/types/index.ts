import { z } from 'zod';

// ── Runes Types ──

export interface RuneId {
  block: number;
  tx: number;
}

export interface RuneBalance {
  runeId: RuneId;
  runeName: string;
  amount: bigint;
  address: string;
  utxo: UtxoRef;
}

export interface UtxoRef {
  txid: string;
  vout: number;
  value: number; // satoshi value
}

export interface RuneTransfer {
  runeId: RuneId;
  amount: bigint;
  from: string;
  to: string;
}

// ── Swap Types ──

export enum SwapDirection {
  DEPOSIT = 'deposit',   // Runes on-chain -> Lightning payment received
  WITHDRAW = 'withdraw', // Lightning payment sent -> Runes on-chain received
}

export enum SwapState {
  CREATED = 'created',
  HTLC_LOCKED = 'htlc_locked',
  INVOICE_PAID = 'invoice_paid',
  RUNES_SENT = 'runes_sent',
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export interface Swap {
  id: string;
  direction: SwapDirection;
  state: SwapState;
  runeId: RuneId;
  runeName: string;
  runeAmount: bigint;
  satoshiAmount: number;
  lightningInvoice: string;
  paymentHash: string;
  preimage: string | null;
  htlcTxid: string | null;
  claimTxid: string | null;
  refundTxid: string | null;
  onchainAddress: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── HTLC Types ──

export interface HTLCParams {
  paymentHash: Buffer;
  claimerPubkey: Buffer;
  refunderPubkey: Buffer;
  timelock: number; // block height
  runeId: RuneId;
  runeAmount: bigint;
}

export interface HTLCState {
  txid: string;
  vout: number;
  params: HTLCParams;
  locked: boolean;
  claimed: boolean;
  refunded: boolean;
}

// ── Lightning Types ──

export interface LightningInvoice {
  paymentRequest: string;
  paymentHash: string;
  valueSat: number;
  expiry: number;
  createdAt: Date;
}

export interface LightningPayment {
  paymentHash: string;
  preimage: string;
  valueSat: number;
  feeSat: number;
  status: 'succeeded' | 'failed' | 'in_flight';
}

export interface ChannelBalance {
  localBalance: number;
  remoteBalance: number;
  capacity: number;
}

// ── Config Types ──

export interface BridgeConfig {
  network: 'mainnet' | 'testnet' | 'regtest';
  mode: 'custodial' | 'non-custodial';
  bitcoin: {
    rpcUrl: string;
    rpcUser: string;
    rpcPass: string;
  };
  lightning: {
    lndHost: string;
    lndPort: number;
    tlsCertPath: string;
    macaroonPath: string;
  };
  indexer: {
    ordApiUrl: string;
    unisatApiUrl: string;
    unisatApiKey: string;
  };
  bridge: {
    htlcTimeoutBlocks: number;
    minSwapAmount: bigint;
    maxSwapAmount: bigint;
    feeRateBps: number; // basis points (100 = 1%)
    bridgeAddress: string;
    bridgePrivkeyPath: string;
  };
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
}

// ── API Schema Validation ──

export const DepositRequestSchema = z.object({
  runeName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.]+$/, 'Invalid rune name'),
  runeAmount: z.string().regex(/^\d+$/, 'Must be a positive integer').max(30),
  lightningInvoice: z.string().startsWith('ln').max(1500),
  refundAddress: z.string().min(1).max(200),
});

export const WithdrawRequestSchema = z.object({
  runeName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.]+$/, 'Invalid rune name'),
  runeAmount: z.string().regex(/^\d+$/, 'Must be a positive integer').max(30),
  destinationAddress: z.string().min(1).max(200),
});

export type DepositRequest = z.infer<typeof DepositRequestSchema>;
export type WithdrawRequest = z.infer<typeof WithdrawRequestSchema>;

// ── Event Types ──

export enum SwapEvent {
  CREATED = 'swap:created',
  HTLC_LOCKED = 'swap:htlc_locked',
  INVOICE_PAID = 'swap:invoice_paid',
  RUNES_SENT = 'swap:runes_sent',
  COMPLETED = 'swap:completed',
  REFUNDED = 'swap:refunded',
  EXPIRED = 'swap:expired',
  FAILED = 'swap:failed',
}

export interface SwapUpdate {
  swapId: string;
  event: SwapEvent;
  state: SwapState;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// ── Fee Estimation ──

export interface FeeEstimate {
  fastestFee: number;  // sat/vB
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
}

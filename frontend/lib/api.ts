/**
 * RuneBolt API Client
 * Frontend API integration for RuneBolt backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_RUNEBOLT_API_URL || 'http://localhost:3141';

// Types
export interface AssetBalance {
  address: string;
  runes: Array<{
    id: string;
    name: string;
    symbol: string;
    amount: number;
    decimals: number;
  }>;
  ordinals: Array<{
    id: string;
    inscriptionNumber: number;
    contentType: string;
  }>;
  bitmaps: Array<{
    blockNumber: number;
    inscriptionId: string;
  }>;
}

export interface LightningInvoice {
  paymentRequest: string;
  paymentHash: string;
  expiresAt: string;
}

export interface HTLCCreation {
  swapId: string;
  htlcAddress: string;
  redeemScript: string;
  paymentHash: string;
  timeoutBlockHeight: number;
  network: string;
}

export interface BridgeTransfer {
  transferId: string;
  paymentRequest: string;
  feeSats: number;
  memo: string;
  expiresAt: string;
}

export interface SwapStatus {
  id: string;
  status: 'pending_lock' | 'locked' | 'claimed' | 'refunded' | 'expired';
  preimage?: string;
  paymentHash: string;
  senderPubkey: string;
  recipientPubkey: string;
  timeoutBlockHeight: number;
  htlcAddress: string;
  txid?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UTXOInput {
  txid: string;
  vout: number;
  value: number;
  scriptPubKey?: string;
}

// Error handling
class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(response.status, error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Health & Status ──────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; service: string; timestamp: string }> {
  return fetchAPI('/api/health');
}

export async function getStatus(): Promise<any> {
  return fetchAPI('/api/status');
}

export async function getNodeInfo(): Promise<{
  alias: string;
  pubkey: string;
  channels: number;
  peers: number;
  blockHeight: number;
  synced: boolean;
}> {
  return fetchAPI('/api/lightning/info');
}

// ── Runes Indexer ────────────────────────────────────────────────

export async function getAssetBalances(
  address: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<AssetBalance> {
  return fetchAPI(`/api/runes/${address}/balances?network=${network}`);
}

export async function verifyAssetOwnership(
  address: string,
  assetType: 'rune' | 'ordinal' | 'bitmap',
  assetId: string,
  amount: number = 1,
  network: 'mainnet' | 'testnet' = 'testnet'
): Promise<{ address: string; assetType: string; assetId: string; owns: boolean }> {
  return fetchAPI(
    `/api/runes/${address}/verify?assetType=${assetType}&assetId=${assetId}&amount=${amount}&network=${network}`
  );
}

export async function clearAddressCache(address: string): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/api/runes/${address}/clear-cache`, { method: 'POST' });
}

// ── Lightning Operations ─────────────────────────────────────────

export async function createInvoice(
  amount: number,
  memo?: string,
  expiry?: number
): Promise<LightningInvoice> {
  return fetchAPI('/api/lightning/invoice', {
    method: 'POST',
    body: JSON.stringify({ amount, memo, expiry }),
  });
}

export async function payInvoice(
  paymentRequest: string,
  feeLimit?: number
): Promise<any> {
  return fetchAPI('/api/lightning/pay', {
    method: 'POST',
    body: JSON.stringify({ paymentRequest, feeLimit }),
  });
}

export async function decodeInvoice(paymentRequest: string): Promise<any> {
  return fetchAPI(`/api/lightning/decode/${encodeURIComponent(paymentRequest)}`);
}

export async function checkInvoiceStatus(paymentHash: string): Promise<{
  settled: boolean;
  state: string;
  amount: string;
  memo: string;
  creationDate: string;
  settleDate?: string;
  paymentHash: string;
}> {
  return fetchAPI(`/api/lightning/invoice/${paymentHash}`);
}

// ── HTLC Bridge Operations ───────────────────────────────────────

export async function createHTLC(params: {
  senderPubkey: string;
  recipientPubkey: string;
  timeoutBlockHeight: number;
  network?: 'mainnet' | 'testnet' | 'regtest';
  assetId?: string;
}): Promise<HTLCCreation> {
  return fetchAPI('/api/bridge/htlc/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function buildLockTransaction(params: {
  senderAddress: string;
  htlcAddress: string;
  assetAmount: number;
  fundingUTXOs: UTXOInput[];
  changeAddress: string;
  feeRate?: number;
  network?: 'mainnet' | 'testnet' | 'regtest';
}): Promise<{ psbtBase64: string; htlcAddress: string; assetAmount: number }> {
  return fetchAPI('/api/bridge/build-lock-tx', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function buildClaimTransaction(params: {
  htlcUTXO: UTXOInput;
  redeemScript: string;
  preimage: string;
  recipientAddress: string;
  feeRate?: number;
  network?: 'mainnet' | 'testnet' | 'regtest';
}): Promise<any> {
  return fetchAPI('/api/bridge/build-claim-tx', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function buildRefundTransaction(params: {
  htlcUTXO: UTXOInput;
  redeemScript: string;
  senderAddress: string;
  timeoutBlockHeight: number;
  feeRate?: number;
  network?: 'mainnet' | 'testnet' | 'regtest';
}): Promise<any> {
  return fetchAPI('/api/bridge/build-refund-tx', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSwapStatus(swapId: string): Promise<SwapStatus> {
  return fetchAPI(`/api/bridge/swap/${swapId}`);
}

export async function updateSwapStatus(
  swapId: string,
  status: string,
  txid?: string
): Promise<SwapStatus> {
  return fetchAPI(`/api/bridge/swap/${swapId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, txid }),
  });
}

// ── Bridge Operations (Legacy) ───────────────────────────────────

export async function initiateTransfer(params: {
  assetType?: string;
  assetId: string;
  amount: number;
  senderAddress: string;
  receiverAddress: string;
  subId?: string;
}): Promise<BridgeTransfer> {
  return fetchAPI('/api/bridge/transfer', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function checkTransfer(transferId: string): Promise<any> {
  return fetchAPI(`/api/bridge/transfer/${transferId}`);
}

export async function calculateFee(assetId: string, amount: number): Promise<any> {
  return fetchAPI('/api/bridge/fee', {
    method: 'POST',
    body: JSON.stringify({ assetId, amount }),
  });
}

export async function listAssets(type?: string): Promise<any[]> {
  const query = type ? `?type=${type}` : '';
  return fetchAPI(`/api/bridge/assets${query}`);
}

export async function listTransfers(status?: string): Promise<any[]> {
  const query = status ? `?status=${status}` : '';
  return fetchAPI(`/api/bridge/transfers${query}`);
}

export async function getInventory(): Promise<any[]> {
  return fetchAPI('/api/bridge/inventory');
}

// ── Polling Utilities ────────────────────────────────────────────

export async function pollInvoiceStatus(
  paymentHash: string,
  onSettled: (status: any) => void,
  onError?: (error: Error) => void,
  intervalMs: number = 5000,
  timeoutMs: number = 300000 // 5 minutes
): Promise<() => void> {
  const startTime = Date.now();
  let isActive = true;

  const check = async () => {
    if (!isActive) return;

    try {
      const status = await checkInvoiceStatus(paymentHash);
      
      if (status.settled) {
        onSettled(status);
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        onError?.(new Error('Invoice polling timeout'));
        return;
      }

      setTimeout(check, intervalMs);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  check();

  // Return cleanup function
  return () => {
    isActive = false;
  };
}

export async function pollSwapStatus(
  swapId: string,
  targetStatus: string[],
  onReached: (status: SwapStatus) => void,
  onError?: (error: Error) => void,
  intervalMs: number = 5000,
  timeoutMs: number = 600000 // 10 minutes
): Promise<() => void> {
  const startTime = Date.now();
  let isActive = true;

  const check = async () => {
    if (!isActive) return;

    try {
      const status = await getSwapStatus(swapId);
      
      if (targetStatus.includes(status.status)) {
        onReached(status);
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        onError?.(new Error('Swap polling timeout'));
        return;
      }

      setTimeout(check, intervalMs);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  check();

  return () => {
    isActive = false;
  };
}

// ── Retry Logic ──────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError!;
}

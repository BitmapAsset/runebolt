/**
 * Runes Indexer — Unisat Open API Integration
 * Fetches real Runes, Ordinals, and Bitmap balances for any address
 */

import axios from 'axios';

const UNISAT_API_BASE = 'https://open-api.unisat.io/v1';
const CACHE_TTL_MS = 30000; // 30 seconds

// Validate address format to prevent path traversal in URL interpolation
const SAFE_ADDRESS_REGEX = /^[a-zA-Z0-9]{25,100}$/;

function validateAddress(address: string): void {
  if (!address || !SAFE_ADDRESS_REGEX.test(address)) {
    throw new Error('Invalid address format');
  }
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCacheKey(address: string, type: string): string {
  return `${type}:${address}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Types
export interface RuneBalance {
  runeid: string;
  rune: string;
  symbol: string;
  balance: string;
  divisibility: number;
}

export interface OrdinalItem {
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  contentLength: number;
}

export interface BitmapItem {
  blockNumber: number;
  inscriptionId: string;
}

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

/**
 * Fetch Runes balances for an address
 */
export async function fetchRunesBalances(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<RuneBalance[]> {
  validateAddress(address);
  const cacheKey = getCacheKey(address, 'runes');
  const cached = getCached<RuneBalance[]>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = network === 'testnet' 
      ? 'https://open-api.unisat.io/v1'
      : UNISAT_API_BASE;
    
    const response = await axios.get(
      `${baseUrl}/indexer/address/${address}/runes/balance`,
      {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.code !== 0 || !response.data?.data?.detail) {
      return [];
    }

    const balances = response.data.data.detail;
    setCache(cacheKey, balances);
    return balances;
  } catch (error: any) {
    // 404 means no runes found or invalid endpoint - return empty
    if (error.response?.status === 404) {
      return [];
    }
    console.error('Failed to fetch Runes balances:', error.message || error);
    return [];
  }
}

/**
 * Fetch Ordinals inscriptions for an address
 */
export async function fetchOrdinals(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<OrdinalItem[]> {
  validateAddress(address);
  const cacheKey = getCacheKey(address, 'ordinals');
  const cached = getCached<OrdinalItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = network === 'testnet' 
      ? 'https://open-api.unisat.io/v1'
      : UNISAT_API_BASE;

    const response = await axios.get(
      `${baseUrl}/indexer/address/${address}/inscription-data`,
      {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.code !== 0 || !response.data?.data?.inscription) {
      return [];
    }

    const ordinals = response.data.data.inscription.map((item: any) => ({
      inscriptionId: item.inscriptionId,
      inscriptionNumber: item.inscriptionNumber,
      contentType: item.contentType || 'unknown',
      contentLength: item.contentLength || 0,
    }));

    setCache(cacheKey, ordinals);
    return ordinals;
  } catch (error: any) {
    // 404 means no ordinals found - return empty
    if (error.response?.status === 404) {
      return [];
    }
    console.error('Failed to fetch Ordinals:', error.message || error);
    return [];
  }
}

/**
 * Fetch Bitmap assets (inscriptions with block number format)
 */
export async function fetchBitmaps(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<BitmapItem[]> {
  try {
    const ordinals = await fetchOrdinals(address, network);
    
    // Filter for Bitmap inscriptions (they follow a specific pattern)
    // Bitmap inscriptions typically have content like "720143.bitmap" or similar
    const bitmaps: BitmapItem[] = [];
    
    for (const ordinal of ordinals) {
      // Check if this looks like a Bitmap inscription
      // Bitmap inscriptions have specific content type or inscription number patterns
      if (ordinal.inscriptionId.includes('bitmap') || 
          ordinal.contentType?.includes('bitmap') ||
          ordinal.contentType?.includes('text/plain')) {
        // Extract block number from inscription ID or fetch content
        const blockMatch = ordinal.inscriptionId.match(/(\d+)\.bitmap/);
        if (blockMatch) {
          bitmaps.push({
            blockNumber: parseInt(blockMatch[1]),
            inscriptionId: ordinal.inscriptionId,
          });
        }
      }
    }

    return bitmaps;
  } catch (error) {
    console.error('Failed to fetch Bitmaps:', error);
    return [];
  }
}

/**
 * Get complete asset balance for an address
 */
export async function getAssetBalance(
  address: string, 
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<AssetBalance> {
  const [runes, ordinals, bitmaps] = await Promise.all([
    fetchRunesBalances(address, network),
    fetchOrdinals(address, network),
    fetchBitmaps(address, network),
  ]);

  return {
    address,
    runes: runes.map(r => ({
      id: r.runeid,
      name: r.rune,
      symbol: r.symbol,
      amount: parseInt(r.balance) / Math.pow(10, r.divisibility),
      decimals: r.divisibility,
    })),
    ordinals: ordinals.map(o => ({
      id: o.inscriptionId,
      inscriptionNumber: o.inscriptionNumber,
      contentType: o.contentType,
    })),
    bitmaps: bitmaps,
  };
}

/**
 * Validate if an address owns a specific asset
 */
export async function verifyAssetOwnership(
  address: string,
  assetType: 'rune' | 'ordinal' | 'bitmap',
  assetId: string,
  minAmount: number = 1,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<boolean> {
  const balance = await getAssetBalance(address, network);

  switch (assetType) {
    case 'rune':
      return balance.runes.some(r => r.id === assetId && r.amount >= minAmount);
    case 'ordinal':
      return balance.ordinals.some(o => o.id === assetId);
    case 'bitmap':
      return balance.bitmaps.some(b => b.blockNumber.toString() === assetId);
    default:
      return false;
  }
}

/**
 * Clear cache for an address (useful after transactions)
 */
export function clearAddressCache(address: string): void {
  cache.delete(getCacheKey(address, 'runes'));
  cache.delete(getCacheKey(address, 'ordinals'));
}

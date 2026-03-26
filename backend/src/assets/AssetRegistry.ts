/**
 * AssetRegistry — Central registry of supported assets in RuneBolt.
 *
 * RuneBolt supports FOUR asset types, each with a DIFFERENT on-chain mechanism:
 *   - RUNE:        Uses Runestone OP_RETURN protocol (e.g. DOG)
 *   - BTC:         Native Bitcoin sats
 *   - BRC20:       Uses inscription-based transfers (JSON envelope), NOT Runestones
 *   - INSCRIPTION: NFTs like Bitmap — non-fungible, uses escrow model
 */

export enum AssetType {
  RUNE = 'rune',
  BTC = 'btc',
  BRC20 = 'brc20',
  INSCRIPTION = 'inscription',
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  decimals: number;
  /** Only set for Rune assets (e.g. '840000:3') */
  runeId?: string;
  /** Only set for BRC-20 tokens (e.g. 'ordi') */
  ticker?: string;
  minTransfer: bigint;
  maxTransfer: bigint;
}

/** JSON-safe representation for API responses */
export interface AssetJson {
  id: string;
  name: string;
  type: AssetType;
  decimals: number;
  runeId?: string;
  ticker?: string;
  minTransfer: string;
  maxTransfer: string;
}

export function assetToJson(asset: Asset): AssetJson {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    decimals: asset.decimals,
    ...(asset.runeId ? { runeId: asset.runeId } : {}),
    ...(asset.ticker ? { ticker: asset.ticker } : {}),
    minTransfer: asset.minTransfer.toString(),
    maxTransfer: asset.maxTransfer.toString(),
  };
}

/**
 * AssetRegistry — singleton registry for all supported assets.
 *
 * Pre-loaded with the four launch assets: DOG, BTC, ORDI, BITMAP.
 */
class AssetRegistry {
  private static instance: AssetRegistry;
  private assets: Map<string, Asset> = new Map();

  private constructor() {
    this.registerDefaults();
  }

  static getInstance(): AssetRegistry {
    if (!AssetRegistry.instance) {
      AssetRegistry.instance = new AssetRegistry();
    }
    return AssetRegistry.instance;
  }

  private registerDefaults(): void {
    // DOG — Rune token, uses Runestone OP_RETURN
    this.register({
      id: 'dog',
      name: 'DOG',
      type: AssetType.RUNE,
      decimals: 5,
      runeId: '840000:3',
      minTransfer: 1n,
      maxTransfer: 100_000_000_000_000n, // 1 billion DOG at 5 decimals
    });

    // BTC — Native sats
    this.register({
      id: 'btc',
      name: 'Bitcoin',
      type: AssetType.BTC,
      decimals: 8,
      minTransfer: 546n, // dust limit
      maxTransfer: 21_000_000_00_000_000n, // 21M BTC in sats
    });

    // ORDI — BRC-20 token, uses inscription-based transfer (NOT Runestones)
    this.register({
      id: 'ordi',
      name: 'ORDI',
      type: AssetType.BRC20,
      decimals: 18,
      ticker: 'ordi',
      minTransfer: 1n,
      maxTransfer: 21_000_000_000_000_000_000_000_000n, // 21M at 18 decimals
    });

    // BITMAP — Inscription NFT, uses escrow model (non-fungible, cannot be split)
    this.register({
      id: 'bitmap',
      name: 'Bitmap',
      type: AssetType.INSCRIPTION,
      decimals: 0,
      minTransfer: 1n,
      maxTransfer: 1n, // NFTs are always 1
    });
  }

  register(asset: Asset): void {
    this.assets.set(asset.id, asset);
  }

  get(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  getAll(): Asset[] {
    return Array.from(this.assets.values());
  }

  getByType(type: AssetType): Asset[] {
    return this.getAll().filter(a => a.type === type);
  }

  getByTicker(ticker: string): Asset | undefined {
    return this.getAll().find(a => a.ticker === ticker);
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }
}

export default AssetRegistry;

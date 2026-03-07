/**
 * RuneBolt Asset Registry
 * 
 * Supports three Bitcoin-native asset types:
 * 1. RUNES   — UTXO-based tokens (e.g., $DOG)
 * 2. BITMAP  — Inscription-based block ownership (e.g., Block #720143)
 * 3. BRC-20  — Inscription-based fungible tokens
 * 
 * Each type has different on-chain transfer mechanics but the same
 * Lightning coordination flow in the relay model.
 */

const ASSET_TYPES = {
  RUNE: 'rune',
  BITMAP: 'bitmap',
  BRC20: 'brc20',
};

/**
 * Asset metadata and transfer configuration
 */
const ASSET_CONFIGS = {
  [ASSET_TYPES.RUNE]: {
    name: 'Runes',
    description: 'UTXO-based tokens on Bitcoin (Runes protocol)',
    fungible: true,
    // Runes use OP_RETURN with Runestone encoding
    transferMethod: 'runestone',
    examples: ['DOG•GO•TO•THE•MOON', 'UNCOMMON•GOODS'],
    // Minimum amount for relay (to cover on-chain fees)
    minTransferAmount: 1,
    // On-chain fee estimation (vbytes for a typical Rune transfer)
    estimatedTxSize: 250,
  },
  [ASSET_TYPES.BITMAP]: {
    name: 'Bitmap',
    description: 'Bitcoin block ownership inscriptions',
    fungible: false, // Each bitmap is unique (specific block)
    transferMethod: 'ordinal_transfer',
    examples: ['720143.bitmap', '718840.bitmap', '738505.bitmap'],
    minTransferAmount: 1,
    estimatedTxSize: 200,
  },
  [ASSET_TYPES.BRC20]: {
    name: 'BRC-20',
    description: 'Inscription-based fungible tokens',
    fungible: true,
    // BRC-20 uses inscription with JSON: {"p":"brc-20","op":"transfer","tick":"ordi","amt":"100"}
    transferMethod: 'brc20_inscription',
    examples: ['ordi', 'sats', 'rats'],
    minTransferAmount: 1,
    // BRC-20 transfers need 2 txs: inscribe transfer + send inscription
    estimatedTxSize: 350,
  },
};

/**
 * Asset Registry — tracks supported assets and their on-chain details
 */
class AssetRegistry {
  constructor() {
    // Map of assetId → asset details
    this.assets = new Map();
    
    // Register known assets
    this.registerDefaults();
  }

  registerDefaults() {
    // $DOG — the flagship Rune
    this.register({
      id: 'DOG',
      type: ASSET_TYPES.RUNE,
      name: '$DOG (DOG•GO•TO•THE•MOON)',
      runeId: '3', // Rune #3 on mainnet
      ticker: 'DOG',
      decimals: 5,
      totalSupply: 100_000_000_000, // 100B
    });

    // Bitmap blocks (registered dynamically as they're traded)
    // Template for bitmap assets
    this.register({
      id: 'BITMAP',
      type: ASSET_TYPES.BITMAP,
      name: 'Bitmap Block',
      ticker: 'BITMAP',
      decimals: 0,
      // Individual blocks registered as BITMAP:720143, etc.
    });
  }

  register(asset) {
    if (!asset.id || !asset.type) {
      throw new Error('Asset must have id and type');
    }
    if (!ASSET_CONFIGS[asset.type]) {
      throw new Error(`Unknown asset type: ${asset.type}`);
    }
    this.assets.set(asset.id, {
      ...asset,
      config: ASSET_CONFIGS[asset.type],
      registeredAt: new Date().toISOString(),
    });
    return asset;
  }

  get(assetId) {
    return this.assets.get(assetId);
  }

  list(type = null) {
    const all = Array.from(this.assets.values());
    if (type) return all.filter(a => a.type === type);
    return all;
  }

  /**
   * Calculate relay fee for a transfer
   * Fee = coordination fee (Lightning) + estimated on-chain fee (sats)
   */
  calculateFee(assetId, amount, feeRate, satPerVbyte = 2) {
    const asset = this.get(assetId);
    if (!asset) throw new Error(`Unknown asset: ${assetId}`);

    const config = asset.config;
    
    // Coordination fee (percentage of transfer value, paid via Lightning)
    // For non-fungible (Bitmap), flat fee instead of percentage
    let coordinationFee;
    if (config.fungible) {
      coordinationFee = Math.max(1, Math.ceil(amount * feeRate));
    } else {
      coordinationFee = 500; // Flat 500 sats for NFT transfers
    }

    // Estimated on-chain fee (for the Rune/inscription transfer tx)
    const onChainFee = config.estimatedTxSize * satPerVbyte;

    return {
      coordinationFee, // paid via Lightning invoice
      onChainFee,      // covered by RuneBolt from treasury
      totalFee: coordinationFee + onChainFee,
      breakdown: {
        type: config.fungible ? 'percentage' : 'flat',
        rate: config.fungible ? feeRate : null,
        txSize: config.estimatedTxSize,
        satPerVbyte,
      },
    };
  }

  /**
   * Validate a transfer request
   */
  validateTransfer(assetId, amount) {
    const asset = this.get(assetId);
    if (!asset) return { valid: false, error: `Unknown asset: ${assetId}` };

    const config = asset.config;

    if (amount < config.minTransferAmount) {
      return { valid: false, error: `Minimum transfer: ${config.minTransferAmount}` };
    }

    if (!config.fungible && amount !== 1) {
      return { valid: false, error: 'Non-fungible assets can only be transferred one at a time' };
    }

    return { valid: true };
  }
}

module.exports = { AssetRegistry, ASSET_TYPES, ASSET_CONFIGS };

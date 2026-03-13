"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ArrowRight,
  Copy,
  Check,
  Send,
  Download,
  Zap,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn, formatSats, truncateAddress } from "@/lib/utils";
import { getAssetBalances, clearAddressCache } from "@/lib/api";

export type AssetType = "rune" | "ordinal" | "bitmap" | "brc20";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  symbol?: string;
  amount: number;
  image?: string;
  inscriptionId?: string;
  blockNumber?: number;
  decimals?: number;
}

const ASSET_EMOJIS: Record<string, string> = {
  DOG: "🐕", "DOG•GO•TO•THE•MOON": "🐕",
  UNCOMMON: "💎", "UNCOMMON•GOODS": "💎",
  PIZZA: "🍕", MEME: "🐸", BITCOIN: "₿", BTC: "₿",
};

function getAssetEmoji(name: string, symbol?: string): string {
  if (symbol && ASSET_EMOJIS[symbol]) return ASSET_EMOJIS[symbol];
  if (ASSET_EMOJIS[name]) return ASSET_EMOJIS[name];
  return "💰";
}

export function AssetCard({ asset, onSelect, selected }: { 
  asset: Asset; onSelect: () => void; selected: boolean;
}) {
  const typeColors = {
    rune: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    ordinal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    bitmap: "bg-green-500/20 text-green-400 border-green-500/30",
    brc20: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  const image = asset.image || getAssetEmoji(asset.name, asset.symbol);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-300",
        "bg-gradient-to-br from-white/5 to-transparent",
        selected ? "border-[#F7931A] shadow-[0_0_30px_rgba(247,147,26,0.3)]" : "border-white/10 hover:border-white/20"
      )}
    >
      {selected && (
        <motion.div layoutId="selectedIndicator" className="absolute -top-2 -right-2 w-6 h-6 bg-[#F7931A] rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-black" />
        </motion.div>
      )}
      <div className="flex items-start gap-4">
        <div className="text-4xl">{image}</div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", typeColors[asset.type])}>
            {asset.type}
          </span>
          <h4 className="font-semibold truncate mt-2">{asset.name}</h4>
          {asset.symbol && <p className="text-sm text-gray-500">{asset.symbol}</p>}
          <p className="text-xl font-bold mt-2 bitcoin-gradient">
            {asset.type === "bitmap" || asset.type === "ordinal"
              ? `${asset.amount} item${asset.amount > 1 ? 's' : ''}`
              : asset.decimals ? `${asset.amount.toFixed(asset.decimals)}` : formatSats(Math.floor(asset.amount * 100000000))}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

function LoadingState() {
  return (
    <div className="card text-center py-16">
      <Loader2 className="w-10 h-10 text-[#F7931A] mx-auto mb-4 animate-spin" />
      <p className="text-gray-400">Loading your assets...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card text-center py-12">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
      <p className="text-red-400 mb-2">Failed to load assets</p>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      <button onClick={onRetry} className="btn-secondary flex items-center gap-2 mx-auto">
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-12">
      <div className="text-4xl mb-4">💼</div>
      <p className="text-gray-400">No assets found in this wallet</p>
      <p className="text-gray-600 text-sm mt-2">Assets you own (Runes, Ordinals, Bitmap) will appear here</p>
    </div>
  );
}

export function AssetDashboard({ 
  connected, address, onConnect, network = 'testnet',
}: { 
  connected: boolean; address: string; onConnect: () => void; network?: 'mainnet' | 'testnet';
}) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<"assets" | "history">("assets");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!connected || !address) return;
    setLoading(true);
    setError(null);
    try {
      const balance = await getAssetBalances(address, network);
      const convertedAssets: Asset[] = [
        ...balance.runes.map((rune) => ({
          id: rune.id, type: "rune" as AssetType, name: rune.name, symbol: rune.symbol,
          amount: rune.amount, image: getAssetEmoji(rune.name, rune.symbol), decimals: rune.decimals,
        })),
        ...balance.ordinals.map((ord) => ({
          id: ord.id, type: "ordinal" as AssetType, name: `Inscription #${ord.inscriptionNumber}`,
          inscriptionId: ord.id, amount: 1, image: "🎨",
        })),
        ...balance.bitmaps.map((bmp) => ({
          id: bmp.inscriptionId, type: "bitmap" as AssetType, name: `Bitmap #${bmp.blockNumber}`,
          blockNumber: bmp.blockNumber, amount: 1, image: "🏙️",
        })),
      ];
      setAssets(convertedAssets);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [connected, address, network]);

  useEffect(() => { if (connected && address) fetchBalances(); }, [connected, address, fetchBalances]);
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(fetchBalances, 60000);
    return () => clearInterval(interval);
  }, [connected, fetchBalances]);

  const handleRefresh = async () => {
    if (address) await clearAddressCache(address);
    await fetchBalances();
  };

  if (!connected) {
    return (
      <div className="card text-center py-16">
        <div className="w-20 h-20 rounded-full bg-[#F7931A]/10 flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-[#F7931A]" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">Connect your Bitcoin wallet to view your Runes, Ordinals, and Bitmap assets</p>
        <button onClick={onConnect} className="btn-primary">Connect Wallet</button>
      </div>
    );
  }

  if (loading && assets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#F7931A]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Connected Wallet</p>
              <p className="font-mono text-lg">{truncateAddress(address)}</p>
            </div>
          </div>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (error && assets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#F7931A]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Connected Wallet</p>
              <p className="font-mono text-lg">{truncateAddress(address)}</p>
            </div>
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchBalances} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[#F7931A]" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Connected Wallet</p>
            <p className="font-mono text-lg">{truncateAddress(address)}</p>
            {network === 'testnet' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Testnet</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(address)} className="btn-secondary" title="Copy address">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={handleRefresh} disabled={loading} className="btn-secondary" title="Refresh balances">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {lastUpdated && <p className="text-xs text-gray-500 text-right">Last updated: {lastUpdated.toLocaleTimeString()}</p>}

      <div className="flex gap-2 p-1 rounded-xl bg-white/5">
        <button onClick={() => setActiveTab("assets")} className={cn("flex-1 py-2 px-4 rounded-lg font-medium transition-all", activeTab === "assets" ? "bg-[#F7931A] text-black" : "text-gray-400 hover:text-white")}>
          My Assets ({assets.length})
        </button>
        <button onClick={() => setActiveTab("history")} className={cn("flex-1 py-2 px-4 rounded-lg font-medium transition-all", activeTab === "history" ? "bg-[#F7931A] text-black" : "text-gray-400 hover:text-white")}>
          History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "assets" ? (
          <motion.div key="assets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assets.length === 0 ? <EmptyState /> : assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} selected={selectedAsset?.id === asset.id} onSelect={() => setSelectedAsset(asset)} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="card text-center py-12">
              <p className="text-gray-400">Transaction history coming soon</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedAsset && activeTab === "assets" && (
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2">
          <Zap className="w-5 h-5" />
          Transfer {selectedAsset.name}
        </motion.button>
      )}
    </div>
  );
}

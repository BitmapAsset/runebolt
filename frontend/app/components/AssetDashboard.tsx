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
              : asset.decimals ? `${Number(asset.amount.toFixed(asset.decimals))}` : asset.amount.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

const LOADING_MESSAGES = [
  "Scanning the mempool...",
  "Tracing your UTXOs...",
  "Interrogating the blockchain...",
  "Herding your digital cats...",
  "Counting sats with extreme prejudice...",
  "Decoding ancient Bitcoin runes...",
  "Consulting the oracle (Unisat)...",
  "Your assets are playing hide and seek...",
];

function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* Skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="relative w-full p-4 rounded-2xl border-2 border-white/5 bg-gradient-to-br from-white/5 to-transparent overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 shimmer" />
              <div className="flex-1 space-y-3">
                <div className="w-16 h-4 rounded bg-white/5 shimmer" />
                <div className="w-32 h-5 rounded bg-white/5 shimmer" />
                <div className="w-24 h-7 rounded bg-white/5 shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Fun loading message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-center text-sm text-gray-500 italic"
        >
          {LOADING_MESSAGES[msgIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center py-12"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
      </motion.div>
      <p className="text-red-400 mb-2">The blockchain gremlins struck again</p>
      <p className="text-gray-500 text-sm mb-4">{message}</p>
      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="btn-secondary flex items-center gap-2 mx-auto"
      >
        <RefreshCw className="w-4 h-4" />
        Zap &apos;em Again
      </motion.button>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card text-center py-12 col-span-full"
    >
      <motion.div
        className="text-6xl mb-4 inline-block"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        🏜️
      </motion.div>
      <p className="text-gray-400 text-lg">This wallet is emptier than Satoshi&apos;s inbox</p>
      <p className="text-gray-600 text-sm mt-2">Get some Runes, Ordinals, or Bitmaps and come back ready to bolt</p>
    </motion.div>
  );
}

function CopyAndRefreshButtons({ address, loading, onRefresh }: { address: string; loading: boolean; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        className={cn("btn-secondary relative", copied && "!border-green-500/50 !bg-green-500/10")}
        title="Copy address"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span key="check" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <Check className="w-4 h-4 text-green-400" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Copy className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <motion.button
        onClick={onRefresh}
        disabled={loading}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85, rotate: -180 }}
        className="btn-secondary"
        title="Refresh balances"
      >
        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
      </motion.button>
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
        <CopyAndRefreshButtons address={address} loading={loading} onRefresh={handleRefresh} />
      </div>

      {lastUpdated && <p className="text-xs text-gray-500 text-right">Last updated: {lastUpdated.toLocaleTimeString()}</p>}

      <div className="flex gap-2 p-1 rounded-xl bg-white/5 relative">
        {/* Sliding active indicator */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-[#F7931A] z-0"
          layout
          layoutId="tabIndicator"
          style={{ width: "calc(50% - 4px)", left: activeTab === "assets" ? 4 : "calc(50% + 0px)" }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
        <button onClick={() => setActiveTab("assets")} className={cn("flex-1 py-2 px-4 rounded-lg font-medium transition-colors relative z-10", activeTab === "assets" ? "text-black" : "text-gray-400 hover:text-white")}>
          My Assets ({assets.length})
        </button>
        <button onClick={() => setActiveTab("history")} className={cn("flex-1 py-2 px-4 rounded-lg font-medium transition-colors relative z-10", activeTab === "history" ? "text-black" : "text-gray-400 hover:text-white")}>
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
              <motion.div
                className="text-5xl mb-4 inline-block"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                🔮
              </motion.div>
              <p className="text-gray-400 text-lg">History is being written...</p>
              <p className="text-gray-600 text-sm mt-2">Your transfer history will appear here once you start bolting assets around</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAsset && activeTab === "assets" && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(247, 147, 26, 0.5)" }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <Zap className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Transfer {selectedAsset.name}</span>
            <motion.span
              className="relative z-10"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

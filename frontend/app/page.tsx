"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Wallet,
  ArrowRightLeft,
  History,
  Shield,
  Clock,
  Bitcoin,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { AssetDashboard } from "./components/AssetDashboard";
import { connectWallet, disconnectWallet, getWallets, type WalletConnection, type WalletInfo } from "@/lib/wallets";
import { getNodeInfo } from "@/lib/api";

// Import new visual effect components
import { LightningEffects, ConnectLightning, TransferLightning, SuccessLightning, SoundWaveVisualizer } from "./components/LightningEffects";
import { ParticleSystem, ConfettiExplosion, SparkBurst, FloatingRunes } from "./components/ParticleSystem";
import { GlitchText, BillyText, DogText, BitmapText, PepeText, GlitchCounter, SuccessText, ConnectedText } from "./components/GlitchText";
import { AssetCard3D, StatCard3D } from "./components/AssetCard3D";
import { EnergyBackground, HeroBackground, AssetSectionBackground } from "./components/EnergyBackground";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// Asset sections data
const ASSETS = [
  {
    id: "billy",
    name: "BILLY",
    fullName: "Billion Dollar Cat",
    description: "The purple lightning of feline finance. Every transaction leaves paw prints.",
    color: "#8B5CF6",
    emoji: "🐱",
    stats: { holders: "12.5K", volume: "$2.4M", price: "$0.0042" },
  },
  {
    id: "dog",
    name: "DOG",
    fullName: "Doggotothemoon",
    description: "Much wow. Very red. Such lightning. The original meme on Bitcoin.",
    color: "#DC2626",
    emoji: "🐕",
    stats: { holders: "45.2K", volume: "$8.1M", price: "$0.0088" },
  },
  {
    id: "bitmap",
    name: "BITMAP",
    fullName: "Bitmap Protocol",
    description: "Own your piece of Bitcoin history. Block by block, the metaverse unfolds.",
    color: "#F7931A",
    emoji: "🏙️",
    stats: { holders: "28.9K", volume: "$5.6M", price: "$0.015" },
  },
  {
    id: "pepe",
    name: "PEPE",
    fullName: "Rare Pepe",
    description: "Feels good man. The green lightning of meme magic on Bitcoin.",
    color: "#10B981",
    emoji: "🐸",
    stats: { holders: "33.7K", volume: "$6.9M", price: "$0.0012" },
  },
];

function Navbar({ connected, address, onConnect, network }: { 
  connected: boolean; address?: string; onConnect: () => void; network?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass border-b border-white/5" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div 
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  "0 0 10px rgba(247, 147, 26, 0.5)",
                  "0 0 30px rgba(247, 147, 26, 0.8)",
                  "0 0 10px rgba(247, 147, 26, 0.5)",
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-5 h-5 text-black" />
            </motion.div>
            <GlitchText text="RuneBolt" className="text-xl font-bold bitcoin-gradient" variant="electric" size="lg" />
          </motion.div>
          
          <div className="hidden md:flex items-center gap-6">
            {["Features", "How it Works", "Assets", "Transfer"].map((item, i) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm text-gray-400 hover:text-white transition-colors relative"
                whileHover={{ y: -2 }}
              >
                {item}
                <motion.span
                  className="absolute -bottom-1 left-0 h-px bg-[#F7931A]"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.2 }}
                />
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence>
              {connected && <ConnectedText active={connected} />}
            </AnimatePresence>
            
            {network === 'testnet' && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
              >
                Testnet
              </motion.span>
            )}
            <motion.button 
              onClick={onConnect} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
                connected ? "bg-green-500/20 text-green-400 border border-green-500/30" : "btn-primary"
              )}
            >
              <Wallet className="w-4 h-4" />
              {connected ? truncateAddress(address || "") : "Connect Wallet"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

function Hero({ onConnect }: { onConnect: () => void }) {
  const [showConnectedText, setShowConnectedText] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <HeroBackground />
      <FloatingRunes asset="bitmap" />
      
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div 
          variants={fadeIn} 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/20 mb-8"
          whileHover={{ scale: 1.05, borderColor: "rgba(247, 147, 26, 0.5)" }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-4 h-4 text-[#F7931A]" />
          </motion.div>
          <GlitchText text="Lightning Deed Protocol v0.1" variant="electric" size="sm" />
        </motion.div>

        <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <GlitchText text="Instant" variant="electric" size="2xl" className="bitcoin-gradient" />
          <span className="block mt-2">Bitcoin</span>
          <span className="block mt-2">Asset Transfers</span>
        </motion.h1>

        <motion.p variants={fadeIn} className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Transfer Runes, Ordinals, and Bitmap instantly over Lightning Network.
          No custodial risk. Pure Bitcoin script magic.
        </motion.p>

        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <motion.button 
            onClick={onConnect} 
            className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(247, 147, 26, 0.6)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <motion.a 
            href="https://docs.runebolt.io" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ExternalLink className="w-5 h-5" />
            Read Docs
          </motion.a>
        </motion.div>

        <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: Clock, label: "Transfer Time", value: "< 1 second" },
            { icon: Shield, label: "Security", value: "Non-custodial" },
            { icon: Bitcoin, label: "Assets", value: "Runes, Ordinals, Bitmap" },
          ].map((stat, i) => (
            <StatCard3D
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              delay={i * 0.1}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Zap, title: "Lightning Fast", description: "Transfer any Bitcoin asset in milliseconds. The deed travels at Lightning speed." },
    { icon: Shield, title: "Non-Custodial", description: "Your assets, your keys. RuneBolt never holds your Bitcoin. Smart contracts enforce everything." },
    { icon: ArrowRightLeft, title: "Universal Assets", description: "Runes, Ordinals, Bitmap, BRC-20 — if it's on Bitcoin, you can transfer it instantly." },
  ];

  return (
    <section id="features" className="py-24 relative">
      <EnergyBackground variant="bitmap" intensity="low" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-16">
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
            Why <GlitchText text="RuneBolt" variant="electric" size="xl" className="bitcoin-gradient" />?
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
            The first protocol to enable instant, non-custodial transfers of any Bitcoin asset.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              key={feature.title} 
              variants={fadeIn} 
              className="card group relative overflow-hidden"
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
            >
              <motion.div 
                className="w-12 h-12 rounded-xl bg-[#F7931A]/10 flex items-center justify-center mb-4"
                whileHover={{ 
                  scale: 1.1, 
                  rotate: 5,
                  backgroundColor: "rgba(247, 147, 26, 0.2)",
                }}
              >
                <feature.icon className="w-6 h-6 text-[#F7931A]" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
              
              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                style={{
                  boxShadow: "inset 0 0 30px rgba(247, 147, 26, 0.1)",
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { number: "01", title: "Deed Lock", description: "Lock your asset with a Tapscript hash-lock. Only the recipient with the preimage can claim it." },
    { number: "02", title: "Lightning Transfer", description: "Send a Lightning payment carrying the deed key. The preimage unlocks both the payment and the asset." },
    { number: "03", title: "Instant Claim", description: "Recipient reveals the preimage to claim the asset on Bitcoin. Settlement in milliseconds." },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-black/50 relative">
      <EnergyBackground variant="bitmap" intensity="low" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-16">
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
            How <GlitchText text="LDP" variant="neon" size="xl" className="bitcoin-gradient" /> Works
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
            The Lightning Deed Protocol uses Bitcoin Script and Lightning HTLCs for atomic transfers.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div key={step.number} variants={fadeIn} className="relative">
              <motion.div 
                className="card h-full group"
                whileHover={{ 
                  y: -5,
                  boxShadow: "0 20px 40px rgba(247, 147, 26, 0.2)",
                }}
              >
                <motion.div 
                  className="text-5xl font-bold mb-4"
                  style={{ 
                    background: "linear-gradient(135deg, #F7931A, #FFD700)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  {step.number}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
              {index < steps.length - 1 && (
                <motion.div 
                  className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronRight className="w-8 h-8 text-[#F7931A]" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AssetShowcase() {
  return (
    <section id="assets" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          variants={staggerContainer} 
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
            Supported <GlitchText text="Assets" variant="electric" size="xl" className="bitcoin-gradient" />
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
            Transfer any of these assets instantly via the Lightning Deed Protocol
          </motion.p>
        </motion.div>

        <div className="space-y-24">
          {ASSETS.map((asset, index) => (
            <AssetSection key={asset.id} asset={asset} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AssetSection({ asset, index }: { asset: typeof ASSETS[0]; index: number }) {
  const isEven = index % 2 === 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -50 : 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative py-12"
    >
      <AssetSectionBackground asset={asset.id as any} />
      
      <div className={`relative z-10 flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12`}>
        {/* Visual Side */}
        <motion.div 
          className="flex-1 relative"
          whileHover={{ scale: 1.02 }}
        >
          <motion.div
            className="w-64 h-64 mx-auto rounded-3xl flex items-center justify-center text-9xl relative"
            style={{
              background: `linear-gradient(135deg, ${asset.color}20, ${asset.color}10)`,
              border: `2px solid ${asset.color}40`,
              boxShadow: `0 0 60px ${asset.color}30, inset 0 0 60px ${asset.color}10`,
            }}
            animate={{
              y: [0, -10, 0],
              rotate: [0, 2, -2, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {asset.emoji}
            
            {/* Orbiting particles */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: asset.color,
                  boxShadow: `0 0 10px ${asset.color}`,
                }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <motion.div
                  style={{
                    position: "absolute",
                    left: 140 + i * 20,
                    top: 0,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        
        {/* Info Side */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 
              className="text-4xl font-bold mb-2"
              style={{ color: asset.color }}
            >
              {asset.name}
            </h3>
            <p className="text-gray-400 mb-4">{asset.fullName}</p>
            <p className="text-gray-300 mb-8 text-lg">{asset.description}</p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(asset.stats).map(([key, value]) => (
                <motion.div
                  key={key}
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: `${asset.color}10`,
                    border: `1px solid ${asset.color}20`,
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: `0 0 20px ${asset.color}30`,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: asset.color }}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{key}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function WalletModal({ isOpen, onClose, onConnect }: { 
  isOpen: boolean; onClose: () => void; onConnect: (wallet: string) => void;
}) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWallets(getWallets());
      setError(null);
    }
  }, [isOpen]);

  const handleConnect = async (walletId: string) => {
    setConnecting(walletId);
    setError(null);
    try {
      await onConnect(walletId);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to connect to ${walletId}`);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="card w-full max-w-md relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Electric border effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  "inset 0 0 20px rgba(247, 147, 26, 0.2)",
                  "inset 0 0 40px rgba(247, 147, 26, 0.4)",
                  "inset 0 0 20px rgba(247, 147, 26, 0.2)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-bold">
                <GlitchText text="Connect Wallet" variant="electric" />
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div className="space-y-3 relative z-10">
              {wallets.map((wallet, i) => (
                <motion.button
                  key={wallet.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={connecting === wallet.id || !wallet.installed}
                  whileHover={wallet.installed ? { 
                    scale: 1.02, 
                    x: 5,
                    boxShadow: "0 0 30px rgba(247, 147, 26, 0.3)",
                  } : {}}
                  whileTap={wallet.installed ? { scale: 0.98 } : {}}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                    wallet.installed 
                      ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#F7931A]/50" 
                      : "bg-white/5 opacity-50 cursor-not-allowed border-white/5"
                  )}
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-gray-500">{wallet.description}</div>
                  </div>
                  {connecting === wallet.id ? (
                    <motion.span 
                      className="text-xs px-2 py-1 rounded-full bg-[#F7931A]/20 text-[#F7931A]"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Connecting...
                    </motion.span>
                  ) : wallet.installed ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Installed</span>
                  ) : (
                    <a 
                      href={wallet.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
                    >
                      Install
                    </a>
                  )}
                </motion.button>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center relative z-10">
              New to Bitcoin? <a href="https://unisat.io" target="_blank" rel="noopener noreferrer" className="text-[#F7931A] hover:underline">Get UniSat Wallet</a>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet');
  const [nodeStatus, setNodeStatus] = useState<any>(null);
  
  // Visual effect triggers
  const [connectLightning, setConnectLightning] = useState(false);
  const [transferLightning, setTransferLightning] = useState(false);
  const [successLightning, setSuccessLightning] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState<string | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [connectedTextActive, setConnectedTextActive] = useState(false);

  // Check for existing connection on mount
  useEffect(() => {
    const saved = localStorage.getItem('runebolt-connection');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConnection(parsed);
        setConnected(true);
        setNetwork(parsed.network === 'mainnet' ? 'mainnet' : 'testnet');
      } catch (e) {
        localStorage.removeItem('runebolt-connection');
      }
    }

    // Load node status
    getNodeInfo().then(setNodeStatus).catch(console.error);
  }, []);

  const handleConnect = useCallback(async () => {
    setWalletModalOpen(true);
  }, []);

  const handleWalletSelect = useCallback(async (walletType: string) => {
    // Trigger connect effects
    setConnectLightning(true);
    setTimeout(() => setConnectLightning(false), 800);
    
    const conn = await connectWallet(walletType as any);
    setConnection(conn);
    setConnected(true);
    setNetwork(conn.network === 'mainnet' ? 'mainnet' : 'testnet');
    localStorage.setItem('runebolt-connection', JSON.stringify(conn));
    
    // Trigger success effects
    setTimeout(() => {
      setConnectedTextActive(true);
      setParticleTrigger("bitmap");
      setConfettiActive(true);
      setTimeout(() => {
        setConfettiActive(false);
        setParticleTrigger(null);
      }, 2000);
    }, 800);
  }, []);

  const handleDisconnect = useCallback(() => {
    if (connection) {
      disconnectWallet(connection.wallet);
    }
    setConnected(false);
    setConnection(null);
    setConnectedTextActive(false);
    localStorage.removeItem('runebolt-connection');
  }, [connection]);

  return (
    <main className="min-h-screen bg-black relative">
      {/* Global Background Effects */}
      <EnergyBackground variant="bitmap" intensity="low" />
      
      {/* Visual Effect Overlays */}
      <LightningEffects autoTrigger intensity="low" />
      <ConnectLightning active={connectLightning} />
      <TransferLightning active={transferLightning} asset="bitmap" />
      <SuccessLightning active={successLightning} asset="bitmap" />
      <ParticleSystem trigger={particleTrigger} asset="bitmap" intensity="high" />
      <ConfettiExplosion active={confettiActive} asset="bitmap" />
      
      <Navbar 
        connected={connected} 
        address={connection?.account.address} 
        onConnect={handleConnect}
        network={network}
      />
      <Hero onConnect={handleConnect} />
      <Features />
      <HowItWorks />
      <AssetShowcase />
      
      <section id="transfer" className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
              Your <GlitchText text="Assets" variant="electric" size="xl" className="bitcoin-gradient" />
            </motion.h2>
            <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
              Manage and transfer your Bitcoin assets instantly via Lightning
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
          >
            <AssetDashboard 
              connected={connected}
              address={connection?.account.address || ""}
              onConnect={handleConnect}
              network={network}
            />
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <GlitchText text="RuneBolt" variant="electric" size="lg" className="text-xl font-bold bitcoin-gradient" />
              </div>
              <p className="text-sm text-gray-500">
                The first non-custodial, instant transfer protocol for all Bitcoin assets.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <h4 className="font-semibold mb-4">Protocol</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Lightning Network</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bitcoin Runes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bitmap</a></li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <h4 className="font-semibold mb-4">Status</h4>
              {nodeStatus ? (
                <div className="text-sm text-gray-500 space-y-1">
                  <p className="flex items-center gap-2">
                    <motion.span 
                      className="w-2 h-2 rounded-full bg-green-500"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    Node: {nodeStatus.alias}
                  </p>
                  <p>Channels: {nodeStatus.channels}</p>
                  <p>Block: {nodeStatus.blockHeight}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Loading node status...</p>
              )}
            </motion.div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© 2026 RuneBolt. Built on Bitcoin.</p>
            <p>Non-custodial. Open source. MIT License.</p>
          </div>
        </div>
      </footer>

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onConnect={handleWalletSelect}
      />
    </main>
  );
}

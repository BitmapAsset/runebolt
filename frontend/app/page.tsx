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

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

function LightningBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F7931A]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-[120px]" />
    </div>
  );
}

function Navbar({ connected, address, onConnect, network }: { 
  connected: boolean; address?: string; onConnect: () => void; network?: string;
}) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold bitcoin-gradient">RuneBolt</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="#transfer" className="text-sm text-gray-400 hover:text-white transition-colors">Transfer</a>
          </div>

          <div className="flex items-center gap-2">
            {network === 'testnet' && (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Testnet
              </span>
            )}
            <button onClick={onConnect} className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all",
              connected ? "bg-green-500/20 text-green-400 border border-green-500/30" : "btn-primary"
            )}>
              <Wallet className="w-4 h-4" />
              {connected ? truncateAddress(address || "") : "Connect Wallet"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onConnect }: { onConnect: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16">
      <LightningBackground />
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/20 mb-8">
          <Zap className="w-4 h-4 text-[#F7931A]" />
          <span className="text-sm text-[#F7931A] font-medium">Lightning Deed Protocol v0.1</span>
        </motion.div>

        <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span className="bitcoin-gradient">Instant</span> Bitcoin
          <br />
          Asset Transfers
        </motion.h1>

        <motion.p variants={fadeIn} className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Transfer Runes, Ordinals, and Bitmap instantly over Lightning Network.
          No custodial risk. Pure Bitcoin script magic.
        </motion.p>

        <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button onClick={onConnect} className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4">
            <Wallet className="w-5 h-5" />
            Connect Wallet
            <ChevronRight className="w-5 h-5" />
          </button>
          <a href="https://docs.runebolt.io" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4">
            <ExternalLink className="w-5 h-5" />
            Read Docs
          </a>
        </motion.div>

        <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: Clock, label: "Transfer Time", value: "< 1 second" },
            { icon: Shield, label: "Security", value: "Non-custodial" },
            { icon: Bitcoin, label: "Assets", value: "Runes, Ordinals, Bitmap" },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <stat.icon className="w-6 h-6 text-[#F7931A] mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-16">
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
            Why <span className="bitcoin-gradient">RuneBolt</span>?
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
            The first protocol to enable instant, non-custodial transfers of any Bitcoin asset.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <motion.div key={feature.title} variants={fadeIn} className="card group">
              <div className="w-12 h-12 rounded-xl bg-[#F7931A]/10 flex items-center justify-center mb-4 group-hover:bg-[#F7931A]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#F7931A]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
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
    <section id="how-it-works" className="py-24 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="text-center mb-16">
          <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
            How <span className="bitcoin-gradient">LDP</span> Works
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-400 max-w-2xl mx-auto">
            The Lightning Deed Protocol uses Bitcoin Script and Lightning HTLCs for atomic transfers.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div key={step.number} variants={fadeIn} className="relative">
              <div className="card h-full">
                <div className="text-5xl font-bold text-[#F7931A]/20 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ChevronRight className="w-8 h-8 text-[#F7931A]" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
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
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Connect Wallet</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnect(wallet.id)}
                  disabled={connecting === wallet.id || !wallet.installed}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                    wallet.installed 
                      ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#F7931A]/30" 
                      : "bg-white/5 opacity-50 cursor-not-allowed border-white/5"
                  )}
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-sm text-gray-500">{wallet.description}</div>
                  </div>
                  {connecting === wallet.id ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#F7931A]/20 text-[#F7931A]">Connecting...</span>
                  ) : wallet.installed ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Installed</span>
                  ) : (
                    <a href={wallet.website} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">
                      Install
                    </a>
                  )}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
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
    const conn = await connectWallet(walletType as any);
    setConnection(conn);
    setConnected(true);
    setNetwork(conn.network === 'mainnet' ? 'mainnet' : 'testnet');
    localStorage.setItem('runebolt-connection', JSON.stringify(conn));
  }, []);

  const handleDisconnect = useCallback(() => {
    if (connection) {
      disconnectWallet(connection.wallet);
    }
    setConnected(false);
    setConnection(null);
    localStorage.removeItem('runebolt-connection');
  }, [connection]);

  return (
    <main className="min-h-screen bg-black">
      <Navbar 
        connected={connected} 
        address={connection?.account.address} 
        onConnect={handleConnect}
        network={network}
      />
      <Hero onConnect={handleConnect} />
      <Features />
      <HowItWorks />
      
      <section id="transfer" className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-bold mb-4">
              Your <span className="bitcoin-gradient">Assets</span>
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

      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#FFD700] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-bold bitcoin-gradient">RuneBolt</span>
              </div>
              <p className="text-sm text-gray-500">
                The first non-custodial, instant transfer protocol for all Bitcoin assets.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Protocol</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-white transition-colors">Lightning Network</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bitcoin Runes</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bitmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Status</h4>
              {nodeStatus ? (
                <div className="text-sm text-gray-500 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Node: {nodeStatus.alias}
                  </p>
                  <p>Channels: {nodeStatus.channels}</p>
                  <p>Block: {nodeStatus.blockHeight}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Loading node status...</p>
              )}
            </div>
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

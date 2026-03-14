"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Sparkles } from "lucide-react";
import { EmberTrail } from "./ParticleSystem";

interface AssetCard3DProps {
  asset: {
    id: string;
    name: string;
    symbol?: string;
    amount: number;
    type: "rune" | "ordinal" | "bitmap" | "brc20";
    image?: string;
    blockNumber?: number;
  };
  selected?: boolean;
  onClick?: () => void;
  address?: string;
}

const ASSET_CONFIGS = {
  billy: {
    colors: { primary: "#8B5CF6", secondary: "#06B6D4", accent: "#A855F7" },
    gradient: "from-purple-500/20 via-cyan-500/10 to-purple-500/20",
    border: "border-purple-500/30",
    glow: "shadow-purple-500/30",
    emoji: "🐱",
    particle: "paw",
  },
  dog: {
    colors: { primary: "#DC2626", secondary: "#F9FAFB", accent: "#EF4444" },
    gradient: "from-red-500/20 via-white/5 to-red-500/20",
    border: "border-red-500/30",
    glow: "shadow-red-500/30",
    emoji: "🐕",
    particle: "moon",
  },
  bitmap: {
    colors: { primary: "#F7931A", secondary: "#FFD700", accent: "#F59E0B" },
    gradient: "from-orange-500/20 via-yellow-500/10 to-orange-500/20",
    border: "border-orange-500/30",
    glow: "shadow-orange-500/30",
    emoji: "🏙️",
    particle: "block",
  },
  pepe: {
    colors: { primary: "#10B981", secondary: "#EC4899", accent: "#34D399" },
    gradient: "from-green-500/20 via-pink-500/10 to-green-500/20",
    border: "border-green-500/30",
    glow: "shadow-green-500/30",
    emoji: "🐸",
    particle: "frog",
  },
};

function detectAssetType(name: string): keyof typeof ASSET_CONFIGS {
  const lower = name.toLowerCase();
  if (lower.includes("billy") || lower.includes("cat")) return "billy";
  if (lower.includes("dog") || lower.includes("doge")) return "dog";
  if (lower.includes("pepe") || lower.includes("frog")) return "pepe";
  if (lower.includes("bitmap")) return "bitmap";
  return "bitmap";
}

export function AssetCard3D({ asset, selected, onClick, address }: AssetCard3DProps) {
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const assetKey = detectAssetType(asset.name);
  const config = ASSET_CONFIGS[assetKey];
  const displayImage = asset.image || config.emoji;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -20, y: x * 20 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  };

  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(!flipped);
  };

  const copyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative" style={{ perspective: "1000px" }}>
      {/* Ember trail effect */}
      <EmberTrail active={hovered} color={config.colors.primary} />
      
      <motion.div
        ref={cardRef}
        className={`relative cursor-pointer ${selected ? "z-10" : "z-0"}`}
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
        animate={{
          y: hovered ? -8 : 0,
          scale: selected ? 1.02 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
      >
        {/* Card Front */}
        <motion.div
          className={`relative rounded-2xl border-2 p-6 overflow-hidden backdrop-blur-sm
            ${flipped ? "opacity-0" : "opacity-100"}
            ${selected ? config.border : "border-white/10"}
            ${selected ? `shadow-[0_0_40px_rgba(0,0,0,0.3)]` : ""}
          `}
          style={{
            background: `linear-gradient(135deg, rgba(17,17,17,0.95), rgba(17,17,17,0.8))`,
            backfaceVisibility: "hidden",
            boxShadow: selected 
              ? `0 0 40px ${config.colors.primary}40, 0 0 80px ${config.colors.primary}20, inset 0 0 40px ${config.colors.primary}10`
              : hovered 
                ? `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${config.colors.primary}30`
                : "0 4px 20px rgba(0,0,0,0.2)",
          }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`} />
          
          {/* Animated border glow on selected */}
          {selected && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  `inset 0 0 20px ${config.colors.primary}20`,
                  `inset 0 0 40px ${config.colors.primary}40`,
                  `inset 0 0 20px ${config.colors.primary}20`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header with type badge */}
            <div className="flex items-start justify-between mb-4">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: `${config.colors.primary}20`,
                  borderColor: `${config.colors.primary}40`,
                  color: config.colors.primary,
                }}
              >
                {asset.type.toUpperCase()}
              </span>
              
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: config.colors.primary }}
                >
                  <Check className="w-4 h-4 text-black" />
                </motion.div>
              )}
            </div>
            
            {/* Asset image/icon */}
            <motion.div
              className="text-6xl mb-4"
              animate={hovered ? {
                y: [0, -5, 0],
                rotate: [0, -5, 5, 0],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              {displayImage}
            </motion.div>
            
            {/* Asset name */}
            <h3 className="text-xl font-bold mb-1 truncate" style={{ color: config.colors.primary }}>
              {asset.name}
            </h3>
            
            {asset.symbol && (
              <p className="text-sm text-gray-500 mb-3">{asset.symbol}</p>
            )}
            
            {/* Amount */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ 
                background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.secondary})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {asset.type === "bitmap" || asset.type === "ordinal"
                  ? asset.amount
                  : asset.amount.toLocaleString()}
              </span>
              <span className="text-gray-500 text-sm">
                {asset.type === "bitmap" || asset.type === "ordinal" 
                  ? asset.amount > 1 ? "items" : "item"
                  : ""
                }
              </span>
            </div>
            
            {/* Flip hint */}
            {address && (
              <button
                onClick={handleFlip}
                className="mt-4 text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Tap for QR
              </button>
            )}
          </div>
          
          {/* Reflection effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, transparent 40%, ${config.colors.primary}10 50%, transparent 60%)`,
              transform: "translateX(-100%)",
              animation: hovered ? "shimmer 1.5s ease-in-out" : "none",
            }}
          />
        </motion.div>

        {/* Card Back (QR Code) */}
        <motion.div
          className={`absolute inset-0 rounded-2xl border-2 p-6 backdrop-blur-sm
            ${config.border}
          `}
          style={{
            background: "linear-gradient(135deg, rgba(17,17,17,0.95), rgba(17,17,17,0.8))",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: `0 0 40px ${config.colors.primary}30`,
          }}
          animate={{ rotateY: flipped ? 0 : -180 }}
          transition={{ duration: 0.6 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-30 rounded-2xl`} />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center">
            <h4 className="text-sm font-semibold mb-4" style={{ color: config.colors.primary }}>
              Receive {asset.name}
            </h4>
            
            {address && (
              <div className="bg-white p-3 rounded-xl mb-4">
                <QRCodeSVG
                  value={`bitcoin:${address}`}
                  size={120}
                  level="M"
                  bgColor="transparent"
                  fgColor={config.colors.primary}
                />
              </div>
            )}
            
            <button
              onClick={copyAddress}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
              style={{
                borderColor: `${config.colors.primary}40`,
                backgroundColor: `${config.colors.primary}10`,
                color: config.colors.primary,
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Address"}
            </button>
            
            <button
              onClick={handleFlip}
              className="mt-4 text-xs text-gray-500 hover:text-white transition-colors"
            >
              Tap to flip back
            </button>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Floating particles around card */}
      {hovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: config.colors.primary,
                boxShadow: `0 0 10px ${config.colors.primary}`,
              }}
              initial={{ 
                x: "50%", 
                y: "50%", 
                scale: 0,
                opacity: 1,
              }}
              animate={{ 
                x: `${50 + (Math.random() - 0.5) * 150}%`,
                y: `${50 + (Math.random() - 0.5) * 150}%`,
                scale: [0, 1, 0],
                opacity: [1, 0.8, 0],
              }}
              transition={{ duration: 1 + Math.random(), delay: i * 0.1 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Simple 3D stat card
export function StatCard3D({
  label,
  value,
  icon: Icon,
  color = "#F7931A",
  delay = 0,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  delay?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -15, y: x * 15 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="relative cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setTilt({ x: 0, y: 0 });
      }}
    >
      <motion.div
        className="card text-center relative overflow-hidden"
        animate={{
          y: hovered ? -5 : 0,
          rotateX: tilt.x,
          rotateY: tilt.y,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          transformStyle: "preserve-3d",
          boxShadow: hovered 
            ? `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${color}30`
            : "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* Glow border */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: hovered
              ? `inset 0 0 30px ${color}20`
              : "inset 0 0 0px transparent",
          }}
        />
        
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: `${color}20` }}
          animate={hovered ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color }}>
            <Icon className="w-6 h-6" />
          </span>
        </motion.div>
        
        <div className="text-2xl font-bold mb-1" style={{ color }}>
          {value}
        </div>
        <div className="text-sm text-gray-500">{label}</div>
      </motion.div>
    </motion.div>
  );
}

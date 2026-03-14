"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LightningBolt {
  id: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  duration: number;
}

interface LightningEffectsProps {
  trigger?: string | null;
  color?: string;
  autoTrigger?: boolean;
  intensity?: "low" | "medium" | "high";
}

const LIGHTNING_COLORS = {
  billy: "#8B5CF6",     // Purple
  dog: "#DC2626",       // Red
  bitmap: "#F7931A",    // Orange
  pepe: "#10B981",      // Green
  default: "#F7931A",   // Bitcoin Orange
};

export function LightningEffects({ 
  trigger, 
  color = "#F7931A",
  autoTrigger = false,
  intensity = "medium"
}: LightningEffectsProps) {
  const [bolts, setBolts] = useState<LightningBolt[]>([]);
  const [flash, setFlash] = useState(false);

  const createLightning = useCallback((x?: number, y?: number, specificColor?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const bolt: LightningBolt = {
      id,
      x: x ?? Math.random() * 100,
      y: y ?? Math.random() * 50,
      color: specificColor ?? color,
      scale: intensity === "high" ? 1.5 : intensity === "medium" ? 1 : 0.7,
      duration: 0.4 + Math.random() * 0.3,
    };
    
    setBolts(prev => [...prev, bolt]);
    setFlash(true);
    
    setTimeout(() => setFlash(false), 100);
    setTimeout(() => {
      setBolts(prev => prev.filter(b => b.id !== id));
    }, bolt.duration * 1000 + 200);
  }, [color, intensity]);

  useEffect(() => {
    if (trigger) {
      createLightning(50, 30, LIGHTNING_COLORS[trigger as keyof typeof LIGHTNING_COLORS] || color);
    }
  }, [trigger, createLightning, color]);

  useEffect(() => {
    if (!autoTrigger) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        createLightning();
      }
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [autoTrigger, createLightning]);

  return (
    <>
      {/* Screen Flash Overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ backgroundColor: `${color}20` }}
          />
        )}
      </AnimatePresence>

      {/* Lightning Bolts */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {bolts.map((bolt) => (
            <LightningSVG key={bolt.id} bolt={bolt} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function LightningSVG({ bolt }: { bolt: LightningBolt }) {
  // Generate jagged lightning path
  const generatePath = () => {
    const segments = 8;
    let path = `M ${bolt.x} ${bolt.y}`;
    let currentY = bolt.y;
    const segmentHeight = 15;
    
    for (let i = 0; i < segments; i++) {
      const offsetX = (Math.random() - 0.5) * 10;
      currentY += segmentHeight;
      path += ` L ${bolt.x + offsetX} ${currentY}`;
    }
    
    return path;
  };

  const path = generatePath();

  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0.3, 1, 0], scale: bolt.scale }}
      exit={{ opacity: 0 }}
      transition={{ duration: bolt.duration, ease: "easeOut" }}
      className="absolute"
      style={{ 
        left: `${bolt.x}%`, 
        top: `${bolt.y}%`,
        filter: `drop-shadow(0 0 20px ${bolt.color}) drop-shadow(0 0 40px ${bolt.color})`,
      }}
      width="100"
      height="400"
      viewBox="0 0 100 400"
    >
      {/* Main bolt */}
      <motion.path
        d={path}
        fill="none"
        stroke={bolt.color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      />
      
      {/* Secondary branches */}
      {[...Array(3)].map((_, i) => (
        <motion.path
          key={i}
          d={`M ${bolt.x} ${bolt.y + 30 + i * 40} L ${bolt.x + (Math.random() - 0.5) * 30} ${bolt.y + 50 + i * 40}`}
          fill="none"
          stroke={bolt.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.15, delay: i * 0.05 }}
        />
      ))}
      
      {/* Glow effect */}
      <motion.path
        d={path}
        fill="none"
        stroke={bolt.color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

// Pre-styled lightning effects for specific events
export function ConnectLightning({ active }: { active: boolean }) {
  if (!active) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-[#F7931A]/20"
      />
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ 
            opacity: [0, 1, 0.5, 1, 0],
            scaleY: [0, 1, 1, 1, 1],
            x: [0, Math.random() * 20 - 10, 0]
          }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
          className="absolute top-0 w-1 bg-gradient-to-b from-[#F7931A] via-[#FFD700] to-transparent"
          style={{
            left: `${20 + i * 15}%`,
            height: "60%",
            filter: "drop-shadow(0 0 10px #F7931A) drop-shadow(0 0 20px #FFD700)",
            clipPath: "polygon(40% 0%, 60% 0%, 55% 20%, 65% 40%, 45% 60%, 55% 80%, 50% 100%, 40% 100%, 45% 80%, 35% 60%, 55% 40%, 45% 20%)",
          }}
        />
      ))}
    </div>
  );
}

export function TransferLightning({ active, asset = "bitmap" }: { active: boolean; asset?: string }) {
  if (!active) return null;
  
  const colors: Record<string, string> = {
    billy: "#8B5CF6",
    dog: "#DC2626", 
    bitmap: "#F7931A",
    pepe: "#10B981",
  };
  const mainColor = colors[asset] || "#F7931A";
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Electric sweep */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${mainColor}40, ${mainColor}60, ${mainColor}40, transparent)`,
        }}
      />
      
      {/* Lightning strikes */}
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ 
            opacity: [0, 1, 0.3, 0.8, 0],
            scaleY: [0, 1, 1, 1, 1],
          }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="absolute top-0 w-0.5"
          style={{
            left: `${10 + i * 13}%`,
            height: "100%",
            background: `linear-gradient(180deg, transparent, ${mainColor}, ${mainColor}, transparent)`,
            filter: `drop-shadow(0 0 15px ${mainColor}) drop-shadow(0 0 30px ${mainColor})`,
          }}
        />
      ))}
    </div>
  );
}

export function SuccessLightning({ active, asset = "bitmap" }: { active: boolean; asset?: string }) {
  if (!active) return null;
  
  const colors: Record<string, string> = {
    billy: "#8B5CF6",
    dog: "#DC2626", 
    bitmap: "#F7931A",
    pepe: "#10B981",
  };
  const mainColor = colors[asset] || "#F7931A";
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Radial burst */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute w-96 h-96 rounded-full"
        style={{
          background: `radial-gradient(circle, ${mainColor}60 0%, transparent 70%)`,
        }}
      />
      
      {/* Lightning ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 2, opacity: [0, 1, 0] }}
        transition={{ duration: 0.6 }}
        className="absolute w-64 h-64 rounded-full border-4"
        style={{
          borderColor: mainColor,
          boxShadow: `0 0 60px ${mainColor}, inset 0 0 60px ${mainColor}40`,
        }}
      />
      
      {/* Spokes */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 0.4, delay: i * 0.03 }}
          className="absolute w-1 origin-bottom"
          style={{
            height: "50vh",
            background: `linear-gradient(to top, transparent, ${mainColor}, transparent)`,
            transform: `rotate(${i * 30}deg)`,
            filter: `drop-shadow(0 0 20px ${mainColor})`,
          }}
        />
      ))}
    </div>
  );
}

// Sound wave visualizer component
export function SoundWaveVisualizer({ active, color = "#F7931A" }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-center gap-1 h-8">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={active ? {
            height: [8, 24 + Math.random() * 16, 8],
            opacity: [0.5, 1, 0.5],
          } : {
            height: 8,
            opacity: 0.3,
          }}
          transition={{
            duration: 0.4 + i * 0.05,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

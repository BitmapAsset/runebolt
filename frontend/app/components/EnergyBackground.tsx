"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface EnergyBackgroundProps {
  variant?: "default" | "billy" | "dog" | "bitmap" | "pepe";
  intensity?: "low" | "medium" | "high";
}

const THEME_COLORS = {
  default: { primary: "#F7931A", secondary: "#FFD700", accent: "#D67F15" },
  billy: { primary: "#8B5CF6", secondary: "#06B6D4", accent: "#A855F7" },
  dog: { primary: "#DC2626", secondary: "#F9FAFB", accent: "#EF4444" },
  bitmap: { primary: "#F7931A", secondary: "#FFD700", accent: "#F59E0B" },
  pepe: { primary: "#10B981", secondary: "#EC4899", accent: "#34D399" },
};

export function EnergyBackground({ variant = "default", intensity = "medium" }: EnergyBackgroundProps) {
  const colors = THEME_COLORS[variant];
  const opacity = intensity === "high" ? 0.6 : intensity === "medium" ? 0.4 : 0.2;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}15 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 80%, ${colors.secondary}10 0%, transparent 40%),
                       radial-gradient(ellipse at 20% 80%, ${colors.accent}10 0%, transparent 40%)`,
        }}
      />
      
      {/* Animated Tron Grid */}
      <TronGrid color={colors.primary} opacity={opacity * 0.5} />
      
      {/* Floating Particles - reduced count for performance */}
      <FloatingParticles color={colors.primary} count={intensity === "high" ? 12 : intensity === "medium" ? 8 : 5} />
      
      {/* Energy Rivers */}
      <EnergyRivers colors={[colors.primary, colors.secondary]} />
      
      {/* Background Lightning */}
      <BackgroundLightning color={colors.primary} intensity={intensity} />
      
      {/* Gradient Orbs */}
      <GradientOrbs colors={[colors.primary, colors.secondary, colors.accent]} />
    </div>
  );
}

function TronGrid({ color, opacity }: { color: string; opacity: number }) {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(${color}10 1px, transparent 1px),
          linear-gradient(90deg, ${color}10 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        opacity,
      }}
      animate={{
        backgroundPosition: ["0px 0px", "60px 60px"],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function FloatingParticles({ color, count }: { color: string; count: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            backgroundColor: color,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            boxShadow: `0 0 ${Math.random() * 10 + 5}px ${color}`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, (Math.random() - 0.5) * 50, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 5 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

function EnergyRivers({ colors }: { colors: string[] }) {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px w-full"
          style={{
            top: `${30 + i * 25}%`,
            background: `linear-gradient(90deg, transparent, ${colors[i % colors.length]}40, ${colors[i % colors.length]}60, ${colors[i % colors.length]}40, transparent)`,
            filter: "blur(1px)",
          }}
          animate={{
            x: ["-100%", "100%"],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "linear",
            delay: i * 2,
          }}
        />
      ))}
    </>
  );
}

function BackgroundLightning({ color, intensity }: { color: string; intensity: string }) {
  const [bolts, setBolts] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > (intensity === "high" ? 0.5 : intensity === "medium" ? 0.7 : 0.85)) {
        const newBolt = {
          id: Date.now(),
          x: Math.random() * 100,
          delay: Math.random() * 0.5,
        };
        setBolts(prev => [...prev.slice(-3), newBolt]);
        
        setTimeout(() => {
          setBolts(prev => prev.filter(b => b.id !== newBolt.id));
        }, 1000);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [intensity]);

  return (
    <>
      {bolts.map(bolt => (
        <motion.div
          key={bolt.id}
          className="absolute top-0 w-px h-1/3"
          style={{
            left: `${bolt.x}%`,
            background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
            filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})`,
          }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ 
            opacity: [0, 1, 0.5, 1, 0],
            scaleY: [0, 1, 1, 1, 1],
          }}
          transition={{ duration: 0.4, delay: bolt.delay }}
        />
      ))}
    </>
  );
}

function GradientOrbs({ colors }: { colors: string[] }) {
  return (
    <>
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400 + i * 100,
            height: 400 + i * 100,
            backgroundColor: color,
            opacity: 0.1,
            left: `${10 + i * 30}%`,
            top: `${20 + i * 20}%`,
          }}
          animate={{
            x: [0, 50, 0, -50, 0],
            y: [0, -30, 0, 30, 0],
            scale: [1, 1.1, 1, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

// Section-specific backgrounds
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px]"
        style={{ backgroundColor: "#F7931A" }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px]"
        style={{ backgroundColor: "#FFD700" }}
        animate={{
          x: [0, -30, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      
      {/* Lightning strikes */}
      <HeroLightningStrikes />
    </div>
  );
}

function HeroLightningStrikes() {
  const [strikes, setStrikes] = useState<Array<{ id: number; x: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const strike = { id: Date.now(), x: 10 + Math.random() * 80 };
        setStrikes(prev => [...prev, strike]);
        setTimeout(() => {
          setStrikes(prev => prev.filter(s => s.id !== strike.id));
        }, 600);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {strikes.map(strike => (
        <motion.div
          key={strike.id}
          className="absolute top-0 w-0.5"
          style={{
            left: `${strike.x}%`,
            height: "50%",
            background: "linear-gradient(to bottom, #F7931A, #FFD700, transparent)",
            filter: "drop-shadow(0 0 20px #F7931A) drop-shadow(0 0 40px #FFD700)",
            clipPath: "polygon(40% 0%, 60% 0%, 55% 20%, 65% 40%, 45% 60%, 55% 80%, 50% 100%, 40% 100%, 45% 80%, 35% 60%, 55% 40%, 45% 20%)",
          }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ 
            opacity: [0, 1, 0.5, 1, 0],
            scaleY: [0, 1, 1, 1, 1],
          }}
          transition={{ duration: 0.6 }}
        />
      ))}
    </>
  );
}

// Asset-specific section backgrounds
export function AssetSectionBackground({ asset }: { asset: "billy" | "dog" | "bitmap" | "pepe" }) {
  const colors = THEME_COLORS[asset];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] rounded-full blur-[150px]"
        style={{ backgroundColor: colors.primary }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-1/2 -right-1/4 w-[150%] h-[150%] rounded-full blur-[150px]"
        style={{ backgroundColor: colors.secondary }}
        animate={{
          x: [0, -80, 0],
          y: [0, -60, 0],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

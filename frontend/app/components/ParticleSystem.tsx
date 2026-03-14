"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: string;
  x: number;
  y: number;
  type: "spark" | "rune" | "confetti" | "ember" | "block" | "paw" | "moon" | "frog";
  color: string;
  size: number;
  velocity: { x: number; y: number };
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

interface ParticleSystemProps {
  trigger?: string | null;
  origin?: { x: number; y: number };
  type?: "burst" | "confetti" | "ember" | "float";
  asset?: "billy" | "dog" | "bitmap" | "pepe";
  intensity?: "low" | "medium" | "high";
  autoEmit?: boolean;
}

const ASSET_THEMES = {
  billy: {
    colors: ["#8B5CF6", "#06B6D4", "#A855F7", "#22D3EE"],
    particles: ["spark", "paw", "confetti"] as const,
  },
  dog: {
    colors: ["#DC2626", "#F9FAFB", "#EF4444", "#FFFFFF"],
    particles: ["spark", "moon", "confetti"] as const,
  },
  bitmap: {
    colors: ["#F7931A", "#FFD700", "#F59E0B", "#FBBF24"],
    particles: ["spark", "block", "confetti"] as const,
  },
  pepe: {
    colors: ["#10B981", "#EC4899", "#34D399", "#F472B6"],
    particles: ["spark", "frog", "confetti"] as const,
  },
};

const EMOJIS = {
  rune: "ᚱ",
  paw: "🐾",
  moon: "🌙",
  block: "▪",
  frog: "🐸",
  wow: "WOW",
  meow: "MEOW",
};

export function ParticleSystem({
  trigger,
  origin,
  type = "burst",
  asset = "bitmap",
  intensity = "medium",
  autoEmit = false,
}: ParticleSystemProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = ASSET_THEMES[asset];

  const createParticle = useCallback((x: number, y: number, particleType?: string): Particle => {
    const id = Math.random().toString(36).substr(2, 9);
    const sizeBase = intensity === "high" ? 24 : intensity === "medium" ? 16 : 12;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    
    return {
      id,
      x,
      y,
      type: (particleType as Particle["type"]) || theme.particles[Math.floor(Math.random() * theme.particles.length)],
      color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
      size: sizeBase + Math.random() * sizeBase,
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 2,
      },
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      life: 1,
      maxLife: 0,
    };
  }, [theme, intensity]);

  const emitParticles = useCallback((count: number, specificOrigin?: { x: number; y: number }) => {
    const newParticles: Particle[] = [];
    const startX = specificOrigin?.x ?? origin?.x ?? 50;
    const startY = specificOrigin?.y ?? origin?.y ?? 50;
    
    for (let i = 0; i < count; i++) {
      newParticles.push(createParticle(startX, startY));
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  }, [createParticle, origin]);

  useEffect(() => {
    if (trigger) {
      const count = intensity === "high" ? 50 : intensity === "medium" ? 30 : 15;
      emitParticles(count);
    }
  }, [trigger, intensity, emitParticles]);

  useEffect(() => {
    if (!autoEmit) return;
    
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        emitParticles(3, {
          x: 10 + Math.random() * 80,
          y: 90 + Math.random() * 10,
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [autoEmit, emitParticles]);

  useEffect(() => {
    let animationFrame: number;
    
    const updateParticles = () => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.velocity.x * 0.5,
            y: p.y + p.velocity.y * 0.5,
            velocity: {
              x: p.velocity.x * 0.98,
              y: p.velocity.y + 0.15,
            },
            rotation: p.rotation + p.rotationSpeed,
            life: p.life - 0.015,
          }))
          .filter(p => p.life > 0)
      );
      animationFrame = requestAnimationFrame(updateParticles);
    };
    
    animationFrame = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {particles.map(particle => (
          <ParticleElement key={particle.id} particle={particle} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ParticleElement({ particle }: { particle: Particle }) {
  const getParticleContent = () => {
    switch (particle.type) {
      case "rune":
        return (
          <span className="font-bold text-lg" style={{ color: particle.color }}>
            {EMOJIS.rune}
          </span>
        );
      case "paw":
        return (
          <span className="text-2xl" style={{ filter: `drop-shadow(0 0 5px ${particle.color})` }}>
            {EMOJIS.paw}
          </span>
        );
      case "moon":
        return (
          <span className="text-xl" style={{ filter: `drop-shadow(0 0 5px ${particle.color})` }}>
            {EMOJIS.moon}
          </span>
        );
      case "block":
        return (
          <div
            className="rounded-sm"
            style={{
              width: particle.size * 0.7,
              height: particle.size * 0.7,
              backgroundColor: particle.color,
              boxShadow: `0 0 10px ${particle.color}`,
            }}
          />
        );
      case "frog":
        return (
          <span className="text-2xl" style={{ filter: `drop-shadow(0 0 5px ${particle.color})` }}>
            {EMOJIS.frog}
          </span>
        );
      case "confetti":
        return (
          <div
            className="rounded-full"
            style={{
              width: particle.size * 0.5,
              height: particle.size * 0.5,
              backgroundColor: particle.color,
              boxShadow: `0 0 8px ${particle.color}`,
            }}
          />
        );
      case "ember":
        return (
          <div
            className="rounded-full"
            style={{
              width: particle.size * 0.4,
              height: particle.size * 0.4,
              background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
              boxShadow: `0 0 15px ${particle.color}`,
            }}
          />
        );
      default:
        return (
          <div
            className="rounded-full"
            style={{
              width: particle.size * 0.6,
              height: particle.size * 0.6,
              backgroundColor: particle.color,
              boxShadow: `0 0 12px ${particle.color}, 0 0 24px ${particle.color}80`,
            }}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1, scale: 0 }}
      animate={{ 
        opacity: particle.life,
        scale: particle.life > 0.5 ? 1 : particle.life * 2,
      }}
      exit={{ opacity: 0 }}
      className="absolute flex items-center justify-center"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
      }}
    >
      {getParticleContent()}
    </motion.div>
  );
}

// Hover ember effect for cards
export function EmberTrail({ active, color = "#F7931A" }: { active: boolean; color?: string }) {
  const [embers, setEmbers] = useState<Array<{ id: string; x: number; delay: number }>>([]);
  
  useEffect(() => {
    if (!active) {
      setEmbers([]);
      return;
    }
    
    const interval = setInterval(() => {
      setEmbers(prev => [
        ...prev.slice(-8),
        { id: Math.random().toString(36).substr(2, 9), x: Math.random() * 100, delay: Math.random() * 0.3 },
      ]);
    }, 100);
    
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {embers.map(ember => (
          <motion.div
            key={ember.id}
            initial={{ y: "100%", opacity: 0.8, scale: 1 }}
            animate={{ y: "-20%", opacity: 0, scale: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, delay: ember.delay, ease: "easeOut" }}
            className="absolute bottom-0 w-1 h-1 rounded-full"
            style={{
              left: `${ember.x}%`,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Confetti explosion for success
export function ConfettiExplosion({ active, asset = "bitmap" }: { active: boolean; asset?: string }) {
  if (!active) return null;
  
  const colors = ASSET_THEMES[asset as keyof typeof ASSET_THEMES]?.colors || ASSET_THEMES.bitmap.colors;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      {[...Array(60)].map((_, i) => {
        const angle = (i / 60) * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        const color = colors[i % colors.length];
        
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 100,
              scale: 0,
              opacity: 0,
              rotate: Math.random() * 720,
            }}
            transition={{ duration: 1 + Math.random() * 0.5, ease: "easeOut" }}
            className="absolute w-3 h-3"
            style={{
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        );
      })}
    </div>
  );
}

// Spark burst for button clicks
export function SparkBurst({ x, y, color = "#F7931A", active }: { x: number; y: number; color?: string; active: boolean }) {
  if (!active) return null;
  
  return (
    <div className="fixed pointer-events-none z-50" style={{ left: x, top: y }}>
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * 50,
              y: Math.sin(angle) * 50,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

// Floating runes background
export function FloatingRunes({ asset = "bitmap" }: { asset?: string }) {
  const theme = ASSET_THEMES[asset as keyof typeof ASSET_THEMES] || ASSET_THEMES.bitmap;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute font-bold text-4xl"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            color: theme.colors[i % theme.colors.length],
            textShadow: `0 0 20px ${theme.colors[i % theme.colors.length]}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        >
          ᚱ
        </motion.div>
      ))}
    </div>
  );
}

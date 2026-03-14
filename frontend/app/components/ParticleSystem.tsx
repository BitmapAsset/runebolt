"use client";

import { memo, useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  type: "spark" | "rune" | "confetti" | "ember";
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
  },
  dog: {
    colors: ["#DC2626", "#F9FAFB", "#EF4444", "#FFFFFF"],
  },
  bitmap: {
    colors: ["#F7931A", "#FFD700", "#F59E0B", "#FBBF24"],
  },
  pepe: {
    colors: ["#10B981", "#EC4899", "#34D399", "#F472B6"],
  },
};

// Off-screen canvas for particle rendering - NO React state updates
function useParticleCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  trigger: string | null | undefined,
  asset: "billy" | "dog" | "bitmap" | "pepe",
  intensity: "low" | "medium" | "high"
) {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>();
  const theme = ASSET_THEMES[asset];

  const emitParticles = useCallback((count: number, startX?: number, startY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = startX !== undefined ? (startX / 100) * rect.width : rect.width / 2;
    const y = startY !== undefined ? (startY / 100) * rect.height : rect.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      
      particlesRef.current.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 60 + Math.random() * 30,
        size: intensity === "high" ? 6 + Math.random() * 4 : intensity === "medium" ? 4 + Math.random() * 3 : 2 + Math.random() * 2,
        color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        type: Math.random() > 0.7 ? "confetti" : "spark",
      });
    }
  }, [canvasRef, theme, intensity]);

  useEffect(() => {
    if (trigger) {
      const count = intensity === "high" ? 40 : intensity === "medium" ? 25 : 15;
      emitParticles(count, 50, 50);
    }
  }, [trigger, intensity, emitParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    let frameCount = 0;
    const render = () => {
      frameCount++;
      // Render every 2nd frame for 30fps particle animation (performance optimization)
      if (frameCount % 2 === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // gravity
          p.vx *= 0.98; // friction
          p.rotation += p.rotationSpeed;
          p.life -= 1 / p.maxLife;

          if (p.life <= 0) return false;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.life;

          if (p.type === "confetti") {
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * 2;
            ctx.fill();
          }

          ctx.restore();
          return true;
        });
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef]);

  return { emitParticles };
}

// Optimized particle system using Canvas API instead of React DOM
export const ParticleSystem = memo(function ParticleSystem({
  trigger,
  origin,
  type = "burst",
  asset = "bitmap",
  intensity = "medium",
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  useParticleCanvas(canvasRef, isInView ? trigger : null, asset, intensity);

  if (shouldReduceMotion) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: isInView ? 1 : 0, transition: "opacity 0.3s" }}
      />
    </div>
  );
});

// CSS-based confetti - GPU accelerated, no JS animation
export const ConfettiExplosion = memo(function ConfettiExplosion({
  active,
  asset = "bitmap",
}: {
  active: boolean;
  asset?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  if (!active || shouldReduceMotion) return null;

  const colors = ASSET_THEMES[asset as keyof typeof ASSET_THEMES]?.colors || ASSET_THEMES.bitmap.colors;
  const confettiCount = 30; // Reduced from 60 for performance

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
      {Array.from({ length: confettiCount }).map((_, i) => {
        const angle = (i / confettiCount) * Math.PI * 2;
        const distance = 100 + Math.random() * 150;
        const color = colors[i % colors.length];
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance + 100;
        
        return (
          <div
            key={i}
            className="absolute w-2 h-2 will-change-transform"
            style={{
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `confetti-explode 1s ease-out forwards`,
              animationDelay: `${i * 0.01}s`,
              ["--tx" as string]: `${tx}px`,
              ["--ty" as string]: `${ty}px`,
            }}
          />
        );
      })}
    </div>
  );
});

// Optimized floating runes using CSS animations
export const FloatingRunes = memo(function FloatingRunes({
  asset = "bitmap",
}: {
  asset?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();
  const theme = ASSET_THEMES[asset as keyof typeof ASSET_THEMES] || ASSET_THEMES.bitmap;

  if (shouldReduceMotion) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {isInView && Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="absolute font-bold text-3xl will-change-transform"
          style={{
            left: `${10 + (i * 11) % 80}%`,
            top: `${10 + (i * 13) % 70}%`,
            color: theme.colors[i % theme.colors.length],
            textShadow: `0 0 20px ${theme.colors[i % theme.colors.length]}`,
            animation: `float-rune ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        >
          ᚱ
        </span>
      ))}
    </div>
  );
});

// Spark burst using CSS animations
export const SparkBurst = memo(function SparkBurst({
  x,
  y,
  color = "#F7931A",
  active,
}: {
  x: number;
  y: number;
  color?: string;
  active: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (!active || shouldReduceMotion) return null;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left: x, top: y }}
    >
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const tx = Math.cos(angle) * 40;
        const ty = Math.sin(angle) * 40;
        
        return (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full will-change-transform"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
              ["--tx" as string]: `${tx}px`,
              ["--ty" as string]: `${ty}px`,
              animation: `spark-burst 0.4s ease-out forwards`,
              animationDelay: `${i * 0.02}s`,
            }}
          />
        );
      })}
    </div>
  );
});

// Ember trail using CSS
export const EmberTrail = memo(function EmberTrail({
  active,
  color = "#F7931A",
}: {
  active: boolean;
  color?: string;
}) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute bottom-0 w-1 h-1 rounded-full will-change-transform"
          style={{
            left: `${20 + i * 15}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
            animation: `ember-rise 1.5s ease-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
});

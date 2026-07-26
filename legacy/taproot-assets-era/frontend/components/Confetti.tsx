'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#F7931A', '#00CFFF', '#FFD700', '#FF6B8A', '#7C3AED', '#10B981', '#F59E0B', '#EF4444'];
const EMOJIS = ['🐕', '⚡', '🚀', '🎉', '✨', '🔥', '💎', '🌙'];

interface Particle {
  id: number;
  x: number;
  emoji: boolean;
  content: string;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  size: number;
}

export default function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      emoji: Math.random() > 0.6,
      content: Math.random() > 0.6 ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2,
      rotation: Math.random() * 720 - 360,
      size: Math.random() * 8 + 4,
    }));

    setParticles(newParticles);

    const timeout = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timeout);
  }, [active, duration]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                x: `${p.x}vw`,
                y: '-5vh',
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '105vh',
                rotate: p.rotation,
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn',
              }}
              className="absolute"
              style={{ left: 0, top: 0 }}
            >
              {p.emoji ? (
                <span style={{ fontSize: p.size * 2 }}>{p.content}</span>
              ) : (
                <div
                  style={{
                    width: p.size,
                    height: p.size * (Math.random() > 0.5 ? 1 : 2.5),
                    backgroundColor: p.color,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

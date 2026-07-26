'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ShibaInuProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  mood?: 'happy' | 'excited' | 'cool' | 'wink' | 'love';
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-[8px]',
  md: 'w-16 h-16 text-base',
  lg: 'w-24 h-24 text-lg',
  xl: 'w-32 h-32 text-xl',
  hero: 'w-48 h-48 text-3xl',
};

const moodEmoji = {
  happy: '(^ o ^)',
  excited: '(>w<)',
  cool: '( -_-)',
  wink: '(^ _ ~)',
  love: '(^ u ^)',
};

export default function ShibaInu({ size = 'md', mood = 'happy', animate = true, className }: ShibaInuProps) {
  return (
    <motion.div
      initial={animate ? { scale: 0, rotate: -10 } : undefined}
      animate={animate ? { scale: 1, rotate: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className={clsx('relative flex items-center justify-center', sizeMap[size], className)}
    >
      <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
        {/* Body circle */}
        <circle cx="60" cy="65" r="42" fill="#E8A838" />
        <circle cx="60" cy="65" r="38" fill="#F5C24C" />

        {/* Face lighter area */}
        <ellipse cx="60" cy="72" rx="28" ry="26" fill="#FFF3D4" />

        {/* Left ear */}
        <path d="M25 35 L38 58 L18 55 Z" fill="#E8A838" />
        <path d="M27 38 L37 55 L21 53 Z" fill="#F5C24C" />

        {/* Right ear */}
        <path d="M95 35 L82 58 L102 55 Z" fill="#E8A838" />
        <path d="M93 38 L83 55 L99 53 Z" fill="#F5C24C" />

        {/* Eyes */}
        {mood === 'wink' ? (
          <>
            <circle cx="45" cy="60" r="4.5" fill="#2D1B00" />
            <circle cx="45" cy="58.5" r="1.5" fill="white" />
            <path d="M70 58 Q75 62 80 58" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : mood === 'excited' ? (
          <>
            <path d="M40 56 L45 62 L50 56" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M70 56 L75 62 L80 56" stroke="#2D1B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        ) : mood === 'love' ? (
          <>
            <path d="M40 57 C40 54 43 52 45 55 C47 52 50 54 50 57 C50 60 45 63 45 63 C45 63 40 60 40 57Z" fill="#FF6B8A" />
            <path d="M70 57 C70 54 73 52 75 55 C77 52 80 54 80 57 C80 60 75 63 75 63 C75 63 70 60 70 57Z" fill="#FF6B8A" />
          </>
        ) : mood === 'cool' ? (
          <>
            <rect x="36" y="55" width="18" height="8" rx="4" fill="#1a1a2e" />
            <rect x="66" y="55" width="18" height="8" rx="4" fill="#1a1a2e" />
            <rect x="54" y="57" width="12" height="3" fill="#1a1a2e" />
          </>
        ) : (
          <>
            <circle cx="45" cy="60" r="4.5" fill="#2D1B00" />
            <circle cx="45" cy="58.5" r="1.5" fill="white" />
            <circle cx="75" cy="60" r="4.5" fill="#2D1B00" />
            <circle cx="75" cy="58.5" r="1.5" fill="white" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="60" cy="70" rx="5" ry="3.5" fill="#2D1B00" />
        <ellipse cx="59" cy="69" rx="1.5" ry="1" fill="#5C3D00" />

        {/* Mouth */}
        {mood === 'excited' || mood === 'happy' ? (
          <path d="M50 76 Q55 82 60 78 Q65 82 70 76" stroke="#2D1B00" strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M52 76 Q60 80 68 76" stroke="#2D1B00" strokeWidth="2" strokeLinecap="round" fill="none" />
        )}

        {/* Blush */}
        <ellipse cx="36" cy="72" rx="6" ry="3.5" fill="#FFB7B7" opacity="0.5" />
        <ellipse cx="84" cy="72" rx="6" ry="3.5" fill="#FFB7B7" opacity="0.5" />

        {/* Tongue (excited/happy) */}
        {(mood === 'excited' || mood === 'happy') && (
          <ellipse cx="60" cy="82" rx="4" ry="5" fill="#FF8A9E" />
        )}
      </svg>

      {/* Sparkles around the shiba */}
      {animate && (mood === 'excited' || mood === 'love') && (
        <>
          <motion.span
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            className="absolute -top-1 -right-1 text-yellow-400"
            style={{ fontSize: '0.7em' }}
          >
            ✨
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="absolute -top-2 left-0 text-yellow-400"
            style={{ fontSize: '0.6em' }}
          >
            ✨
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], y: [0, -5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            className="absolute top-0 -left-2 text-yellow-400"
            style={{ fontSize: '0.5em' }}
          >
            ⚡
          </motion.span>
        </>
      )}
    </motion.div>
  );
}

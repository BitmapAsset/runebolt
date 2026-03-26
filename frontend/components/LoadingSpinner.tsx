'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const sizeMap = {
  sm: { container: 'w-6 h-6', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-16 h-16', text: 'text-base' },
};

const funMessages = [
  'Fetching... good boy! 🐾',
  'Sniffing the blockchain... 🐕',
  'Wagging intensifies... 🐕‍🦺',
  'Much load. Very patience. 🌀',
  'Almost there, hooman! 🐶',
];

export default function LoadingSpinner({ size = 'md', className, message }: LoadingSpinnerProps) {
  const s = sizeMap[size];
  const displayMessage = message || funMessages[Math.floor(Math.random() * funMessages.length)];

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        className={clsx(
          s.container,
          'relative flex items-center justify-center'
        )}
      >
        <div className="absolute inset-0 rounded-full border-2 border-dark-600" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-bitcoin" />
        <span className="text-xs">🐕</span>
      </motion.div>
      <p className={clsx(s.text, 'text-gray-400 animate-pulse')}>{displayMessage}</p>
    </div>
  );
}

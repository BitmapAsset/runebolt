'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className, hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={clsx(
        'rounded-2xl border border-dark-700 bg-dark-800/80 backdrop-blur-xl',
        'shadow-lg shadow-black/20',
        hover && 'cursor-pointer hover:border-dark-600 hover:shadow-bitcoin/5',
        'transition-colors duration-300',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

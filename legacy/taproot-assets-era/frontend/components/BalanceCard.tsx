'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDogAmount, formatUsd } from '@/lib/format';
import { DEMO_USD_RATE } from '@/lib/constants';

interface BalanceCardProps {
  balance: number;
  usdRate?: number;
}

const funComparisons = [
  { threshold: 100000, text: 'Enough to buy a virtual dog park! 🏞️' },
  { threshold: 50000, text: 'That\'s 50,000 virtual treats! 🦴' },
  { threshold: 10000, text: 'You\'re a certified good boi 🏆' },
  { threshold: 1000, text: 'Stack those DOG, king 👑' },
  { threshold: 0, text: 'Every DOG journey starts small 🐾' },
];

export default function BalanceCard({ balance, usdRate = DEMO_USD_RATE }: BalanceCardProps) {
  const [displayBalance, setDisplayBalance] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = balance / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(balance, increment * step);
      setDisplayBalance(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayBalance(balance);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [balance]);

  const usdValue = displayBalance * usdRate;
  const comparison = useMemo(
    () => funComparisons.find((c) => balance >= c.threshold) || funComparisons[funComparisons.length - 1],
    [balance]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-800/80 p-8 backdrop-blur-xl"
    >
      {/* Gradient border effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-bitcoin/20 via-transparent to-cyan/20" />
      </div>

      {/* Background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-bitcoin/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-cyan/5 blur-3xl" />

      {/* Floating emoji */}
      <motion.span
        animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute right-6 top-6 text-3xl"
      >
        🐕
      </motion.span>

      <div className="relative">
        <p className="text-sm font-medium text-gray-400">Your DOG Stash 💰</p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-4xl font-bold tracking-tight text-white md:text-5xl">
            {formatDogAmount(displayBalance)}
          </span>
          <span className="text-lg font-medium text-bitcoin">DOG</span>
        </div>
        <p className="mt-2 font-mono text-sm text-gray-500">
          {formatUsd(usdValue)} USD
        </p>
        {/* Fun comparison */}
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-3 text-xs text-cyan/70"
        >
          {comparison.text}
        </motion.p>
      </div>
    </motion.div>
  );
}

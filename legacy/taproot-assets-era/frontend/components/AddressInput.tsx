'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Bitcoin, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onResolve?: (type: 'runebolt' | 'bitcoin' | null) => void;
  className?: string;
}

type AddressType = 'runebolt' | 'bitcoin' | 'invalid' | null;

export default function AddressInput({ value, onChange, onResolve, className }: AddressInputProps) {
  const [addressType, setAddressType] = useState<AddressType>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!value) {
        setAddressType(null);
        onResolve?.(null);
        return;
      }

      if (value.includes('@')) {
        setAddressType('runebolt');
        onResolve?.('runebolt');
      } else if (value.startsWith('bc1') || value.startsWith('tb1')) {
        setAddressType('bitcoin');
        onResolve?.('bitcoin');
      } else if (value.length > 5) {
        setAddressType('invalid');
        onResolve?.(null);
      } else {
        setAddressType(null);
        onResolve?.(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, onResolve]);

  return (
    <div className={clsx('relative', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="username@runebolt.io or bc1q..."
        className={clsx(
          'w-full rounded-xl border bg-dark-800 px-4 py-3 pr-32 font-mono text-sm text-white',
          'placeholder-gray-500 outline-none transition-colors',
          addressType === 'invalid'
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-dark-700 focus:border-bitcoin/50'
        )}
      />
      <AnimatePresence mode="wait">
        {addressType && addressType !== 'invalid' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={clsx(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              addressType === 'runebolt'
                ? 'bg-cyan/10 text-cyan border border-cyan/20'
                : 'bg-bitcoin/10 text-bitcoin border border-bitcoin/20'
            )}
          >
            {addressType === 'runebolt' ? (
              <>
                <AtSign size={12} />
                RuneBolt User
              </>
            ) : (
              <>
                <Bitcoin size={12} />
                Bitcoin Address
              </>
            )}
          </motion.div>
        )}
        {addressType === 'invalid' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400"
          >
            <AlertCircle size={12} />
            Invalid
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

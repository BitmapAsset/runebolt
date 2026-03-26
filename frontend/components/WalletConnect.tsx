'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Copy, LogOut, Check, ExternalLink } from 'lucide-react';
import { useUnisat } from '@/hooks/useUnisat';
import { formatAddress } from '@/lib/format';
import clsx from 'clsx';

interface WalletConnectProps {
  className?: string;
  compact?: boolean;
}

export default function WalletConnect({ className, compact = false }: WalletConnectProps) {
  const { connected, address, loading, installed, connect, disconnect } = useUnisat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={connect}
        disabled={loading}
        className={clsx(
          'relative flex items-center gap-2 rounded-xl font-medium transition-all',
          'bg-gradient-to-r from-bitcoin to-orange-600',
          'px-4 py-2.5 text-sm text-white shadow-lg shadow-bitcoin/20',
          'hover:shadow-bitcoin/40 disabled:opacity-50',
          className
        )}
      >
        <Wallet size={16} />
        {loading ? 'Connecting...' : installed === false ? 'Install Unisat' : 'Connect Wallet'}
      </motion.button>
    );
  }

  return (
    <div className={clsx('relative', className)} ref={menuRef}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setMenuOpen(!menuOpen)}
        className={clsx(
          'flex items-center gap-2 rounded-xl border border-dark-700 bg-dark-800 px-4 py-2.5',
          'text-sm text-white transition-colors hover:border-dark-600'
        )}
      >
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-mono text-xs">{formatAddress(address || '', compact ? 4 : 6)}</span>
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-dark-700 bg-dark-800 shadow-xl shadow-black/40"
          >
            <div className="border-b border-dark-700 px-4 py-3">
              <p className="text-xs text-gray-400">Connected</p>
              <p className="mt-0.5 font-mono text-xs text-white">{formatAddress(address || '', 8)}</p>
            </div>
            <div className="p-1">
              <button
                onClick={copyAddress}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-dark-700 hover:text-white"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>
              <a
                href={`https://mempool.space/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-dark-700 hover:text-white"
              >
                <ExternalLink size={14} />
                View on Explorer
              </a>
              <button
                onClick={() => {
                  disconnect();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-dark-700 hover:text-red-300"
              >
                <LogOut size={14} />
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

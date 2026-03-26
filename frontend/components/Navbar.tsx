'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bitcoin to-orange-600 transition-shadow group-hover:shadow-lg group-hover:shadow-bitcoin/20">
            <Zap size={18} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-bitcoin to-cyan bg-clip-text text-xl font-bold text-transparent">
            RuneBolt
          </span>
          <motion.span
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
            className="text-lg origin-[70%_80%]"
          >
            🐕
          </motion.span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            How It Works
          </Link>
          <a
            href="https://github.com/runebolt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            GitHub
          </a>
          <Link href="/app">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-bitcoin/20 transition-shadow hover:shadow-bitcoin/40"
            >
              Launch App 🚀
            </motion.button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-gray-400 hover:text-white md:hidden"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-dark-700/50 bg-dark-900/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              <Link
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-dark-800 hover:text-white"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-dark-800 hover:text-white"
              >
                How It Works
              </Link>
              <a
                href="https://github.com/runebolt"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-dark-800 hover:text-white"
              >
                GitHub
              </a>
              <Link
                href="/app"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-xl bg-gradient-to-r from-bitcoin to-orange-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Launch App 🚀
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

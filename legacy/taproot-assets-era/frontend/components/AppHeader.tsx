'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';
import WalletConnect from './WalletConnect';
import clsx from 'clsx';

const navItems = [
  { href: '/app', label: 'Dashboard', emoji: '🏠' },
  { href: '/app/send', label: 'Send', emoji: '🚀' },
  { href: '/app/receive', label: 'Receive', emoji: '🎁' },
  { href: '/app/channels', label: 'Channels', emoji: '⚡' },
  { href: '/app/history', label: 'History', emoji: '📜' },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-dark-700/50 bg-dark-900/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-bitcoin to-orange-600">
            <Zap size={14} className="text-white" />
          </div>
          <span className="bg-gradient-to-r from-bitcoin to-cyan bg-clip-text text-lg font-bold text-transparent">
            RuneBolt
          </span>
          <span className="text-sm">🐕</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-dark-700 text-white'
                    : 'text-gray-400 hover:bg-dark-800 hover:text-white'
                )}
              >
                <span className="text-xs">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-dark-700 bg-dark-800 px-3 py-1 sm:flex">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-400">Testnet</span>
          </div>
          <WalletConnect compact />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-dark-700/50 px-2 py-1 md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-dark-700 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <span>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

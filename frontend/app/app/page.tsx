'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import BalanceCard from '@/components/BalanceCard';
import TransferList from '@/components/TransferList';
import ChannelCard from '@/components/ChannelCard';
import SendModal from '@/components/SendModal';
import GlassCard from '@/components/GlassCard';
import ShibaInu from '@/components/ShibaInu';
import { useUnisat } from '@/hooks/useUnisat';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { Channel, Transfer, FeeStatus } from '@/lib/types';
import { demoUser, demoTransfers, demoChannels } from '@/lib/demo-data';

const quickActions = [
  {
    label: 'Send DOG',
    sublabel: 'Yeet some DOG',
    href: '/runebolt/app/send',
    emoji: '🚀',
  },
  {
    label: 'Receive',
    sublabel: 'Gimme DOG',
    href: '/runebolt/app/receive',
    emoji: '🎁',
  },
  {
    label: 'Open Channel',
    sublabel: 'More power',
    href: '/runebolt/app/channels',
    emoji: '⚡',
  },
  {
    label: 'Close Channel',
    sublabel: 'Cash out',
    href: '/runebolt/app/channels',
    emoji: '💰',
  },
];

export default function DashboardPage() {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const { connected, publicKey, signMessage } = useUnisat();
  const { authenticate, getChannels, getTransfers, getFeeStatus, sendTransfer } = useApi();

  const [channels, setChannels] = useState<Channel[]>(demoChannels);
  const [transfers, setTransfers] = useState<Transfer[]>(demoTransfers);
  const [feeStatus, setFeeStatus] = useState<FeeStatus | null>(null);
  const [balance, setBalance] = useState(demoUser.balance);
  const [username, setUsername] = useState(demoUser.username || 'anon');
  const [isLive, setIsLive] = useState(false);

  // Authenticate when wallet connects
  useEffect(() => {
    if (!connected || !publicKey) return;
    if (api.isAuthenticated()) {
      loadData();
      return;
    }
    (async () => {
      const result = await authenticate(publicKey, signMessage);
      if (result) {
        if (result.user.username) setUsername(result.user.username);
        loadData();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  const loadData = async () => {
    const [ch, tx, fee] = await Promise.all([
      getChannels(),
      getTransfers(10),
      publicKey ? getFeeStatus(publicKey) : null,
    ]);
    if (ch) { setChannels(ch); setIsLive(true); }
    if (tx) { setTransfers(tx.transfers); setIsLive(true); }
    if (fee) setFeeStatus(fee);

    // Compute balance from channel local balances
    if (ch && ch.length > 0) {
      const total = ch.reduce((sum, c) => sum + c.localBalance, 0);
      setBalance(total);
    }
  };

  const handleSend = async (recipient: string, amount: number) => {
    const result = await sendTransfer(recipient, amount);
    if (result) {
      loadData();
    }
  };

  const openCount = channels.filter((c) => c.state === 'OPEN').length;

  return (
    <div className="space-y-8">
      {/* Welcome + Balance */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white"
          >
            Gm, @{username}! 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 mt-1"
          >
            Let&apos;s get that DOG moving 🐕
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          <ShibaInu size="sm" mood="wink" animate={false} />
        </motion.div>
      </div>

      <BalanceCard balance={balance} />

      {/* Connection Health */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isLive ? 'bg-emerald-500/10' : 'bg-yellow-500/10'}`}>
              {isLive ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-yellow-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {isLive ? 'Connection: Strong 💪' : 'Demo Mode 🎮'}
              </p>
              <p className="text-xs text-gray-500">
                {isLive
                  ? `${openCount} channel${openCount !== 1 ? 's' : ''} active • Ready to send`
                  : 'Connect wallet for live data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {feeStatus && (
              <span className="mr-3 text-xs text-cyan font-medium">
                {feeStatus.freeRemaining} free txs left
              </span>
            )}
            <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
            <span className={`text-xs font-medium ${isLive ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {isLive ? 'Online' : 'Offline'}
            </span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action, i) => {
          const isFirstAction = i === 0;
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              {isFirstAction ? (
                <GlassCard
                  hover
                  onClick={() => setSendModalOpen(true)}
                  className="flex flex-col items-center gap-2 p-5"
                >
                  <motion.span
                    whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                    className="text-2xl"
                  >
                    {action.emoji}
                  </motion.span>
                  <span className="text-sm font-semibold text-white">{action.label}</span>
                  <span className="text-[10px] text-gray-500">{action.sublabel}</span>
                </GlassCard>
              ) : (
                <Link href={action.href}>
                  <GlassCard hover className="flex flex-col items-center gap-2 p-5">
                    <motion.span
                      whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                      className="text-2xl"
                    >
                      {action.emoji}
                    </motion.span>
                    <span className="text-sm font-semibold text-white">{action.label}</span>
                    <span className="text-[10px] text-gray-500">{action.sublabel}</span>
                  </GlassCard>
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Transfers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Activity 📋</h2>
              <Link
                href="/runebolt/app/history"
                className="text-sm font-medium text-bitcoin transition-colors hover:text-orange-400"
              >
                View All
              </Link>
            </div>
            <TransferList transfers={transfers} maxItems={5} />
          </GlassCard>
        </motion.div>

        {/* Active Channels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Payment Channels ⚡</h2>
            <Link
              href="/runebolt/app/channels"
              className="text-sm font-medium text-bitcoin transition-colors hover:text-orange-400"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-4">
            {channels.map((channel, i) => (
              <ChannelCard key={channel.id} channel={channel} index={i} />
            ))}
          </div>
        </motion.div>
      </div>

      <SendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSend={handleSend}
        maxBalance={balance}
      />
    </div>
  );
}
